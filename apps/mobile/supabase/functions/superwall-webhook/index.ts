// supabase/functions/superwall-webhook/index.ts
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2"
declare const Deno: any

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const SW_SECRET = Deno.env.get("SUPERWALL_WEBHOOK_SECRET")

// --- Helpers ---
function extractUserId(originalAppUserId?: string | null): string | null {
  if (!originalAppUserId || typeof originalAppUserId !== "string") return null
  // Superwall may prefix the id with "$SuperwallAlias:"
  return originalAppUserId.startsWith("$SuperwallAlias:")
    ? originalAppUserId.split(":").slice(1).join(":") // keep everything after the first colon
    : originalAppUserId
}

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

    // Optional: simple bearer header auth (add this header from Superwall dashboard)
    if (SW_SECRET) {
      const auth = req.headers.get("authorization")
      if (auth !== `Bearer ${SW_SECRET}`) {
        return new Response("unauthorized", { status: 401 })
      }
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") return new Response("bad request", { status: 400 })

    // Superwall payload shape: see docs
    // https://superwall.com/docs/dashboard/dashboard-integrations/integrations-webhooks
    const top = body as any
    const evt = top.data ?? {}
    const name = (evt.name as string | undefined) ?? (top.type as string | undefined) // prefer data.name
    const periodType = evt.periodType as string | undefined
    const expirationAt = evt.expirationAt as number | string | undefined
    const ts = (evt.ts ?? top.timestamp ?? evt.purchasedAt) as number | string | undefined
    const rawAppUserId = (evt.originalAppUserId as string | undefined) ?? null
    const app_user_id = extractUserId(rawAppUserId)
    const cancelReason = evt.cancelReason as string | undefined
    const productId = evt.productId as string | undefined

    // ---- 1) Trial start → reminder 24h before expiry ----
    if (name === "initial_purchase" && periodType === "TRIAL" && expirationAt && app_user_id) {
      const expireMs = Number(expirationAt)
      if (Number.isFinite(expireMs)) {
        const sendAt = new Date(expireMs - 24 * 60 * 60 * 1000)
        const token = await getExpoPushTokenForUser(app_user_id)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: app_user_id,
            expo_push_token: token,
            payload: {
              type: "trial_reminder",
              title: "Your free trial is ending tomorrow.",
              body: "We'd appreciate if you could give us a review!",
              data: { action: "open_store_review" }
            },
            send_at: sendAt,
          })
          if (error) console.error("subscription_notifications_queue insert error:", error)
        }
      }
    }

    // ---- 2) Renewal (NORMAL) → thank-you push (2 minutes after event) ----
    if (name === "renewal" && periodType === "NORMAL" && app_user_id && ts) {
      const eventMs = Number(ts)
      if (Number.isFinite(eventMs)) {
        const sendAt = new Date(eventMs + 2 * 60 * 1000)
        const token = await getExpoPushTokenForUser(app_user_id)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: app_user_id,
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

    // ---- 3) Cancellation → goodbye push (2 minutes after event) ----
    if (name === "cancellation" && app_user_id && ts) {
      const eventMs = Number(ts)
      if (Number.isFinite(eventMs)) {
        const sendAt = new Date(eventMs + 2 * 60 * 1000)
        const token = await getExpoPushTokenForUser(app_user_id)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: app_user_id,
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

    // ---- 4) Non-renewing purchase → active push (2 minutes after purchase) ----
    if (name === "non_renewing_purchase" && app_user_id && ts) {
      const eventMs = Number(ts)
      if (Number.isFinite(eventMs)) {
        const sendAt = new Date(eventMs + 2 * 60 * 1000)
        const token = await getExpoPushTokenForUser(app_user_id)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: app_user_id,
            expo_push_token: token,
            payload: {
              type: "non_renewing_purchase",
              title: "HD videos are actived! 🥳",
              body: "Your videos will now remain the same high quality as in your library!",
              product_id: productId,
            },
            send_at: sendAt,
          })
          if (error) console.error("subscription_notifications_queue insert error:", error)
        }
      }
    }

    // ---- 5) Initial purchase (NON-TRIAL) → welcome push (2 minutes after event) ----
    if (name === "initial_purchase" && periodType !== "TRIAL" && app_user_id && ts) {
      const eventMs = Number(ts)
      if (Number.isFinite(eventMs)) {
        const sendAt = new Date(eventMs + 2 * 60 * 1000)
        const token = await getExpoPushTokenForUser(app_user_id)
        if (token) {
          const { error } = await supabase.from("subscription_notifications_queue").insert({
            user_id: app_user_id,
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

    return new Response("ok", { status: 200 })
  } catch (e) {
    console.error("Webhook fatal:", e)
    return new Response("internal error", { status: 500 })
  }
})
