/**
 * Supabase Edge Function: cleanup-client-storage
 *
 * Cleans up storage files when a client account is deleted.
 * Uses the Supabase Storage API (which is the only allowed way to delete storage objects).
 *
 * Called from the handle_client_account_deletion trigger via pg_net.
 *
 * Request body:
 * - client_id: UUID of the client being deleted
 *
 * Environment Variables Required:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CleanupRequest {
  client_id: string
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured')
    }

    const { client_id }: CleanupRequest = await req.json()

    if (!client_id) {
      throw new Error('client_id is required')
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

    // Helper to recursively delete all files in a folder
    async function cleanupBucketRecursive(bucket: string, prefix: string) {
      const bucketResults = { deleted: 0, errors: [] as string[] }

      try {
        const { data: items, error: listError } = await supabase.storage
          .from(bucket)
          .list(prefix, { limit: 1000 })

        if (listError) {
          bucketResults.errors.push(`List error: ${listError.message}`)
          return bucketResults
        }

        if (items && items.length > 0) {
          // Separate files and folders
          const files = items.filter(item => item.id !== null)
          const folders = items.filter(item => item.id === null)

          // Delete files
          if (files.length > 0) {
            const paths = files.map(f => `${prefix}/${f.name}`)
            const { error: deleteError } = await supabase.storage
              .from(bucket)
              .remove(paths)

            if (deleteError) {
              bucketResults.errors.push(`Delete error: ${deleteError.message}`)
            } else {
              bucketResults.deleted += files.length
            }
          }

          // Recursively clean up folders
          for (const folder of folders) {
            const subResults = await cleanupBucketRecursive(bucket, `${prefix}/${folder.name}`)
            bucketResults.deleted += subResults.deleted
            bucketResults.errors.push(...subResults.errors)
          }
        }
      } catch (err) {
        bucketResults.errors.push(`Exception: ${err instanceof Error ? err.message : 'Unknown'}`)
      }

      return bucketResults
    }

    // 1. Delete client_photos for this client (path: {client_id}/...)
    results['client_photos'] = await cleanupBucketRecursive('client_photos', client_id)

    // 2. Delete form_files for this client (path: {client_id}/...)
    results['form_files'] = await cleanupBucketRecursive('form_files', client_id)

    // 3. Delete profile-pictures for this client (path: {client_id}/...)
    results['profile-pictures'] = await cleanupBucket('profile-pictures', client_id)

    const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0)
    const hasErrors = Object.values(results).some(r => r.errors.length > 0)

    console.log(`cleanup-client-storage for ${client_id}: ${totalDeleted} files deleted`)

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        client_id,
        total_deleted: totalDeleted,
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: hasErrors ? 207 : 200,
      }
    )
  } catch (error) {
    console.error('cleanup-client-storage failed:', error)

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
