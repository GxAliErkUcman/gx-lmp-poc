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

    console.log('Creating admin user...');

    // Create admin user
    const { data: adminUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@gx-admin.com',
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

    console.log('Admin user created:', adminUser);

    // Create admin profile with admin role and assign to GX Admin client
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: adminUser.user.id,
        first_name: 'GX',
        last_name: 'Admin',
        email: 'admin@gx-admin.com',
        role: 'admin',
        client_id: '00000000-0000-0000-0000-000000000001' // GX Admin client ID
      });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      throw profileError;
    }

    console.log('Admin profile created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: adminUser,
        message: 'Admin user created successfully' 
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