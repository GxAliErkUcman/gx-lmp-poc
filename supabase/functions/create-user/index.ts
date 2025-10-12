import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  clientId: string;
}

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

    // Verify the request is from an authenticated admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin or client_admin role
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAdminRole = userRoles?.some(r => r.role === 'admin');
    const hasClientAdminRole = userRoles?.some(r => r.role === 'client_admin');

    if (!hasAdminRole && !hasClientAdminRole) {
      throw new Error('Insufficient permissions');
    }

    // If client_admin, verify they are creating user for their own client
    if (hasClientAdminRole && !hasAdminRole) {
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      const requestedClientId = (await req.clone().json()).clientId;

      if (!adminProfile || adminProfile.client_id !== requestedClientId) {
        throw new Error('Cannot create users for other clients');
      }
    }

    const { email, firstName, lastName, clientId }: CreateUserRequest = await req.json();

    console.log('Creating user:', { email, firstName, lastName, clientId });

    // Create user using Supabase's built-in invite functionality
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName,
        last_name: lastName,
        client_id: clientId
      },
      redirectTo: `https://gx-lmp.lovable.app/set-password?email=${encodeURIComponent(email)}`
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('User created successfully:', newUser);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: newUser,
        message: 'User invitation sent successfully' 
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
    console.error('Error in create-user function:', error);
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