/**
 * Supabase Edge Function: populate-exercise-cache
 * 
 * This function is triggered by pg_cron to populate the MuscleWiki exercise cache.
 * It calls the service endpoint to do the actual work.
 *
 * Environment Variables Required:
 * - ATHLI_API_URL: The URL of the service (e.g., https://api.athli.app)
 * - CACHE_POPULATE_SERVICE_TOKEN: Service token for authentication
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface PopulateResult {
  totalFetched: number
  totalCached: number
  errors: number
}

Deno.serve(async (req) => {
  try {
    // Parse request body
    const body = await req.json().catch(() => ({}))
    const triggeredBy = body.triggered_by || 'manual'

    // Get environment variables
    const apiUrl = Deno.env.get('ATHLI_API_URL') || 'http://localhost:3002'
    const serviceToken = Deno.env.get('CACHE_POPULATE_SERVICE_TOKEN')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!serviceToken) {
      throw new Error('CACHE_POPULATE_SERVICE_TOKEN not configured')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    // Create Supabase client for logging
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create log entry
    const { data: logEntry, error: logError } = await supabase
      .from('musclewiki_cache_population_log')
      .insert({
        status: 'running',
        triggered_by: triggeredBy,
      })
      .select()
      .single()

    if (logError) {
      console.error('Failed to create log entry:', logError)
    }

    const logId = logEntry?.id

    console.log(`Starting exercise cache population (log_id: ${logId}, triggered_by: ${triggeredBy})`)

    // Call the API to populate the cache
    const response = await fetch(`${apiUrl}/api/v1/exercises/cache/populate?batch_size=100`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': serviceToken,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API returned ${response.status}: ${errorText}`)
    }

    const result = await response.json() as { data: PopulateResult }

    console.log('Cache population complete:', result.data)

    // Update log entry with success
    if (logId) {
      await supabase.rpc('complete_exercise_cache_population', {
        p_log_id: logId,
        p_status: 'success',
        p_total_fetched: result.data.totalFetched,
        p_total_cached: result.data.totalCached,
        p_errors: result.data.errors,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cache population complete',
        data: result.data,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Cache population failed:', error)

    // Try to update log entry with failure
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Get the most recent running log entry and mark it failed
        const { data: runningLog } = await supabase
          .from('musclewiki_cache_population_log')
          .select('id')
          .eq('status', 'running')
          .order('started_at', { ascending: false })
          .limit(1)
          .single()

        if (runningLog?.id) {
          await supabase.rpc('complete_exercise_cache_population', {
            p_log_id: runningLog.id,
            p_status: 'failed',
            p_total_fetched: 0,
            p_total_cached: 0,
            p_errors: 1,
            p_error_message: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } catch (logError) {
      console.error('Failed to update log:', logError)
    }

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
