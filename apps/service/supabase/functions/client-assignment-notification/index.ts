/**
 * Supabase Edge Function: client-assignment-notification
 *
 * Sends batched push notifications to clients when a coach assigns new
 * items (habits, metrics, files, check-ins, questionnaires).
 *
 * Called by the notify_client_assignment() trigger via pg_net.
 * Uses a 5-second debounce so rapid-fire assignments (e.g. 3 habits at once)
 * collapse into a single notification per (client, coach) pair.
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - EXPO_ACCESS_TOKEN
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  client_id: string
  coach_id: string
}

interface ClaimedEntry {
  id: string
  item_type: string
  item_name: string
  schedule_config: { frequency?: string } | null
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

    const { client_id, coach_id }: RequestBody = await req.json()

    if (!client_id || !coach_id) {
      return jsonResponse({ success: false, error: 'client_id and coach_id required' }, 400)
    }

    // Debounce — wait 5 seconds so concurrent assignments accumulate in the queue
    await new Promise(resolve => setTimeout(resolve, 5000))

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Atomically claim all unprocessed entries for this (client, coach) pair
    const { data: entries, error: claimError } = await supabase
      .rpc('claim_assignment_notifications', {
        p_client_id: client_id,
        p_coach_id: coach_id,
      })

    if (claimError) {
      throw new Error(`Failed to claim notifications: ${claimError.message}`)
    }

    const claimed = (entries || []) as ClaimedEntry[]

    // Another invocation already processed these entries
    if (claimed.length === 0) {
      console.log(`No unprocessed entries for client=${client_id} coach=${coach_id}`)
      return jsonResponse({ success: true, message: 'No entries to process (already handled)' })
    }

    console.log(`Claimed ${claimed.length} entries for client=${client_id} coach=${coach_id}`)

    // Fetch coach name and client push tokens in parallel
    const [coachResult, tokensResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('name')
        .eq('id', coach_id)
        .eq('user_type', 'coach')
        .single(),
      supabase
        .from('client_push_tokens')
        .select('expo_push_token')
        .eq('client_id', client_id),
    ])

    if (tokensResult.error) {
      throw new Error(`Failed to fetch push tokens: ${tokensResult.error.message}`)
    }

    const tokens = tokensResult.data
    if (!tokens || tokens.length === 0) {
      console.log(`No push tokens for client ${client_id}`)
      return jsonResponse({ success: true, message: 'No push tokens registered' })
    }

    const coachFullName = coachResult.data?.name || 'Your coach'
    const coachName = coachFullName.split(' ')[0]
    const { title, body } = buildNotification(coachName, claimed)

    console.log(`Sending notification: title="${title}" body="${body}"`)

    // Send push notification to all client devices
    const messages = tokens.map((token: { expo_push_token: string }) => ({
      to: token.expo_push_token,
      sound: 'default',
      title,
      body,
      data: {
        type: 'assignment',
        coach_id,
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
      items_count: claimed.length,
      expo_response: expoResult,
    })
  } catch (error) {
    console.error('client-assignment-notification failed:', error)
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

/**
 * Builds the notification title and body from claimed queue entries.
 *
 * Title is always the item type. Body starts with coach first name + "assigned":
 *
 * Single habit    → title: "New Habit"        body: "John assigned Morning Routine"
 * Single check-in → title: "New Check-in"     body: "John assigned a check-in every week"
 * Multiple same   → title: "New Habits"       body: "John assigned Habit A, Habit B, Habit C"
 * Multiple mixed  → title: "New Items"         body: "John assigned Habit A, File B, Metric C"
 */
function buildNotification(coachName: string, entries: ClaimedEntry[]): { title: string; body: string } {
  if (entries.length === 1) {
    const entry = entries[0]
    if (entry.item_type === 'check_in') {
      return {
        title: 'New Check-in for You!',
        body: `${coachName} assigned a check-in ${formatFrequency(entry.schedule_config).toLowerCase()}`,
      }
    }
    const label = typeLabel(entry.item_type)
    return {
      title: `New ${capitalize(label)} for You!`,
      body: `${coachName} assigned ${stripExtension(entry.item_name)}`,
    }
  }

  // Multiple entries
  const count = numberToWord(entries.length)
  const names = entries.map(e => stripExtension(e.item_name)).join(', ')
  const types = new Set(entries.map(e => e.item_type))
  if (types.size === 1) {
    const label = typeLabelPlural(entries[0].item_type)
    return {
      title: `${capitalize(count)} New ${capitalize(label)} for You!`,
      body: `${coachName} assigned ${names}`,
    }
  }

  return {
    title: `${capitalize(count)} New Items for You!`,
    body: `${coachName} assigned ${names}`,
  }
}

function numberToWord(n: number): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
  return n <= 10 ? words[n] : String(n)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

function formatFrequency(config: { frequency?: string } | null): string {
  switch (config?.frequency) {
    case 'daily': return 'Every day'
    case 'weekly': return 'Every week'
    case 'biweekly': return 'Every 2 weeks'
    case 'monthly': return 'Every month'
    default: return 'Every day'
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'habit': return 'habit'
    case 'metric': return 'metric'
    case 'file': return 'file'
    case 'check_in': return 'check-in'
    case 'questionnaire': return 'questionnaire'
    default: return 'item'
  }
}

function typeLabelPlural(type: string): string {
  switch (type) {
    case 'habit': return 'habits'
    case 'metric': return 'metrics'
    case 'file': return 'files'
    case 'check_in': return 'check-ins'
    case 'questionnaire': return 'questionnaires'
    default: return 'items'
  }
}

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}
