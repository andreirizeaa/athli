/**
 * Supabase Edge Function: checkin-reviewed-push-notification
 *
 * Sends a push notification to the client when a coach reviews their check-in.
 * Triggered by a database webhook on UPDATE to client_checkin_logs
 * when status changes to 'reviewed'.
 *
 * Title: "<check-in name> was reviewed"
 * Body: the coach's comment
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
    client_id: string
    coach_id: string
    assignment_id: string
    status: string
    coach_comment: string | null
    reviewed_at: string | null
  }
  schema: string
  old_record: null | {
    status: string
    [key: string]: any
  }
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

    const payload: WebhookPayload = await req.json()

    // Only process UPDATE events where status changed to 'reviewed'
    if (payload.type !== 'UPDATE') {
      return jsonResponse({ success: true, message: 'Skipped: not an UPDATE event' })
    }

    const record = payload.record
    const oldRecord = payload.old_record

    if (record.status !== 'reviewed' || oldRecord?.status === 'reviewed') {
      return jsonResponse({ success: true, message: 'Skipped: not a review status change' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get check-in name and client push tokens in parallel
    const [checkInResult, tokensResult] = await Promise.all([
      supabase
        .from('client_checkins')
        .select('name')
        .eq('id', record.assignment_id)
        .single(),
      supabase
        .from('client_push_tokens')
        .select('expo_push_token')
        .eq('client_id', record.client_id),
    ])

    const checkInName = checkInResult.data?.name || 'Check-in'

    if (tokensResult.error || !tokensResult.data || tokensResult.data.length === 0) {
      console.log(`No push tokens for client ${record.client_id}`)
      return jsonResponse({ success: true, message: 'No push tokens' })
    }

    const uniqueTokens = [...new Set(tokensResult.data.map((t: { expo_push_token: string }) => t.expo_push_token))]

    const title = `${checkInName} was reviewed`
    const body = record.coach_comment || 'Your coach reviewed your check-in'

    const messages = uniqueTokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: {
        type: 'checkin_reviewed',
        coach_id: record.coach_id,
        checkin_id: record.assignment_id,
        log_id: record.id,
      },
    }))

    console.log(`Sending ${messages.length} push notification(s) to client ${record.client_id}`)

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expoAccessToken}`,
      },
      body: JSON.stringify(messages),
    })

    const expoResult = await expoResponse.json()

    if (!expoResponse.ok) {
      throw new Error(`Expo push failed: ${JSON.stringify(expoResult)}`)
    }

    console.log('Expo push response:', JSON.stringify(expoResult))

    return jsonResponse({
      success: true,
      message: `Sent ${messages.length} push notification(s)`,
      expo_response: expoResult,
    })
  } catch (error) {
    console.error('checkin-reviewed-push-notification failed:', error)
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}
