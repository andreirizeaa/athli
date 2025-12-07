// supabase/functions/resend-webhook/index.ts
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2"

declare const Deno: any

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 })
    }

    const rawBody = await req.text()

    let body: any
    try {
      body = JSON.parse(rawBody)
    } catch {
      console.error("Failed to parse JSON body:", rawBody)
      return new Response("bad request", { status: 400 })
    }

    const type = body.type
    const email = body.data?.to ?? null

    if (type === "email.bounced" && email) {

      const { error } = await supabase
        .from("users")
        .update({ email_valid: false })
        .eq("email", email)
    }

    return new Response("ok", { status: 200 })
  } catch (e) {
    console.error("Resend webhook error:", e)
    return new Response("internal error", { status: 500 })
  }
})
