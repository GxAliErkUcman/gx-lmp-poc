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
  role?: 'client_admin' | 'user' | 'store_owner';
  storeIds?: string[];
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

    // Verify the request is from an authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin, service_user, or client_admin role
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasAdminRole = userRoles?.some(r => r.role === 'admin');
    const hasServiceUserRole = userRoles?.some(r => r.role === 'service_user');
    const hasClientAdminRole = userRoles?.some(r => r.role === 'client_admin');

    if (!hasAdminRole && !hasServiceUserRole && !hasClientAdminRole) {
      throw new Error('Insufficient permissions');
    }

    const requestBody: CreateUserRequest = await req.json();
    const { clientId } = requestBody;

    // If service_user, verify they have access to this client
    if (hasServiceUserRole && !hasAdminRole) {
      const { data: clientAccess } = await supabaseAdmin
        .from('user_client_access')
        .select('client_id')
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .maybeSingle();

      if (!clientAccess) {
        throw new Error('Cannot create users for clients you do not have access to');
      }
    }

    // If client_admin, verify they are creating user for their own client
    if (hasClientAdminRole && !hasAdminRole && !hasServiceUserRole) {
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      if (!adminProfile || adminProfile.client_id !== clientId) {
        throw new Error('Cannot create users for other clients');
      }
    }

    const { email, firstName, lastName, role, storeIds } = requestBody;

    console.log('Creating user:', { email, firstName, lastName, clientId, role, storeCount: storeIds?.length || 0 });

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

    const newUserId = newUser.user?.id;
    if (!newUserId) {
      throw new Error('User ID missing after invite');
    }

    // Ensure profile exists (insert if missing)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('user_id', newUserId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileInsertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUserId,
          first_name: firstName,
          last_name: lastName,
          email,
          client_id: clientId,
        });
      if (profileInsertError) {
        console.error('Error creating profile:', profileInsertError);
      }
    }

    // Assign role if provided
    if (role) {
      const { error: roleInsertError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: newUserId, role });
      if (roleInsertError) {
        console.error('Error assigning role:', roleInsertError);
      }
    }

    // Assign store access if owner with storeIds
    if (role === 'store_owner' && storeIds && storeIds.length > 0) {
      const accessRows = storeIds.map((business_id) => ({ user_id: newUserId, business_id }));
      const { error: accessError } = await supabaseAdmin
        .from('store_owner_access')
        .insert(accessRows, { defaultToNull: false });
      if (accessError) {
        console.error('Error assigning store access:', accessError);
      }
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