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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    console.log('Scheduled GCP sync started at', new Date().toISOString())

    // List all files in json-exports bucket
    const { data: files, error: listError } = await supabase.storage
      .from('json-exports')
      .list('', { limit: 1000 })

    if (listError) {
      throw new Error(`Failed to list files: ${listError.message}`)
    }

    if (!files || files.length === 0) {
      console.log('No files found in json-exports bucket')
      return new Response(
        JSON.stringify({ success: true, message: 'No files to sync', synced: 0, failed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter out folders (only actual files)
    const actualFiles = files.filter(f => f.id && f.name && !f.name.endsWith('/'))
    console.log(`Found ${actualFiles.length} files to sync`)

    let syncedCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Determine client_id from filename for BBraun detection
    // Files are typically named like "{client_name}.json"
    // We need to look up client_id by matching — but sync-to-gcp only needs clientId for BBraun copy
    // So we'll pass it when we can determine it

    for (const file of actualFiles) {
      try {
        // Call the existing sync-to-gcp function
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

    return new Response(
      JSON.stringify({
        success: failedCount === 0,
        message: summary,
        synced: syncedCount,
        failed: failedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Scheduled GCP sync error:', error)
    const msg = (error as any)?.message || String(error)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
