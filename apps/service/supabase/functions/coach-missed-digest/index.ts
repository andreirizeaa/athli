/**
 * Supabase Edge Function: coach-missed-digest
 *
 * Sends a consolidated push notification to coaches about missed client items.
 * Invoked by pg_cron every 30 minutes (at :20 and :50).
 *
 * Fires at 5:00 AM in the coach's local timezone. Aggregates unread
 * missed-type notifications from the previous day and sends a single
 * digest push instead of individual notifications.
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - EXPO_ACCESS_TOKEN
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MISSED_TYPES = ['workout_missed', 'checkin_missed', 'habit_missed', 'metric_missed']

interface CoachRow {
  coach_id: string
  timezone: string
}

interface NotificationRow {
  client_id: string
  notification_type: string
}

interface ClientProfile {
  id: string
  name: string
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1 — Find coaches with push tokens whose local hour = 5
    const { data: tokenRows, error: tokenError } = await supabase
      .from('coach_push_tokens')
      .select('coach_id')

    if (tokenError) throw new Error(`Failed to fetch coach push tokens: ${tokenError.message}`)
    if (!tokenRows || tokenRows.length === 0) {
      return jsonResponse({ success: true, message: 'No coaches with push tokens' })
    }

    const coachIds = [...new Set(tokenRows.map((r: any) => r.coach_id))]

    // Determine which coaches are at local hour 5
    const eligibleCoaches: CoachRow[] = []
    for (const coachId of coachIds) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('timezone')
        .eq('id', coachId)
        .single()

      const timezone = profile?.timezone || 'UTC'
      const now = new Date()
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
      const localHour = localTime.getHours()

      if (localHour === 5) {
        eligibleCoaches.push({ coach_id: coachId, timezone })
      }
    }

    if (eligibleCoaches.length === 0) {
      return jsonResponse({ success: true, message: 'No coaches in notification window' })
    }

    console.log(`Found ${eligibleCoaches.length} eligible coach(es)`)

    let totalSent = 0

    for (const coach of eligibleCoaches) {
      const { coach_id, timezone } = coach

      // Calculate local dates
      const now = new Date()
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
      const localToday = formatDate(localTime)

      const localYesterday = new Date(localTime)
      localYesterday.setDate(localYesterday.getDate() - 1)
      const localYesterdayStr = formatDate(localYesterday)

      // Step 2 — Attempt dedup insert
      const { error: dedupError } = await supabase
        .from('coach_push_notification_log')
        .insert({
          coach_id,
          notification_type: 'morning_missed_digest',
          notification_date: localToday,
        })
        .select('id')
        .single()

      if (dedupError) {
        console.log(`Coach ${coach_id}: already sent digest today, skipping`)
        continue
      }

      // Step 3 — Query unread missed notifications from yesterday
      // Convert local yesterday boundaries to UTC for the query
      const yesterdayStart = localToUTC(`${localYesterdayStr}T00:00:00`, timezone)
      const todayStart = localToUTC(`${localToday}T00:00:00`, timezone)

      const { data: notifications, error: notifError } = await supabase
        .from('coach_notifications')
        .select('client_id, notification_type')
        .eq('coach_id', coach_id)
        .in('notification_type', MISSED_TYPES)
        .gte('created_at', yesterdayStart)
        .lt('created_at', todayStart)
        .is('read_at', null)

      if (notifError) {
        console.error(`Coach ${coach_id}: failed to query notifications:`, notifError.message)
        continue
      }

      if (!notifications || notifications.length === 0) {
        console.log(`Coach ${coach_id}: no missed notifications yesterday`)
        continue
      }

      // Step 4 — Group by client, aggregate counts by type
      const clientMap: Record<string, Record<string, number>> = {}
      for (const n of notifications as NotificationRow[]) {
        if (!clientMap[n.client_id]) {
          clientMap[n.client_id] = {}
        }
        clientMap[n.client_id][n.notification_type] = (clientMap[n.client_id][n.notification_type] || 0) + 1
      }

      // Fetch client names
      const clientIds = Object.keys(clientMap)
      const { data: clientProfiles } = await supabase
        .from('user_profiles')
        .select('id, name')
        .in('id', clientIds)

      const nameMap: Record<string, string> = {}
      for (const p of (clientProfiles || []) as ClientProfile[]) {
        nameMap[p.id] = p.name?.split(' ')[0] || 'Client'
      }

      // Step 5 — Build consolidated message
      const message = buildDigestMessage(clientMap, nameMap)

      if (!message) {
        console.log(`Coach ${coach_id}: could not build digest message`)
        continue
      }

      // Step 6 — Get push tokens and send
      const { data: tokens } = await supabase
        .from('coach_push_tokens')
        .select('expo_push_token')
        .eq('coach_id', coach_id)

      const uniqueTokens = [...new Set((tokens || []).map((t: any) => t.expo_push_token))]
      if (uniqueTokens.length === 0) {
        console.log(`Coach ${coach_id}: no push tokens`)
        continue
      }

      const messages = uniqueTokens.map((token: string) => ({
        to: token,
        sound: 'default',
        title: message.title,
        body: message.body,
        data: { type: 'coach_missed_digest' },
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
        console.error(`Coach ${coach_id}: Expo push failed:`, JSON.stringify(expoResult))
      } else {
        totalSent += messages.length
        console.log(`Coach ${coach_id}: sent ${messages.length} digest notification(s)`)
      }
    }

    return jsonResponse({
      success: true,
      message: `Processed ${eligibleCoaches.length} coach(es), sent ${totalSent} notification(s)`,
    })
  } catch (error) {
    console.error('coach-missed-digest failed:', error)
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

// ---- Helper functions ----

function jsonResponse(body: Record<string, any>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convert a local datetime string to ISO UTC string for Supabase queries.
 */
function localToUTC(localDatetime: string, timezone: string): string {
  // Create a formatter that outputs in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  // Parse the target local time
  const [datePart, timePart] = localDatetime.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute, second] = (timePart || '00:00:00').split(':').map(Number)

  // Use a binary search approach: find a UTC date whose local representation matches
  // Start with a rough estimate
  const estimate = new Date(Date.UTC(year, month - 1, day, hour, minute, second || 0))

  // Adjust by checking what the estimate looks like in the target timezone
  const localOfEstimate = new Date(estimate.toLocaleString('en-US', { timeZone: timezone }))
  const diffMs = estimate.getTime() - localOfEstimate.getTime()
  const adjusted = new Date(estimate.getTime() + diffMs)

  return adjusted.toISOString()
}

const TYPE_LABELS: Record<string, string> = {
  workout_missed: 'workout',
  checkin_missed: 'check-in',
  habit_missed: 'habit',
  metric_missed: 'metric log',
}

const TYPE_LABELS_PLURAL: Record<string, string> = {
  workout_missed: 'workouts',
  checkin_missed: 'check-ins',
  habit_missed: 'habits',
  metric_missed: 'metric logs',
}

/**
 * Build a human-readable summary for one client's missed items.
 * e.g., "2 check-ins and 1 workout"
 */
function buildClientSummary(counts: Record<string, number>): string {
  const parts: string[] = []
  for (const [type, count] of Object.entries(counts)) {
    const label = count > 1 ? TYPE_LABELS_PLURAL[type] : TYPE_LABELS[type]
    if (label) {
      parts.push(`${count} ${label}`)
    }
  }
  return formatList(parts)
}

function formatList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1]
}

/**
 * Build the digest push notification message.
 */
function buildDigestMessage(
  clientMap: Record<string, Record<string, number>>,
  nameMap: Record<string, string>
): { title: string; body: string } | null {
  const clientIds = Object.keys(clientMap)
  if (clientIds.length === 0) return null

  const title = 'Missed items yesterday'

  if (clientIds.length === 1) {
    const clientId = clientIds[0]
    const name = nameMap[clientId] || 'Client'
    const summary = buildClientSummary(clientMap[clientId])
    return {
      title,
      body: `${name} missed ${summary} yesterday`,
    }
  }

  // Multiple clients
  const clientParts = clientIds.map(id => {
    const name = nameMap[id] || 'Client'
    const summary = buildClientSummary(clientMap[id])
    return `${name} (${summary})`
  })

  return {
    title,
    body: `${clientIds.length} clients missed items yesterday: ${formatList(clientParts)}`,
  }
}
