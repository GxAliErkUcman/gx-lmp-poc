import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    console.log('Scheduled GCP sync started at', new Date().toISOString())

    const { data: files, error: listError } = await supabase.storage
      .from('json-exports')
      .list('', { limit: 1000 })

    if (listError) {
      const msg = `Failed to list files: ${listError.message}`;
      await supabase.from('edge_function_logs').insert({
        function_name: 'scheduled-gcp-sync',
        status: 'error',
        error_message: msg,
        duration_ms: Date.now() - startTime,
      });
      throw new Error(msg)
    }

    if (!files || files.length === 0) {
      await supabase.from('edge_function_logs').insert({
        function_name: 'scheduled-gcp-sync',
        status: 'success',
        response_body: { message: 'No files to sync', synced: 0 },
        duration_ms: Date.now() - startTime,
      });
      return new Response(
        JSON.stringify({ success: true, message: 'No files to sync', synced: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actualFiles = files.filter(f => f.id && f.name && !f.name.endsWith('/'))
    console.log(`Found ${actualFiles.length} files to sync`)

    let syncedCount = 0
    let failedCount = 0
    const errors: string[] = []

    for (const file of actualFiles) {
      try {
        const syncResponse = await fetch(`${supabaseUrl}/functions/v1/sync-to-gcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({
            fileName: file.name,
            bucketName: 'json-exports'
          })
        })

        if (!syncResponse.ok) {
          const errText = await syncResponse.text()
          console.error(`Failed to sync ${file.name}: ${errText}`)
          errors.push(`${file.name}: ${errText}`)
          failedCount++
        } else {
          syncedCount++
          console.log(`Synced: ${file.name}`)
        }
      } catch (error) {
        const msg = (error as Error).message || String(error)
        console.error(`Error syncing ${file.name}: ${msg}`)
        errors.push(`${file.name}: ${msg}`)
        failedCount++
      }
    }

    const summary = `Scheduled GCP sync complete: ${syncedCount} synced, ${failedCount} failed out of ${actualFiles.length} files`
    console.log(summary)

    const responseBody = {
      success: failedCount === 0,
      message: summary,
      synced: syncedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined
    };

    await supabase.from('edge_function_logs').insert({
      function_name: 'scheduled-gcp-sync',
      status: failedCount === 0 ? 'success' : 'error',
      response_body: responseBody,
      error_message: failedCount > 0 ? `${failedCount} files failed to sync: ${errors.join('; ')}` : null,
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scheduled GCP sync error:', error)
    const msg = (error as any)?.message || String(error)
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabase.from('edge_function_logs').insert({
        function_name: 'scheduled-gcp-sync',
        status: 'error',
        error_message: msg,
        duration_ms: Date.now() - startTime,
      });
    } catch (_) { /* ignore */ }
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
