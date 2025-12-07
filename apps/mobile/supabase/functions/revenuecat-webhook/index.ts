// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2"

declare const Deno: any

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const SUPERWALL_SECRET = Deno.env.get("SUPERWALL_WEBHOOK_SECRET")

// --- Helper: get Expo push token from user_notifications ---
async function getExpoPushTokenForUser(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_notifications")
    .select("expo_push_notification")
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !data) return null
  return (data as any)?.expo_push_notification ?? null
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "GET") return new Response("ok", { status: 200 })
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 })

    if (SUPERWALL_SECRET) {
      const auth = req.headers.get("authorization")
      if (auth !== `Bearer ${SUPERWALL_SECRET}`) {
        return new Response("unauthorized", { status: 401 })
      }
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return new Response("bad request", { status: 400 })

    const event = body as any
    const type = event.type as string | undefined
    const data = event.data as any
    const appUserId = data?.originalAppUserId as string | undefined
    const expirationAt = data?.expirationAt as number | undefined
    const purchasedAt = data?.purchasedAt as number | undefined
    const cancelReason = data?.cancelReason as string | undefined
    const productId = data?.productId as string | undefined
    const periodType = data?.periodType as string | undefined
    const isTrialConversion = data?.isTrialConversion as boolean | undefined

    if (!appUserId) {
      console.log("No app user ID found in webhook payload")
      return new Response("ok", { status: 200 })
    }

    // 1. Trial start → schedule reminder 24h before expiry
    if (type === "trial_started" && periodType === "TRIAL" && expirationAt) {
    //   handle by superwall
    //   const expireMs = Number(expirationAt)
    //   if (Number.isFinite(expireMs)) {
    //     const sendAt = new Date(expireMs - 24 * 60 * 60 * 1000)
    //     const token = await getExpoPushTokenForUser(appUserId)
    //     if (token) {
    //       const { error } = await supabase.from("subscription_notifications_queue").insert({
    //         user_id: appUserId,
    //         expo_push_token: token,
    //         payload: {
    //           type: "trial_reminder",
    //           title: "Your free trial is ending tomorrow.",
    //           body: "We'd appreciate if you could give us a review!",
    //           data: { action: "open_store_review" }
    //         },
    //         send_at: sendAt,
    //       })
    //       if (error) console.error("subscription_notifications_queue insert error:", error)
    //     }
    //   }
    }

    // 2. Renewal → schedule a thank-you push (2 minutes after purchase)
    if (type === "renewal" && periodType === "NORMAL" && purchasedAt) {
      const eventMs = Number(purchasedAt)
      if (Number.isFinite(eventMs)) {
        const sendAt = new Date(eventMs + 2 * 60 * 1000)
        const token = await getExpoPushTokenForUser(appUserId)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: appUserId,
            expo_push_token: token,
            payload: {
              type: "renewal",
              title: "You're renewed to Form AI! 🥳",
              body: "Thanks for subscribing! You now have full access.",
            },
            send_at: sendAt,
          })
          if (error) console.error("subscription_notifications_queue insert error:", error)
        }
      }
    }

    // 3. Cancellation → schedule goodbye push (2 minutes after event)
    if (type === "cancellation" && purchasedAt) {
      const eventMs = Number(purchasedAt)
      if (Number.isFinite(eventMs)) {
        const sendAt = new Date(eventMs + 2 * 60 * 1000)
        const token = await getExpoPushTokenForUser(appUserId)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: appUserId,
            expo_push_token: token,
            payload: {
              type: "cancellation",
              title: "We're sorry to see you go. 🙁",
              body: "Please let us know why you are cancelling so we can improve!",
              data: { action: "open_cancellation_email" },
              ...(cancelReason ? { reason: cancelReason } : {}),
            },
            send_at: sendAt,
          })
          if (error) console.error("subscription_notifications_queue insert error:", error)
        }
      }
    }

    // 4. Non-renewing purchase → schedule active push (2 minutes after purchase)
    if (type === "non_renewing_purchase" && purchasedAt) {
      const eventMs = Number(purchasedAt)
      if (Number.isFinite(eventMs)) {
        const sendAt = new Date(eventMs + 2 * 60 * 1000)
        const token = await getExpoPushTokenForUser(appUserId)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: appUserId,
            expo_push_token: token,
            payload: {
              type: "non_renewing_purchase",
              title: "HD videos are activated! 🥳",
              body: "Your videos will now remain the same high quality as in your library!",
              product_id: productId,
            },
            send_at: sendAt,
          })
          if (error) console.error("subscription_notifications_queue insert error:", error)
        }
      }
    }

    // 5. Initial purchase (non-trial) → schedule welcome push (2 minutes after purchase)
    if (type === "initial_purchase" && periodType !== "TRIAL" && purchasedAt) {
      const eventMs = Number(purchasedAt)
      if (Number.isFinite(eventMs)) {
        const sendAt = new Date(eventMs + 2 * 60 * 1000)
        const token = await getExpoPushTokenForUser(appUserId)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: appUserId,
            expo_push_token: token,
            payload: {
              type: "initial_purchase",
              title: "Welcome to Form AI! 🥳",
              body: "Your subscription is now active.",
            },
            send_at: sendAt,
          })
          if (error) console.error("subscription_notifications_queue insert error:", error)
        }
      }
    }

    // 6. Trial conversion → schedule conversion celebration (2 minutes after purchase)
    if (type === "trial_converted" && purchasedAt) {
      const eventMs = Number(purchasedAt)
      if (Number.isFinite(eventMs)) {
        const sendAt = new Date(eventMs + 2 * 60 * 1000)
        const token = await getExpoPushTokenForUser(appUserId)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: appUserId,
            expo_push_token: token,
            payload: {
              type: "trial_conversion",
              title: "Welcome to Form AI! 🎉",
              body: "Thanks for converting your trial! You now have full access.",
            },
            send_at: sendAt,
          })
          if (error) console.error("subscription_notifications_queue insert error:", error)
        }
      }
    }

    return new Response("ok", { status: 200 })
  } catch (e) {
    console.error("Webhook fatal:", e)
    return new Response("internal error", { status: 500 })
  }
})
