/**
 * Supabase Edge Function: cleanup-coach-storage
 *
 * Cleans up storage files when a coach account is deleted.
 * Uses the Supabase Storage API (which is the only allowed way to delete storage objects).
 *
 * Called from the handle_coach_account_deletion trigger via pg_net.
 *
 * Request body:
 * - coach_id: UUID of the coach being deleted
 * - conversation_ids: Array of conversation UUIDs for message attachment cleanup
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CleanupRequest {
  coach_id: string
  conversation_ids?: string[]
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const { coach_id, conversation_ids = [] }: CleanupRequest = await req.json()

    if (!coach_id) {
      throw new Error('coach_id is required')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const results: Record<string, { deleted: number; errors: string[] }> = {}

    // Helper function to list and delete files from a bucket with a prefix
    async function cleanupBucket(bucket: string, prefix: string) {
      const bucketResults = { deleted: 0, errors: [] as string[] }

      try {
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list(prefix, { limit: 1000 })

        if (listError) {
          bucketResults.errors.push(`List error: ${listError.message}`)
          return bucketResults
        }

        if (files && files.length > 0) {
          const paths = files.map(f => `${prefix}/${f.name}`)
          const { error: deleteError } = await supabase.storage
            .from(bucket)
            .remove(paths)

          if (deleteError) {
            bucketResults.errors.push(`Delete error: ${deleteError.message}`)
          } else {
            bucketResults.deleted = files.length
          }
        }
      } catch (err) {
        bucketResults.errors.push(`Exception: ${err instanceof Error ? err.message : 'Unknown'}`)
      }

      return bucketResults
    }

    // Helper for regex-pattern cleanup (client_photos, form_files)
    // These have paths like: {client_id}/{coach_id}/...
    async function cleanupBucketByCoachSubfolder(bucket: string) {
      const bucketResults = { deleted: 0, errors: [] as string[] }

      try {
        // List all top-level folders (client IDs)
        const { data: clientFolders, error: listError } = await supabase.storage
          .from(bucket)
          .list('', { limit: 1000 })

        if (listError) {
          bucketResults.errors.push(`List error: ${listError.message}`)
          return bucketResults
        }

        if (clientFolders) {
          for (const folder of clientFolders) {
            if (folder.id === null) continue // Skip if not a folder

            // List files in {client_id}/{coach_id}/
            const { data: coachFiles, error: coachListError } = await supabase.storage
              .from(bucket)
              .list(`${folder.name}/${coach_id}`, { limit: 1000 })

            if (coachListError) continue

            if (coachFiles && coachFiles.length > 0) {
              const paths = coachFiles.map(f => `${folder.name}/${coach_id}/${f.name}`)
              const { error: deleteError } = await supabase.storage
                .from(bucket)
                .remove(paths)

              if (!deleteError) {
                bucketResults.deleted += coachFiles.length
              }
            }
          }
        }
      } catch (err) {
        bucketResults.errors.push(`Exception: ${err instanceof Error ? err.message : 'Unknown'}`)
      }

      return bucketResults
    }

    // 1. Delete coach_files bucket files (path: {coach_id}/...)
    results['coach_files'] = await cleanupBucket('coach_files', coach_id)

    // 2. Delete coach-company bucket files (path: {coach_id}/...)
    results['coach-company'] = await cleanupBucket('coach-company', coach_id)

    // 3. Delete exercise_videos bucket files (path: {coach_id}/...)
    results['exercise_videos'] = await cleanupBucket('exercise_videos', coach_id)

    // 4. Delete profile-pictures bucket files (path: {coach_id}/...)
    results['profile-pictures'] = await cleanupBucket('profile-pictures', coach_id)

    // 5. Delete client_photos for this coach (path: {client_id}/{coach_id}/...)
    results['client_photos'] = await cleanupBucketByCoachSubfolder('client_photos')

    // 6. Delete form_files for this coach (path: {client_id}/{coach_id}/...)
    results['form_files'] = await cleanupBucketByCoachSubfolder('form_files')

    // 7. Delete message_attachments for all coach's conversations
    const msgResults = { deleted: 0, errors: [] as string[] }
    for (const convId of conversation_ids) {
      const convResults = await cleanupBucket('message_attachments', convId)
      msgResults.deleted += convResults.deleted
      msgResults.errors.push(...convResults.errors)
    }
    results['message_attachments'] = msgResults

    const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0)
    const hasErrors = Object.values(results).some(r => r.errors.length > 0)

    console.log(`cleanup-coach-storage for ${coach_id}: ${totalDeleted} files deleted`)

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        coach_id,
        total_deleted: totalDeleted,
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: hasErrors ? 207 : 200, // 207 Multi-Status if partial success
      }
    )
  } catch (error) {
    console.error('cleanup-coach-storage failed:', error)

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
