/**
 * Supabase Edge Function: habit-reminder-push-notification
 *
 * Sends push notifications to clients when their habit reminders are due.
 * Invoked by pg_cron every 30 minutes.
 *
 * Logic:
 * 1. Find all habits with reminder_enabled = true
 * 2. For each assigned habit, get the client's timezone
 * 3. Check if the current time window (±15 min) matches the reminder_time in client's timezone
 * 4. Check if the habit is due today (daily habits always due, weekly check days_of_week)
 * 5. Check if not already sent today (via habit_reminder_log)
 * 6. Send push notification via Expo
 * 7. Log to habit_reminder_log
 *
 * Push Notification Format:
 * - Title: "⏰ Reminder to log {habit_name}"
 * - Body: Coach's custom message OR "Stay on track! Complete your habit log."
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - EXPO_ACCESS_TOKEN
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface HabitWithReminder {
  id: string
  name: string
  reminder_time: string
  reminder_message: string | null
  schedule_type: string
  days_of_week: number[] | null
}

interface HabitAssignment {
  id: string
  client_id: string
  coach_habit_id: string
  is_active: boolean
}

interface ClientTimezone {
  client_id: string
  timezone: string
}

const DEFAULT_REMINDER_MESSAGE = 'Stay on track! Complete your habit log.'

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

    // Step 1: Get all habits with reminders enabled
    const { data: habitsWithReminders, error: habitsError } = await supabase
      .from('coach_habits')
      .select('id, name, reminder_time, reminder_message, schedule_type, days_of_week')
      .eq('reminder_enabled', true)
      .not('reminder_time', 'is', null)

    if (habitsError) {
      throw new Error(`Failed to fetch habits with reminders: ${habitsError.message}`)
    }

    if (!habitsWithReminders || habitsWithReminders.length === 0) {
      return jsonResponse({ success: true, message: 'No habits with reminders enabled' })
    }

    console.log(`Found ${habitsWithReminders.length} habit(s) with reminders enabled`)

    // Step 2: Get all active assignments for these habits
    const habitIds = habitsWithReminders.map(h => h.id)
    const { data: assignments, error: assignmentsError } = await supabase
      .from('client_habit_assignments')
      .select('id, client_id, coach_habit_id, is_active')
      .in('coach_habit_id', habitIds)
      .eq('is_active', true)

    if (assignmentsError) {
      throw new Error(`Failed to fetch habit assignments: ${assignmentsError.message}`)
    }

    if (!assignments || assignments.length === 0) {
      return jsonResponse({ success: true, message: 'No active habit assignments with reminders' })
    }

    console.log(`Found ${assignments.length} active assignment(s)`)

    // Step 3: Get unique client IDs and their timezones
    const clientIds = [...new Set(assignments.map(a => a.client_id))]
    const clientTimezones: Record<string, string> = {}

    for (const clientId of clientIds) {
      const timezone = await getClientTimezone(supabase, clientId)
      clientTimezones[clientId] = timezone
    }

    // Step 4: Process each assignment
    let totalSent = 0
    const now = new Date()

    for (const assignment of assignments) {
      const habit = habitsWithReminders.find(h => h.id === assignment.coach_habit_id)
      if (!habit) continue

      const clientId = assignment.client_id
      const timezone = clientTimezones[clientId]

      // Get current time in client's timezone
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
      const localHour = localTime.getHours()
      const localMinute = localTime.getMinutes()
      const localDayOfWeek = localTime.getDay() // 0 = Sunday, 6 = Saturday

      // Get local date string for dedup
      const year = localTime.getFullYear()
      const month = String(localTime.getMonth() + 1).padStart(2, '0')
      const day = String(localTime.getDate()).padStart(2, '0')
      const localToday = `${year}-${month}-${day}`

      // Parse reminder time (format: "HH:MM:SS" or "HH:MM")
      const [reminderHour, reminderMinute] = habit.reminder_time.split(':').map(Number)

      // Check if current time is within ±15 minutes of reminder time
      const reminderTotalMinutes = reminderHour * 60 + reminderMinute
      const currentTotalMinutes = localHour * 60 + localMinute
      const timeDiff = Math.abs(currentTotalMinutes - reminderTotalMinutes)

      // Handle midnight wrap-around
      const adjustedTimeDiff = Math.min(timeDiff, 1440 - timeDiff)

      if (adjustedTimeDiff > 15) {
        // Not within reminder window
        continue
      }

      // Check if habit is due today based on schedule_type
      if (!isHabitDueToday(habit, localDayOfWeek)) {
        continue
      }

      // Check if already sent today (deduplication)
      const { error: dedupError } = await supabase
        .from('habit_reminder_log')
        .insert({
          client_id: clientId,
          coach_habit_id: habit.id,
          reminder_date: localToday,
        })
        .select('id')
        .single()

      if (dedupError) {
        // Already sent today, skip
        console.log(`Habit ${habit.name} for client ${clientId}: already reminded today`)
        continue
      }

      // Get client's push tokens
      const { data: tokens, error: tokenError } = await supabase
        .from('client_push_tokens')
        .select('expo_push_token')
        .eq('client_id', clientId)

      if (tokenError || !tokens || tokens.length === 0) {
        console.log(`Client ${clientId}: no push tokens`)
        continue
      }

      // Build and send notification
      const title = `⏰ Reminder to log ${habit.name}`
      const body = habit.reminder_message || DEFAULT_REMINDER_MESSAGE

      const messages = tokens.map(token => ({
        to: token.expo_push_token,
        sound: 'default',
        title,
        body,
        data: {
          type: 'habit_reminder',
          habit_id: habit.id,
          habit_name: habit.name,
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
        console.error(`Client ${clientId}: Expo push failed:`, JSON.stringify(expoResult))
      } else {
        totalSent += messages.length
        console.log(`Client ${clientId}: sent reminder for habit "${habit.name}"`)
      }
    }

    return jsonResponse({
      success: true,
      message: `Processed ${assignments.length} assignment(s), sent ${totalSent} reminder(s)`,
    })
  } catch (error) {
    console.error('habit-reminder-notification failed:', error)
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})

// ---- Helper functions ----

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

/**
 * Get client's timezone, falling back to coach's timezone or UTC.
 */
async function getClientTimezone(supabase: any, clientId: string): Promise<string> {
  // Try client's timezone
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('timezone')
    .eq('id', clientId)
    .single()

  if (profile?.timezone) {
    return profile.timezone
  }

  // Fall back to coach's timezone
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

    if (coachProfile?.timezone) {
      return coachProfile.timezone
    }
  }

  return 'UTC'
}

/**
 * Check if a habit is due today based on its schedule_type and days_of_week.
 */
function isHabitDueToday(habit: HabitWithReminder, localDayOfWeek: number): boolean {
  switch (habit.schedule_type) {
    case 'daily':
      // Daily habits are always due
      return true

    case 'weekly':
    case 'custom':
      // Check if today is in the days_of_week array
      if (!habit.days_of_week || habit.days_of_week.length === 0) {
        // No specific days set, assume always due
        return true
      }
      return habit.days_of_week.includes(localDayOfWeek)

    default:
      // Unknown schedule type, assume due
      return true
  }
}
