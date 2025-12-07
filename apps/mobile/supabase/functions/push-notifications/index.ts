// @ts-ignore - Deno npm specifier resolved at runtime in Supabase Edge
import { createClient } from 'npm:@supabase/supabase-js@2'
// This file runs in Supabase Edge (Deno). The following helps editors that don't know Deno types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

interface WebhookPayload<T> {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: 'public'
  record: T
  old_record: T | null
}

interface LiftsRecord {
  id: string
  user_id: string
  asset_id?: string
}

interface JobsRecord {
  id: string
  user_id: string
  status: string
}

interface LiftFailureRecord {
  id: string
  user_id: string
  lift_id: string
  asset_id: string
  created_at?: string
  error: string
  message?: string | null
  reason?: string | null
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  // Use SERVICE_ROLE_KEY (secrets cannot start with SUPABASE_)
  (Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))!
)

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

async function sendExpoPush(to: string, body: string, title = 'FormAI', data?: Record<string, unknown>) {
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN')
  const payload = {
    to,
    sound: 'default',
    title,
    body,
    ...(data ? { data } : {}),
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  const json = await res.json()
  return json
}

Deno.addSignalListener?.('SIGTERM', () => {})

function capitalize(word: string): string {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1)
}

interface FailureTemplateContext {
  movementName?: string
}

const failureNotificationTemplates: Record<string, (ctx: FailureTemplateContext) => { title: string; body: string }> = {
  NO_GYM_VIDEO_FOUND: () => {
    return {
      title: `No lift in video`,
      body: `Your analysis failed as we cannot find a lift in the video. Please upload a video with an exercise.`,
    }
  },
  WRONG_MOVEMENT: () => {
    return {
      title: 'Lift mismatch during analysis',
      body: `Please ensure you select the right movement type when analysing a video.`,
    }
  },
  ERROR_OCCURED: () => ({
    title: 'Lift analysis failed',
    body: 'An error occured. Please retry the analysis again',
  }),
}

function buildFailureNotification(errorCode: string, ctx: FailureTemplateContext): { title: string; body: string } {
  const template = failureNotificationTemplates[errorCode]
  if (template) return template(ctx)
  const title = ctx.movementName ? `Your ${capitalize(ctx.movementName)} analysis has failed` : 'Lift analysis failed'
  return { title, body: 'An error occurred analyzing your lift' }
}

async function getLiftMeta(liftId: string, userId?: string): Promise<{ movementName?: string; accuracy?: number }> {
  try {
    const { data } = await (
      userId
        ? supabase
            .from('lifts')
            .select('lift_type, analysis')
            .eq('id', liftId)
            .eq('user_id', userId)
            .maybeSingle()
        : supabase
            .from('lifts')
            .select('lift_type, analysis')
            .eq('id', liftId)
            .maybeSingle()
    )

    const movementRaw = (data as any)?.lift_type
    const movementName = typeof movementRaw === 'string' ? movementRaw : undefined

    const analysis = (data as any)?.analysis
    let accuracy: number | undefined
    if (analysis) {
      const acc = (analysis as any).accuracy
      if (typeof acc === 'number') accuracy = acc
      else if (typeof acc === 'string') {
        const n = Number(acc)
        if (!Number.isNaN(n)) accuracy = n
      }
    }
    return { movementName, accuracy }
  } catch {
    return {}
  }
}

Deno.serve(async (req: Request) => {
  try {
    const payload = (await req.json()) as WebhookPayload<any>

    if (payload.table === 'lifts' && payload.type === 'INSERT') {
      const record = payload.record as LiftsRecord
      const token = await getExpoPushTokenForUser(record.user_id)
      if (token) {
        const { movementName, accuracy } = await getLiftMeta(record.id)
        const title = movementName
          ? `Your ${capitalize(movementName)} analysis is ready! 🥳`
          : 'Your lift analysis is ready! 🥳'
        const score = typeof accuracy === 'number' ? Math.round(accuracy) : undefined
        const body = score !== undefined
          ? `It\'s time to view your feedback. You achieved an accuracy score of ${score}%.`
          : `It\'s time to view your feedback.`
        const result = await sendExpoPush(token, body, title, {
          type: 'lift_ready',
          liftId: record.id,
          ...(record.asset_id && { assetId: record.asset_id })
        })
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ ok: true, reason: 'no token' }), { headers: { 'Content-Type': 'application/json' } })
    }

    if (payload.table === 'jobs' && (payload.type === 'INSERT' || payload.type === 'UPDATE')) {
      const record = payload.record as JobsRecord
      if (record.status?.toLowerCase() === 'failed') {
        const token = await getExpoPushTokenForUser(record.user_id)
        if (token) {
          const result = await sendExpoPush(token, 'Lift analysis failed and requires a restart', 'Lift Failed')
          return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
        }
        return new Response(JSON.stringify({ ok: true, reason: 'no token' }), { headers: { 'Content-Type': 'application/json' } })
      }
    }

    // Lift failure notifications (structured templates)
    if (payload.table === 'lift_failures' && payload.type === 'INSERT') {
      const record = payload.record as LiftFailureRecord
      const token = await getExpoPushTokenForUser(record.user_id)
      if (token) {
        const { movementName } = record.lift_id ? await getLiftMeta(record.lift_id, record.user_id) : {}
        const { title, body } = buildFailureNotification(record.error, { movementName })
        const result = await sendExpoPush(token, body, title, {
          type: 'lift_failed',
          liftId: record.lift_id,
          failureId: record.id,
          error: record.error,
          assetId: record.asset_id,
        })
        return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ ok: true, reason: 'no token' }), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})


