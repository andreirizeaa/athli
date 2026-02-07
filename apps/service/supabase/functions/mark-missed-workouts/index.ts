/**
 * Supabase Edge Function: mark-missed-workouts
 *
 * Marks un-started workouts from past days as 'missed' in client_training_history.
 * Uses the coach's timezone (from coach_preferences) to determine when a day has ended.
 *
 * This is called automatically by pg_cron every hour, but can also be invoked
 * manually for ad-hoc runs or catch-up processing.
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the database function directly
    const { data, error } = await supabase.rpc('mark_missed_workouts')

    if (error) {
      throw new Error(`RPC failed: ${error.message}`)
    }

    const rowsInserted = data as number

    console.log(`mark-missed-workouts: ${rowsInserted} workouts marked as missed`)

    return new Response(
      JSON.stringify({
        success: true,
        rows_inserted: rowsInserted,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('mark-missed-workouts failed:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
