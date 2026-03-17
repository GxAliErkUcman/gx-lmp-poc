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
  role?: 'client_admin' | 'user' | 'store_owner' | 'service_user';
  storeIds?: string[];
  password?: string;
  countryCodes?: string[];
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

    const requestBody = await req.json();

    // --- Input validation ---
    const { email, firstName, lastName, clientId, role, storeIds, password, countryCodes } = requestBody ?? {};

    if (!email || typeof email !== 'string' || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing email address', code: 'invalid_input' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    if (!firstName || typeof firstName !== 'string' || firstName.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing firstName (max 100 chars)', code: 'invalid_input' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    if (!lastName || typeof lastName !== 'string' || lastName.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing lastName (max 100 chars)', code: 'invalid_input' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    if (!clientId || typeof clientId !== 'string' || clientId.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing clientId', code: 'invalid_input' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    const validRoles = ['client_admin', 'user', 'store_owner', 'service_user'];
    if (role !== undefined && (typeof role !== 'string' || !validRoles.includes(role))) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}`, code: 'invalid_input' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    if (storeIds !== undefined && (!Array.isArray(storeIds) || storeIds.some((id: any) => typeof id !== 'string'))) {
      return new Response(
        JSON.stringify({ success: false, error: 'storeIds must be an array of strings', code: 'invalid_input' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    if (password !== undefined && (typeof password !== 'string' || password.length > 128)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid password', code: 'invalid_input' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    if (countryCodes !== undefined && (!Array.isArray(countryCodes) || countryCodes.some((c: any) => typeof c !== 'string' || c.length > 10))) {
      return new Response(
        JSON.stringify({ success: false, error: 'countryCodes must be an array of short strings', code: 'invalid_input' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    // --- End input validation ---

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

    // email, firstName, lastName, role, storeIds, password, countryCodes already destructured above

    console.log('Creating user:', { email, firstName, lastName, clientId, role, storeCount: storeIds?.length || 0, hasPassword: !!password, countryCount: countryCodes?.length || 0 });

    // If password provided (admin-only), require the caller to be an admin
    if (password) {
      if (!hasAdminRole) {
        return new Response(
          JSON.stringify({ success: false, error: 'Only admins can set passwords directly' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      if (password.length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must be at least 6 characters' }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    let newUser;
    let createError;

    if (password) {
      // Create user with password directly (no invite email)
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          client_id: clientId
        },
      });
      newUser = result.data;
      createError = result.error;
    } else {
      // Create user using Supabase's built-in invite functionality
      const result = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          first_name: firstName,
          last_name: lastName,
          client_id: clientId
        },
        redirectTo: `https://gx-lmp.lovable.app/set-password?email=${encodeURIComponent(email)}`
      });
      newUser = result.data;
      createError = result.error;
    }

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

    // Assign client access if service_user
    if (role === 'service_user') {
      const { error: clientAccessError } = await supabaseAdmin
        .from('user_client_access')
        .insert({ user_id: newUserId, client_id: clientId });
      if (clientAccessError) {
        console.error('Error assigning client access:', clientAccessError);
      }
    }

    // Assign country-based access restrictions if provided
    if (countryCodes && countryCodes.length > 0) {
      const countryRows = countryCodes.map((country_code: string) => ({
        user_id: newUserId,
        country_code,
      }));
      const { error: countryAccessError } = await supabaseAdmin
        .from('user_country_access')
        .insert(countryRows);
      if (countryAccessError) {
        console.error('Error assigning country access:', countryAccessError);
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
    
    // Handle specific auth errors with user-friendly messages
    if (error.code === 'email_exists' || error.message?.includes('already been registered')) {
      // NOTE: We intentionally return 200 here to avoid client runtime “blank screen” handling
      // that occurs on non-2xx responses in some environments.
      return new Response(
        JSON.stringify({
          success: false,
          error: 'A user with this email address already exists',
          code: 'email_exists',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
    
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