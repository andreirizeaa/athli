// @ts-ignore - Deno npm specifier resolved at runtime in Supabase Edge
import { createClient } from 'npm:@supabase/supabase-js@2'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Deno: any;

const supabase = createClient(
Deno.env.get("SUPABASE_URL")!,
// Use SERVICE_ROLE_KEY (secrets cannot start with SUPABASE_)
(Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!
);

const corsHeaders = {
"Access-Control-Allow-Origin": "*",
"Access-Control-Allow-Methods": "POST, OPTIONS",
"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
try {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Be flexible about incoming payloads (direct call or auth webhook-like)
  const body = await req.json().catch(() => ({}));
  const userId =
    body.user_id ||
    body?.record?.id ||
    body?.payload?.user?.id ||
    body?.user?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing user_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const BUCKET = "lifts";
  const LIMIT = 1000; // max allowed

  // Recursively collect file keys under userId prefix
  async function listAllFiles(prefix: string): Promise<string[]> {
    const files: string[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(prefix, {
          limit: LIMIT,
          offset,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) {
        throw new Error(`List error at "${prefix}": ${error.message}`);
      }
      if (!data || data.length === 0) break;

      for (const item of data) {
        const key = prefix ? `${prefix}/${item.name}` : item.name;

        // Files have metadata; folders do not
        if (item.metadata) {
          files.push(key);
        } else {
          // Recurse into subfolder
          const deeper = await listAllFiles(key);
          files.push(...deeper);
        }
      }

      if (data.length < LIMIT) break; // no more pages at this level
      offset += LIMIT;
    }

    return files;
  }

  const allPaths = await listAllFiles(userId);

  if (allPaths.length === 0) {
    return new Response(
      JSON.stringify({ message: "No files to delete", deletedCount: 0, userId }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  // Delete in chunks to avoid payload size limits
  const CHUNK = 1000;
  let deleted = 0;

  for (let i = 0; i < allPaths.length; i += CHUNK) {
    const slice = allPaths.slice(i, i + CHUNK);
    const { error: delError } = await supabase.storage.from(BUCKET).remove(slice);
    if (delError) {
      throw new Error(`Delete error: ${delError.message}`);
    }
    deleted += slice.length;
  }

  return new Response(
    JSON.stringify({
      message: `Deleted ${deleted} files for user ${userId}`,
      deletedCount: deleted,
      userId,
    }),
    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
} catch (err) {
  return new Response(JSON.stringify({ error: `Unexpected error: ${String(err)}` }), {
    status: 500,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
});
