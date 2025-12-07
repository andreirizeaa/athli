// supabase/functions/check-daily-video-submissions/index.ts
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2"
declare const Deno: any

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

// --- Random delay between 3 and 31 minutes ---
async function randomDelay() {
  const delayMinutes = Math.floor(Math.random() * (31 - 3 + 1)) + 3 // 3–31 minutes
  const delayMs = delayMinutes * 60 * 1000
  console.log(`Delaying execution by ${delayMinutes} minutes...`)
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

// --- Inline helper for sending Expo push ---
async function sendExpoPush(
  to: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN")
  const payload = {
    to,
    sound: "default",
    title,
    body,
    ...(data ? { data } : {}),
  }

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  const txt = await res.text()
  return txt
}

// --- Helper to get Expo push token for a user ---
async function getExpoPushTokenForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('expo_push_notification')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return null
  if (!data) return null
  return (data as any)?.expo_push_notification ?? null
}

// --- Format date to YYYY-MM-DD format used by lifts table ---
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

Deno.serve(async () => {
  try {
    // 🕒 Wait a random time before executing main logic
    await randomDelay()

    // Get today's and yesterday's dates
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const todayFormatted = formatDate(today)
    const yesterdayFormatted = formatDate(yesterday)

    console.log(`Checking video submissions for date: ${todayFormatted}`)
    console.log(`Checking streaks from yesterday: ${yesterdayFormatted}`)

    // Get all users who have submitted videos today
    const { data: todaySubmissions, error: submissionsError } = await supabase
      .from('lifts')
      .select('user_id')
      .eq('lift_date', todayFormatted)

    if (submissionsError) {
      console.error('Error fetching today submissions:', submissionsError)
      return new Response('db error fetching submissions', { status: 500 })
    }

    // Create a set of user IDs who have already submitted today
    const submittedUserIds = new Set(
      (todaySubmissions || []).map((lift: any) => lift.user_id)
    )

    console.log(`Users who submitted today: ${submittedUserIds.size}`)

    // Get all users who checked in yesterday
    const { data: yesterdayCheckIns, error: checkInsError } = await supabase
      .from('user_check_ins')
      .select('user_id')
      .eq('date', yesterdayFormatted)

    if (checkInsError) {
      console.error('Error fetching yesterday check-ins:', checkInsError)
      return new Response('db error fetching check-ins', { status: 500 })
    }

    // Create a set of user IDs who checked in yesterday
    const yesterdayCheckInUserIds = new Set(
      (yesterdayCheckIns || []).map((checkIn: any) => checkIn.user_id)
    )

    console.log(`Users who checked in yesterday: ${yesterdayCheckInUserIds.size}`)

    // Get all users
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('user_id')

    if (usersError) {
      console.error('Error fetching all users:', usersError)
      return new Response('db error fetching users', { status: 500 })
    }

    // Filter users who haven't submitted today
    const usersWithoutSubmissions = (allUsers || []).filter(
      (user: any) => !submittedUserIds.has(user.user_id)
    )

    console.log(`Users without submissions today: ${usersWithoutSubmissions.length}`)

    if (usersWithoutSubmissions.length === 0) {
      return new Response('all users have submitted videos today', { status: 200 })
    }

    // Send push notification to each user who hasn't submitted
    let notificationsSent = 0
    let notificationsFailed = 0
    let streakReminders = 0
    let regularReminders = 0
    let newUserReminders = 0

    for (const user of usersWithoutSubmissions) {
      try {
        const token = await getExpoPushTokenForUser(user.user_id)

        if (!token) {
          console.log(`No push token for user ${user.user_id}`)
          continue
        }

        // Check if user has any lifts at all (new user vs returning user)
        const { data: userLifts, error: liftsError } = await supabase
          .from('lifts')
          .select('id')
          .eq('user_id', user.user_id)
          .limit(1)

        if (liftsError) {
          console.error(`Error checking lifts for user ${user.user_id}:`, liftsError)
          notificationsFailed++
          continue
        }

        const hasAnyLifts = userLifts && userLifts.length > 0

        if (!hasAnyLifts) {
          // New user - never submitted any lifts
          await sendExpoPush(
            token,
            "Lets get you started! 💪",
            "Add your first lift and start your journey to achieving your goals without injuries!",
            {
              type: 'new_user_reminder',
              date: todayFormatted,
              isNewUser: true,
            }
          )
          newUserReminders++
          console.log(`Sent new user reminder to user ${user.user_id}`)
        } else {
          // Check if user checked in yesterday (has a streak to maintain)
          const hasYesterdayCheckIn = yesterdayCheckInUserIds.has(user.user_id)

          if (hasYesterdayCheckIn) {
            // User has a streak - send streak reminder
            await sendExpoPush(
              token,
              "Don't lose your streak! 🔥",
              "It's time to analyze your form! Let's keep you going on a roll!",
              {
                type: 'streak_reminder',
                date: todayFormatted,
                hasStreak: true,
              }
            )
            streakReminders++
            console.log(`Sent streak reminder to user ${user.user_id}`)
          } else {
            // Regular reminder
            await sendExpoPush(
              token,
              "Time to analyze your form! 💪",
              "Remember, consistency is the key to achieving your fitness goals and training safely.",
              {
                type: 'daily_reminder',
                date: todayFormatted,
                hasStreak: false,
              }
            )
            regularReminders++
            console.log(`Sent regular reminder to user ${user.user_id}`)
          }
        }

        notificationsSent++
      } catch (e) {
        console.error(`Failed to send notification to user ${user.user_id}:`, e)
        notificationsFailed++
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: todayFormatted,
        yesterdayDate: yesterdayFormatted,
        totalUsers: allUsers?.length || 0,
        usersWithSubmissions: submittedUserIds.size,
        usersWithoutSubmissions: usersWithoutSubmissions.length,
        yesterdayCheckIns: yesterdayCheckInUserIds.size,
        notificationsSent,
        notificationsFailed,
        streakReminders,
        regularReminders,
        newUserReminders,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (e) {
    console.error('Fatal error in check-daily-video-submissions:', e)
    return new Response(
      JSON.stringify({ error: 'internal error', details: String(e) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
