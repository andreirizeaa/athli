/**
 * Supabase Edge Function: client-push-notification
 *
 * Sends push notifications to clients about daily tasks and workouts.
 * Invoked by pg_cron every 30 minutes.
 *
 * Two notification windows per client (based on their local timezone):
 * - 5:00 AM — new tasks/workouts for today + overdue items
 * - 4:00 PM — uncompleted tasks/workouts reminder
 *
 * Each window sends a single consolidated push notification combining
 * tasks, workouts, and overdue items with type breakdowns.
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - EXPO_ACCESS_TOKEN
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EligibleClient {
  client_id: string
  timezone: string
  local_hour: number
  local_today: string
}

interface TaskRow {
  id: string
  client_id: string
  task_type: string
  reference_id: string
  due_date: string
}

interface TrainingRow {
  client_id: string
  date: string
  coach_id: string
  training_data: Record<string, any>
}

interface TrainingHistoryRow {
  workout_id: string
  status: string
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

    // Step 1 — Find eligible clients (local hour = 5 or 16)
    const { data: eligibleClients, error: eligibleError } = await supabase.rpc('get_eligible_push_clients')

    // If the RPC doesn't exist yet, fall back to raw SQL
    let clients: EligibleClient[] = []
    if (eligibleError) {
      console.log('RPC not available, using direct query')
      const { data, error } = await supabase
        .from('client_push_tokens')
        .select('client_id')

      if (error) throw new Error(`Failed to fetch client push tokens: ${error.message}`)
      if (!data || data.length === 0) {
        return jsonResponse({ success: true, message: 'No clients with push tokens' })
      }

      // Get unique client IDs
      const clientIds = [...new Set(data.map((r: any) => r.client_id))]

      // For each client, determine timezone and local hour
      for (const clientId of clientIds) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('timezone')
          .eq('id', clientId)
          .single()

        let timezone = profile?.timezone || null

        // Fall back to coach timezone
        if (!timezone) {
          const { data: assignment } = await supabase
            .from('coach_client_assignments')
            .select('coach_id')
            .eq('client_id', clientId)
            .limit(1)
            .single()

          if (assignment?.coach_id) {
            const { data: coachProfile } = await supabase
              .from('user_profiles')
              .select('timezone')
              .eq('id', assignment.coach_id)
              .single()
            timezone = coachProfile?.timezone || null
          }
        }

        timezone = timezone || 'UTC'

        // Calculate local hour using timezone
        const now = new Date()
        const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
        const localHour = localTime.getHours()
        // Format local date correctly (toISOString would convert back to UTC)
        const year = localTime.getFullYear()
        const month = String(localTime.getMonth() + 1).padStart(2, '0')
        const day = String(localTime.getDate()).padStart(2, '0')
        const localToday = `${year}-${month}-${day}`

        if (localHour === 5 || localHour === 16) {
          clients.push({
            client_id: clientId,
            timezone,
            local_hour: localHour,
            local_today: localToday,
          })
        }
      }
    } else {
      clients = eligibleClients || []
    }

    if (clients.length === 0) {
      return jsonResponse({ success: true, message: 'No clients in notification window' })
    }

    console.log(`Found ${clients.length} eligible client(s)`)

    let totalSent = 0

    // Process each eligible client
    for (const client of clients) {
      const { client_id, local_hour, local_today } = client
      const isMorning = local_hour === 5

      // Determine notification type for dedup
      const notificationType = isMorning ? 'morning_tasks' : 'afternoon_tasks'

      // Attempt dedup insert (single entry per window now)
      const { error: dedupError } = await supabase
        .from('client_push_notification_log')
        .insert({ client_id, notification_type: notificationType, notification_date: local_today })
        .select('id')
        .single()

      if (dedupError) {
        console.log(`Client ${client_id}: already notified for ${notificationType} today, skipping`)
        continue
      }

      // Gather all data for consolidated notification
      const taskInfo = await getTaskBreakdown(supabase, client_id, local_today, isMorning)
      const workoutInfo = await getWorkoutInfo(supabase, client_id, local_today, isMorning)
      const overdueInfo = isMorning ? await getOverdueInfo(supabase, client_id, local_today) : null

      // Build consolidated notification
      const notification = buildConsolidatedNotification(taskInfo, workoutInfo, overdueInfo, isMorning)

      if (!notification) {
        console.log(`Client ${client_id}: no tasks/workouts to notify about`)
        continue
      }

      // Get push tokens and send
      const { data: tokens, error: tokenError } = await supabase
        .from('client_push_tokens')
        .select('expo_push_token')
        .eq('client_id', client_id)

      if (tokenError || !tokens || tokens.length === 0) {
        console.log(`Client ${client_id}: no push tokens`)
        continue
      }

      // Single consolidated push to all devices
      const messages = tokens.map((token: any) => ({
        to: token.expo_push_token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: { type: 'client_notification' },
      }))

      if (messages.length > 0) {
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
          console.error(`Client ${client_id}: Expo push failed:`, JSON.stringify(expoResult))
        } else {
          totalSent += messages.length
          console.log(`Client ${client_id}: sent ${messages.length} notification(s)`)
        }
      }
    }

    return jsonResponse({
      success: true,
      message: `Processed ${clients.length} client(s), sent ${totalSent} notification(s)`,
    })
  } catch (error) {
    console.error('client-push-notification failed:', error)
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

interface TaskBreakdown {
  check_in: number
  metric: number
  habit: number
  questionnaire: number
  total: number
}

interface WorkoutInfo {
  count: number
}

interface OverdueInfo {
  check_in: number
  metric: number
  habit: number
  questionnaire: number
  total: number
  daysBehind: number
}

/**
 * Get today's tasks grouped by type.
 * For afternoon, only uncompleted tasks remain (they're hard-deleted on completion).
 */
async function getTaskBreakdown(
  supabase: any,
  clientId: string,
  localToday: string,
  _isMorning: boolean
): Promise<TaskBreakdown | null> {
  const { data: tasks, error } = await supabase
    .from('client_tasks')
    .select('id, task_type, reference_id')
    .eq('client_id', clientId)
    .eq('due_date', localToday)

  if (error || !tasks || tasks.length === 0) return null

  const breakdown: TaskBreakdown = { check_in: 0, metric: 0, habit: 0, questionnaire: 0, total: tasks.length }
  for (const task of tasks as TaskRow[]) {
    if (task.task_type in breakdown) {
      breakdown[task.task_type as keyof Omit<TaskBreakdown, 'total'>]++
    }
  }

  return breakdown
}

/**
 * Get today's workout count.
 * For afternoon, filter out completed workouts.
 */
async function getWorkoutInfo(
  supabase: any,
  clientId: string,
  localToday: string,
  isMorning: boolean
): Promise<WorkoutInfo | null> {
  const { data: trainings, error } = await supabase
    .from('client_training')
    .select('client_id, date, coach_id, training_data')
    .eq('client_id', clientId)
    .eq('date', localToday)

  if (error || !trainings || trainings.length === 0) return null

  // Extract all workout keys from training_data JSONB
  const allWorkoutIds: string[] = []
  for (const training of trainings as TrainingRow[]) {
    if (training.training_data && typeof training.training_data === 'object') {
      for (const workoutId of Object.keys(training.training_data)) {
        allWorkoutIds.push(workoutId)
      }
    }
  }

  if (allWorkoutIds.length === 0) return null

  if (!isMorning) {
    // Filter out completed workouts
    const { data: history } = await supabase
      .from('client_training_history')
      .select('workout_id, status')
      .eq('client_id', clientId)
      .eq('date', localToday)
      .in('workout_id', allWorkoutIds)
      .eq('status', 'completed')

    const completedIds = new Set((history || []).map((h: TrainingHistoryRow) => h.workout_id))
    const remaining = allWorkoutIds.filter(id => !completedIds.has(id))
    if (remaining.length === 0) return null
    return { count: remaining.length }
  }

  return { count: allWorkoutIds.length }
}

/**
 * Get overdue tasks from previous days (due_date < today).
 */
async function getOverdueInfo(
  supabase: any,
  clientId: string,
  localToday: string
): Promise<OverdueInfo | null> {
  const { data: tasks, error } = await supabase
    .from('client_tasks')
    .select('id, task_type, due_date')
    .eq('client_id', clientId)
    .lt('due_date', localToday)

  if (error || !tasks || tasks.length === 0) return null

  const info: OverdueInfo = { check_in: 0, metric: 0, habit: 0, questionnaire: 0, total: tasks.length, daysBehind: 0 }
  for (const task of tasks) {
    if (task.task_type in info && task.task_type !== 'total' && task.task_type !== 'daysBehind') {
      (info as any)[task.task_type]++
    }
  }

  // Calculate how far behind the oldest overdue task is
  const dates = tasks.map((t: any) => t.due_date).sort()
  if (dates.length > 0) {
    const oldest = new Date(dates[0])
    const today = new Date(localToday)
    info.daysBehind = Math.floor((today.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24))
  }

  return info
}

/**
 * Build a type breakdown string like "2 check-ins, 1 metric log, and 1 habit"
 */
function buildTypeBreakdown(counts: { check_in: number; metric: number; habit: number; questionnaire: number }): string {
  const parts: string[] = []

  if (counts.check_in > 0) {
    parts.push(`${counts.check_in} check-in${counts.check_in > 1 ? 's' : ''}`)
  }
  if (counts.metric > 0) {
    parts.push(`${counts.metric} metric log${counts.metric > 1 ? 's' : ''}`)
  }
  if (counts.habit > 0) {
    parts.push(`${counts.habit} habit${counts.habit > 1 ? 's' : ''}`)
  }
  if (counts.questionnaire > 0) {
    parts.push(`${counts.questionnaire} questionnaire${counts.questionnaire > 1 ? 's' : ''}`)
  }

  return formatList(parts)
}

/**
 * Join items with commas and "and": ["a", "b", "c"] -> "a, b, and c"
 */
function formatList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1]
}

/**
 * Build a single consolidated notification combining tasks, workouts, and overdue items.
 */
function buildConsolidatedNotification(
  taskInfo: TaskBreakdown | null,
  workoutInfo: WorkoutInfo | null,
  overdueInfo: OverdueInfo | null,
  isMorning: boolean
): { title: string; body: string } | null {
  const bodyParts: string[] = []

  // Tasks breakdown
  if (taskInfo) {
    const breakdown = buildTypeBreakdown(taskInfo)
    if (breakdown) {
      bodyParts.push(breakdown)
    }
  }

  // Workouts
  if (workoutInfo) {
    const wCount = workoutInfo.count
    bodyParts.push(`${wCount} workout${wCount > 1 ? 's' : ''}`)
  }

  // Overdue (morning only)
  if (overdueInfo && overdueInfo.total > 0) {
    const overdueBreakdown = buildTypeBreakdown(overdueInfo)
    if (overdueBreakdown) {
      const daysLabel = overdueInfo.daysBehind === 1 ? 'yesterday' : `from the last ${overdueInfo.daysBehind} days`
      bodyParts.push(`${overdueBreakdown} overdue ${daysLabel}`)
    }
  }

  if (bodyParts.length === 0) return null

  let title: string
  let body: string

  if (isMorning) {
    title = "Good morning! Here's your plan for today"

    if (overdueInfo && overdueInfo.total > 0) {
      // Separate today's items from overdue
      const todayParts: string[] = []
      if (taskInfo) {
        const breakdown = buildTypeBreakdown(taskInfo)
        if (breakdown) todayParts.push(breakdown)
      }
      if (workoutInfo) {
        const wCount = workoutInfo.count
        todayParts.push(`${wCount} workout${wCount > 1 ? 's' : ''}`)
      }

      const overdueBreakdown = buildTypeBreakdown(overdueInfo)
      const daysLabel = overdueInfo.daysBehind === 1 ? 'yesterday' : `from the last ${overdueInfo.daysBehind} days`

      if (todayParts.length > 0) {
        body = `${formatList(todayParts)}. Also ${overdueBreakdown} overdue ${daysLabel}.`
      } else {
        body = `You have ${overdueBreakdown} overdue ${daysLabel}.`
      }
    } else {
      body = formatList(bodyParts)
    }
  } else {
    title = 'You still have tasks to complete'
    body = `${formatList(bodyParts)} remaining`
  }

  return { title, body }
}
