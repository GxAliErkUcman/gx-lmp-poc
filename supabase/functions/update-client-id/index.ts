import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateClientIdRequest {
  currentClientId: string
  newClientId: string
  clientName?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the request body
    const { currentClientId, newClientId, clientName }: UpdateClientIdRequest = await req.json()

    if (!currentClientId || !newClientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: currentClientId and newClientId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Starting client ID update from ${currentClientId} to ${newClientId}`)

    // Check if new client ID already exists
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('id', newClientId)
      .single()

    if (existingClient) {
      return new Response(
        JSON.stringify({ error: 'Client ID already exists' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Start transaction-like operations
    console.log('Step 1: Creating new client with new ID')
    
    // Get current client data
    const { data: currentClient, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', currentClientId)
      .single()

    if (fetchError || !currentClient) {
      throw new Error(`Failed to fetch current client: ${fetchError?.message}`)
    }

    // Create new client with new ID
    const { error: createError } = await supabase
      .from('clients')
      .insert({
        id: newClientId,
        name: clientName || currentClient.name,
        created_at: currentClient.created_at,
        updated_at: new Date().toISOString()
      })

    if (createError) {
      throw new Error(`Failed to create new client: ${createError.message}`)
    }

    console.log('Step 2: Updating profile references')
    
    // Update all profiles that reference the old client ID
    const { error: profilesError } = await supabase
      .from('profiles')
      .update({ client_id: newClientId })
      .eq('client_id', currentClientId)

    if (profilesError) {
      throw new Error(`Failed to update profiles: ${profilesError.message}`)
    }

    console.log('Step 3: Updating business references')
    
    // Update all businesses that reference the old client ID
    const { error: businessesError } = await supabase
      .from('businesses')
      .update({ client_id: newClientId })
      .eq('client_id', currentClientId)

    if (businessesError) {
      throw new Error(`Failed to update businesses: ${businessesError.message}`)
    }

    console.log('Step 4: Cleaning up old JSON export files')
    
    // List and delete old JSON export files
    const { data: files, error: listError } = await supabase.storage
      .from('json-exports')
      .list('', {
        search: currentClientId
      })

    if (listError) {
      console.warn(`Warning: Could not list files for cleanup: ${listError.message}`)
    } else if (files && files.length > 0) {
      const filePaths = files.map(file => file.name)
      console.log(`Found ${filePaths.length} files to delete:`, filePaths)
      
      const { error: deleteError } = await supabase.storage
        .from('json-exports')
        .remove(filePaths)

      if (deleteError) {
        console.warn(`Warning: Could not delete some files: ${deleteError.message}`)
      } else {
        console.log(`Successfully deleted ${filePaths.length} old JSON files`)
      }
    }

    console.log('Step 5: Removing old client record')
    
    // Delete the old client record
    const { error: deleteClientError } = await supabase
      .from('clients')
      .delete()
      .eq('id', currentClientId)

    if (deleteClientError) {
      throw new Error(`Failed to delete old client: ${deleteClientError.message}`)
    }

    console.log('Step 6: Generating new JSON export')
    
    // Generate new JSON export for the new client ID
    try {
      const { error: exportError } = await supabase.functions.invoke('generate-json-export', {
        body: { client_id: newClientId }
      })

      if (exportError) {
        console.warn(`Warning: Could not generate new JSON export: ${exportError.message}`)
      } else {
        console.log('Successfully generated new JSON export')
      }
    } catch (exportErr) {
      console.warn(`Warning: Could not generate new JSON export: ${exportErr}`)
    }

    console.log(`Successfully updated client ID from ${currentClientId} to ${newClientId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Client ID updated successfully',
        newClientId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error updating client ID:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: 'Failed to update client ID'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})