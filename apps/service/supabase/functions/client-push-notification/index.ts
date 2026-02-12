/**
 * Supabase Edge Function: client-push-notification
 *
 * Sends push notifications to clients about daily tasks and workouts.
 * Invoked by pg_cron every 30 minutes.
 *
 * Two notification windows per client (based on their local timezone):
 * - 5:00 AM — new tasks/workouts for today
 * - 6:00 PM — uncompleted tasks/workouts reminder
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

    // Step 1 — Find eligible clients (local hour = 5 or 18)
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

        if (localHour === 5 || localHour === 18) {
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

      // Step 2 — Determine notification types for this window
      const taskType = isMorning ? 'morning_tasks' : 'evening_tasks'
      const workoutType = isMorning ? 'morning_workouts' : 'evening_workouts'

      // Step 3 — Attempt dedup inserts
      const [taskDedup, workoutDedup] = await Promise.all([
        supabase
          .from('client_push_notification_log')
          .insert({ client_id, notification_type: taskType, notification_date: local_today })
          .select('id')
          .single(),
        supabase
          .from('client_push_notification_log')
          .insert({ client_id, notification_type: workoutType, notification_date: local_today })
          .select('id')
          .single(),
      ])

      const shouldSendTasks = !taskDedup.error
      const shouldSendWorkouts = !workoutDedup.error

      if (!shouldSendTasks && !shouldSendWorkouts) {
        console.log(`Client ${client_id}: already notified today, skipping`)
        continue
      }

      // Step 4 — Fetch tasks and workouts data
      const notifications: Array<{ title: string; body: string }> = []

      if (shouldSendTasks) {
        const taskNotification = await buildTaskNotification(supabase, client_id, local_today, isMorning)
        if (taskNotification) notifications.push(taskNotification)
      }

      if (shouldSendWorkouts) {
        const workoutNotification = await buildWorkoutNotification(supabase, client_id, local_today, isMorning)
        if (workoutNotification) notifications.push(workoutNotification)
      }

      if (notifications.length === 0) {
        console.log(`Client ${client_id}: no tasks/workouts to notify about`)
        continue
      }

      // Step 5 — Get push tokens and send
      const { data: tokens, error: tokenError } = await supabase
        .from('client_push_tokens')
        .select('expo_push_token')
        .eq('client_id', client_id)

      if (tokenError || !tokens || tokens.length === 0) {
        console.log(`Client ${client_id}: no push tokens`)
        continue
      }

      // Send each notification to all devices
      const messages = []
      for (const notification of notifications) {
        for (const token of tokens) {
          messages.push({
            to: token.expo_push_token,
            sound: 'default',
            title: notification.title,
            body: notification.body,
            data: { type: 'client_notification' },
          })
        }
      }

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

/**
 * Build a task notification for a client.
 * Morning: "You have N new task(s)"
 * Evening: "You still have N task(s) to complete"
 */
async function buildTaskNotification(
  supabase: any,
  clientId: string,
  localToday: string,
  isMorning: boolean
): Promise<{ title: string; body: string } | null> {
  const { data: tasks, error } = await supabase
    .from('client_tasks')
    .select('id, task_type, reference_id')
    .eq('client_id', clientId)
    .eq('due_date', localToday)

  if (error || !tasks || tasks.length === 0) return null

  // Tasks are hard-deleted on completion, so remaining tasks = uncompleted
  const count = tasks.length

  // Enrich first task for single-item body
  const enriched = await enrichTaskNames(supabase, tasks)
  const firstName = enriched[0]?.displayName || 'task'

  if (isMorning) {
    if (count === 1) {
      return { title: 'You have a new task', body: firstName }
    }
    return { title: `You have ${count} new tasks`, body: firstName }
  } else {
    if (count === 1) {
      return { title: "Don't forget your task", body: firstName }
    }
    return { title: `You still have ${count} tasks to complete`, body: firstName }
  }
}

/**
 * Build a workout notification for a client.
 * Morning: "You have N workout(s) today"
 * Evening: "You still have N workout(s) to complete" (only uncompleted)
 */
async function buildWorkoutNotification(
  supabase: any,
  clientId: string,
  localToday: string,
  isMorning: boolean
): Promise<{ title: string; body: string } | null> {
  // Query client_training using its actual columns (no 'id' column exists)
  const { data: trainings, error } = await supabase
    .from('client_training')
    .select('client_id, date, coach_id, training_data')
    .eq('client_id', clientId)
    .eq('date', localToday)

  if (error || !trainings || trainings.length === 0) return null

  // Extract all workout keys from training_data JSONB
  // training_data is an object like { workout_1: {...}, workout_2: {...} }
  const allWorkouts: Array<{ workoutId: string; name: string; trainingData: Record<string, any> }> = []
  for (const training of trainings as TrainingRow[]) {
    if (training.training_data && typeof training.training_data === 'object') {
      for (const [workoutId, workoutData] of Object.entries(training.training_data)) {
        allWorkouts.push({
          workoutId,
          name: (workoutData as any)?.name || 'workout',
          trainingData: training.training_data,
        })
      }
    }
  }

  if (allWorkouts.length === 0) return null

  let workoutsToNotify = allWorkouts

  // For evening, filter out completed workouts
  if (!isMorning) {
    const workoutIds = allWorkouts.map(w => w.workoutId)
    const { data: history } = await supabase
      .from('client_training_history')
      .select('workout_id, status')
      .eq('client_id', clientId)
      .eq('date', localToday)
      .in('workout_id', workoutIds)
      .eq('status', 'completed')

    const completedWorkoutIds = new Set((history || []).map((h: TrainingHistoryRow) => h.workout_id))
    workoutsToNotify = allWorkouts.filter(w => !completedWorkoutIds.has(w.workoutId))

    if (workoutsToNotify.length === 0) return null
  }

  const count = workoutsToNotify.length
  const firstName = workoutsToNotify[0].name

  if (isMorning) {
    if (count === 1) {
      return { title: 'You have a new workout today', body: firstName }
    }
    return { title: `You have ${count} workouts today`, body: firstName }
  } else {
    if (count === 1) {
      return { title: "Don't forget your workout", body: firstName }
    }
    return { title: `You still have ${count} workouts to complete`, body: firstName }
  }
}

/**
 * Enrich task rows with display names by looking up reference tables.
 * Mirrors the enrichTasks pattern from client-tasks.controller.ts
 */
async function enrichTaskNames(
  supabase: any,
  tasks: Array<{ id: string; task_type: string; reference_id: string }>
): Promise<Array<{ id: string; task_type: string; reference_id: string; displayName: string }>> {
  // Group reference_ids by task_type
  const idsByType: Record<string, string[]> = {}
  for (const t of tasks) {
    if (!idsByType[t.task_type]) idsByType[t.task_type] = []
    idsByType[t.task_type].push(t.reference_id)
  }

  const refMap: Record<string, string> = {}

  const fetches: Promise<void>[] = []

  if (idsByType.check_in?.length) {
    fetches.push(
      supabase
        .from('client_checkins')
        .select('id, name')
        .in('id', idsByType.check_in)
        .then(({ data }: any) => {
          for (const r of data || []) refMap[r.id] = r.name
        })
    )
  }

  if (idsByType.metric?.length) {
    fetches.push(
      supabase
        .from('client_metrics')
        .select('id, name')
        .in('id', idsByType.metric)
        .then(({ data }: any) => {
          for (const r of data || []) refMap[r.id] = r.name
        })
    )
  }

  if (idsByType.habit?.length) {
    fetches.push(
      supabase
        .from('client_habits')
        .select('id, name')
        .in('id', idsByType.habit)
        .then(({ data }: any) => {
          for (const r of data || []) refMap[r.id] = r.name
        })
    )
  }

  if (idsByType.questionnaire?.length) {
    fetches.push(
      supabase
        .from('client_questionnaires')
        .select('id, name')
        .in('id', idsByType.questionnaire)
        .then(({ data }: any) => {
          for (const r of data || []) refMap[r.id] = r.name
        })
    )
  }

  await Promise.all(fetches)

  // Format display names
  const typeLabels: Record<string, (name: string) => string> = {
    check_in: (name) => `Complete ${name} check-in`,
    metric: (name) => `Enter a log for ${name}`,
    habit: (name) => `Complete ${name}`,
    questionnaire: (name) => `Fill out ${name}`,
  }

  return tasks.map(t => {
    const name = refMap[t.reference_id] || 'task'
    const formatter = typeLabels[t.task_type]
    return {
      ...t,
      displayName: formatter ? formatter(name) : name,
    }
  })
}

/**
 * Extract workout name from training_data JSONB.
 * training_data is an object where keys are workout IDs and values have a `name` field.
 */
function extractWorkoutName(trainingData: Record<string, any>): string {
  if (!trainingData || typeof trainingData !== 'object') return 'workout'
  const keys = Object.keys(trainingData)
  if (keys.length === 0) return 'workout'
  return trainingData[keys[0]]?.name || 'workout'
}
