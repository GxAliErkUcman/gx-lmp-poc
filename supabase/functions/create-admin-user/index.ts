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

    console.log('Creating admin user GX-Admin');

    // Create admin user with specific credentials
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'gx-admin@admin.com',
      password: '495185Erk',
      email_confirm: true,
      user_metadata: {
        first_name: 'GX',
        last_name: 'Admin'
      }
    });

    if (createError) {
      console.error('Error creating admin user:', createError);
      throw createError;
    }

    console.log('Admin user created successfully:', newUser);

    // Check if GX Admin client exists, if not create it
    let { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('name', 'GX Admin')
      .single();

    let clientId;
    if (!existingClient) {
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert([{ name: 'GX Admin' }])
        .select('id')
        .single();

      if (clientError) {
        console.error('Error creating GX Admin client:', clientError);
        throw clientError;
      }
      clientId = newClient.id;
    } else {
      clientId = existingClient.id;
    }

    // Create admin profile manually (bypassing the trigger to set specific role and client)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        user_id: newUser.user.id,
        first_name: 'GX',
        last_name: 'Admin',
        email: 'gx-admin@admin.com',
        role: 'admin',
        client_id: clientId
      }]);

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      throw profileError;
    }

    console.log('Admin profile created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created successfully',
        user: newUser,
        clientId: clientId
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
    console.error('Error in create-admin-user function:', error);
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