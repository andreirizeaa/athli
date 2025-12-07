// supabase/functions/send-due-notifications/index.ts
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2"
declare const Deno: any

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

// --- Inline helper for sending Expo push ---
async function sendExpoPush(
  to: string,
  body: string,
  title = "FormAI",
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

// --- Inline helper for sending email via Resend ---
async function sendEmail(to: string, subject: string, text: string) {
  if (!RESEND_API_KEY) {
    console.error("No RESEND_API_KEY set")
    return
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Form AI <support@useformai.com>",
      reply_to: "support@useformai.com",
      to: [to],
      subject,
      text,
    }),
  })

  const txt = await res.text()
  return txt
}

// --- Email template generator ---
function buildEmailTemplate(type: string, fullName?: string | null) {
  const greeting = fullName ? `Hey ${fullName},` : "Hi there,"

  switch (type) {
    case "trial_reminder":
      return {
        subject: "Your Form AI free trial is ending tomorrow",
        body: `${greeting}

Just a reminder that your Form AI free trial is due to end tomorrow!

Thank you for using our app!

The Form AI team.`,
      }
    case "renewal":
      return {
        subject: "Thanks for renewing your subscription!",
        body: `${greeting}

Thanks for renewing your Form AI subscription. You now have full access to all features!

We appreciate your support.

The Form AI team.`,
      }
    case "cancellation":
      return {
        subject: "We are sad to see you leave!",
        body: `${greeting}

We are sorry to see you leave! We appreciate your download and use.

If there was anything wrong with our app or items that were not to your liking, please feel free to reply to this email and we will try our best to help!

Once again, thank you for using our app,

The Form AI team.`,
      }
    case "non_renewing_purchase":
      return {
        subject: "Awesome! Form AI HD Video analysis is now active!",
        body: `${greeting}

We first just want to say thank you for using our app! If you have any feedback, please feel free to reply to this email and we will do our best to help!

Thank you for purchasing HD Videos! High quality analysis is now active for all your new lifts moving forward!

Thanks,
The Form AI team.`,
      }
    case "initial_purchase":
      return {
        subject: "Welcome to Form AI!",
        body: `${greeting}

Welcome! Your Form AI subscription is now active. You can start enjoying full access to all our features immediately.

We’re excited to have you onboard!

The Form AI team.`,
      }
    default:
      return null
  }
}

Deno.serve(async () => {
  try {
    const now = new Date().toISOString()

    const { data: due, error } = await supabase
      .from("subscription_notifications_queue")
      .select("*, user:users(email, full_name, email_valid)")
      .lte("send_at", now)
      .is("sent_at", null)

    if (error) {
      console.error("DB query error:", error)
      return new Response("db error", { status: 500 })
    }

    if (!due?.length) {
      return new Response("no due notifications", { status: 200 })
    }

    for (const n of due) {
      try {

        // Push notification
        await sendExpoPush(n.expo_push_token, n.payload.body, n.payload.title, n.payload)

        // Email notification (only if valid)
        if (n.user?.email && n.user?.email_valid !== false) {
          const template = buildEmailTemplate(n.payload?.type, n.user?.full_name)
          if (template) {
            await sendEmail(n.user.email, template.subject, template.body)
          } else {
          }
        }

        // Mark as sent
        await supabase
          .from("subscription_notifications_queue")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", n.id)
      } catch (e) {
        console.error("Push/email failed for user", n.user_id, e)
      }
    }

    return new Response("done", { status: 200 })
  } catch (e) {
    console.error("Fatal error in send-due-notifications:", e)
    return new Response("internal error", { status: 500 })
  }
})
