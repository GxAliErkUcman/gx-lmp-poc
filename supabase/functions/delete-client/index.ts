import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { clientId, deleteUsers } = await req.json();

    if (!clientId) {
      throw new Error('Client ID is required');
    }

    console.log(`Deleting client ${clientId}, deleteUsers: ${deleteUsers}`);

    // Get client info first
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();

    if (clientError) throw clientError;

    if (deleteUsers) {
      // Get all users associated with this client
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('client_id', clientId);

      if (profilesError) throw profilesError;

      // Delete users from auth (this will cascade delete profiles via trigger)
      for (const profile of profiles || []) {
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(profile.user_id);
        if (deleteUserError) {
          console.warn(`Failed to delete user ${profile.user_id}:`, deleteUserError);
        }
      }
    } else {
      // Just update profiles to remove client association
      const { error: updateProfilesError } = await supabaseAdmin
        .from('profiles')
        .update({ client_id: null })
        .eq('client_id', clientId);

      if (updateProfilesError) throw updateProfilesError;
    }

    // Delete all businesses associated with this client
    const { error: deleteBusinessesError } = await supabaseAdmin
      .from('businesses')
      .delete()
      .eq('client_id', clientId);

    if (deleteBusinessesError) throw deleteBusinessesError;

    // Finally, delete the client
    const { error: deleteClientError } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (deleteClientError) throw deleteClientError;

    console.log(`Client ${client.name} deleted successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Client ${client.name} deleted successfully`,
        deletedUsers: deleteUsers
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error('Error in delete-client function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);