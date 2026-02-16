/**
 * Supabase Edge Function: referral-push-notification
 *
 * Sends push notifications to the referring coach when a referral
 * event occurs (trial started, converted, trial ended, trial cancelled).
 *
 * Called by the notify_referral_event() trigger via pg_net on INSERT
 * to coach_referral_events.
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - EXPO_ACCESS_TOKEN
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  referrer_coach_id: string
  event_type: 'trial_started' | 'trial_ended' | 'trial_cancelled' | 'converted'
  referred_coach_name: string
  credit_cents: number
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

    const { referrer_coach_id, event_type, referred_coach_name, credit_cents }: RequestBody = await req.json()

    if (!referrer_coach_id || !event_type || !referred_coach_name) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch push tokens for the referring coach
    const { data: tokens, error: tokenError } = await supabase
      .from('coach_push_tokens')
      .select('expo_push_token')
      .eq('coach_id', referrer_coach_id)

    if (tokenError) {
      throw new Error(`Failed to fetch push tokens: ${tokenError.message}`)
    }

    if (!tokens || tokens.length === 0) {
      console.log(`No push tokens for coach ${referrer_coach_id}`)
      return jsonResponse({ success: true, message: 'No push tokens registered' })
    }

    const firstName = referred_coach_name.split(' ')[0]
    const { title, body } = buildNotification(event_type, firstName, credit_cents)

    console.log(`Sending referral notification to coach ${referrer_coach_id}: title="${title}" body="${body}"`)

    const messages = tokens.map((token: { expo_push_token: string }) => ({
      to: token.expo_push_token,
      sound: 'default',
      title,
      body,
      data: {
        type: 'referral',
        event_type,
      },
    }))

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
    console.error('referral-push-notification failed:', error)
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

function buildNotification(
  eventType: string,
  firstName: string,
  creditCents: number
): { title: string; body: string } {
  const creditDollars = Math.round(creditCents / 100)

  switch (eventType) {
    case 'trial_started':
      return {
        title: 'Referral Started a Trial 🎉',
        body: `${firstName} just started their free trial`,
      }
    case 'converted':
      return {
        title: 'Referral Converted 🎉',
        body: `${firstName} subscribed. You've earned $${creditDollars}!`,
      }
    case 'trial_ended':
      return {
        title: "Referral's Trial Ended ⏰",
        body: `${firstName}'s free trial has ended. Encourage them to upgrade for the full experience!`,
      }
    case 'trial_cancelled':
      return {
        title: 'Referral Cancelled Their Trial 😔',
        body: `${firstName} cancelled their trial`,
      }
    default:
      return {
        title: 'Referral Update',
        body: `${firstName}'s referral status changed`,
      }
  }
}

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}
