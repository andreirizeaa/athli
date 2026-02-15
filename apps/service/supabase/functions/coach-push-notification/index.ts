/**
 * Supabase Edge Function: push-notification
 *
 * Sends push notifications to coaches when a new notification is inserted
 * into the coach_notifications table.
 *
 * This function is triggered by a database webhook on INSERT to coach_notifications.
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - EXPO_ACCESS_TOKEN
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: {
    id: string
    coach_id: string
    client_id: string
    notification_type: string
    title: string
    description: string | null
    metadata: Record<string, any>
    read_at: string | null
    created_at: string
  }
  schema: string
  old_record: null | Record<string, any>
}

interface PushToken {
  expo_push_token: string
}

interface NotificationPreference {
  push_enabled: boolean
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    if (!expoAccessToken) {
      throw new Error('EXPO_ACCESS_TOKEN not configured')
    }

    // Parse the webhook payload
    const payload: WebhookPayload = await req.json()
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2))

    // Only process INSERT events
    if (payload.type !== 'INSERT') {
      return new Response(
        JSON.stringify({ success: true, message: 'Skipped: not an INSERT event' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const notification = payload.record
    const { coach_id, notification_type, title, description } = notification

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if push notifications are enabled for this notification type
    const { data: preferences, error: prefError } = await supabase
      .from('coach_notification_preferences')
      .select('push_enabled')
      .eq('coach_id', coach_id)
      .eq('notification_type', notification_type)
      .single()

    if (prefError && prefError.code !== 'PGRST116') {
      console.error('Error fetching preferences:', prefError)
    }

    // If no preference exists or push is disabled, skip
    if (!preferences || !preferences.push_enabled) {
      console.log(`Push disabled for coach ${coach_id}, notification type ${notification_type}`)
      return new Response(
        JSON.stringify({ success: true, message: 'Push notifications disabled for this type' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Get push tokens and client name in parallel
    const [tokensResult, clientResult] = await Promise.all([
      supabase
        .from('coach_push_tokens')
        .select('expo_push_token')
        .eq('coach_id', coach_id),
      supabase
        .from('user_profiles')
        .select('name')
        .eq('id', notification.client_id)
        .eq('user_type', 'client')
        .single(),
    ])

    if (tokensResult.error) {
      throw new Error(`Failed to fetch push tokens: ${tokensResult.error.message}`)
    }

    // Deduplicate tokens (same device can be registered multiple times)
    const uniqueTokens = [...new Set((tokensResult.data || []).map((t: PushToken) => t.expo_push_token))]
    if (uniqueTokens.length === 0) {
      console.log(`No push tokens found for coach ${coach_id}`)
      return new Response(
        JSON.stringify({ success: true, message: 'No push tokens registered' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Build push title and body
    const clientName = clientResult.data?.name || null
    const firstName = clientName?.split(' ')[0] || 'Client'
    const itemName = notification.metadata?.name || notification.metadata?.workout_name
    const value = notification.metadata?.value

    // Map notification_type to a verb for the push title
    const actionVerbs: Record<string, string> = {
      habit_logged: 'logged',
      metric_logged: 'logged',
      workout_completed: 'completed',
      checkin_completed: 'completed',
      questionnaire_completed: 'completed',
      photo_uploaded: 'uploaded a progress photo',
      client_connected: 'connected to the app',
      goal_added: 'added a goal',
      goal_edited: 'updated a goal',
      goal_deleted: 'removed a goal',
      injury_added: 'added an injury',
      injury_edited: 'updated an injury',
      injury_deleted: 'removed an injury',
      workout_missed: 'missed a workout',
      habit_missed: 'missed a habit log',
      metric_missed: 'missed a metric log',
      checkin_missed: 'missed a check-in',
    }

    const verb = actionVerbs[notification_type] || 'update'

    // Title: "John logged Water Intake" or "John connected to the app"
    const pushTitle = itemName
      ? `${firstName} ${verb} ${itemName}`
      : `${firstName} ${verb}`

    // Body: show value if present, otherwise use the description
    const pushBody = value != null
      ? `Value: ${value}`
      : (description || title)

    console.log(`Push: title="${pushTitle}" body="${pushBody}" tokens=${uniqueTokens.length}`)

    // Send push notifications to all registered devices
    const messages = uniqueTokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title: pushTitle,
      body: pushBody,
      data: {
        notification_id: notification.id,
        notification_type: notification_type,
        client_id: notification.client_id,
        metadata: notification.metadata,
      },
    }))

    console.log(`Sending ${messages.length} push notification(s) to coach ${coach_id}`)

    // Send to Expo Push API
    const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expoAccessToken}`,
      },
      body: JSON.stringify(messages),
    })

    const expoPushResult = await expoPushResponse.json()
    console.log('Expo push response:', JSON.stringify(expoPushResult, null, 2))

    if (!expoPushResponse.ok) {
      throw new Error(`Expo push failed: ${JSON.stringify(expoPushResult)}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${messages.length} push notification(s)`,
        expo_response: expoPushResult,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('push-notification failed:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
