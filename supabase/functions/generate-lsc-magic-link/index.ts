import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, client_id, email, first_name, last_name } = await req.json();

    console.log('LSC Magic Link request received for email:', email, 'client_id:', client_id);

    // Step 1: Verify API key
    const LSC_API_KEY = Deno.env.get('LSC_API_KEY');
    if (!LSC_API_KEY || api_key !== LSC_API_KEY) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!client_id || !email) {
      console.error('Missing required fields - client_id:', client_id, 'email:', email);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: client_id and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Step 2: Validate client exists
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', client_id)
      .single();

    if (clientError || !clientData) {
      console.error('Client not found:', client_id, clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Client validated:', clientData.name);

    // Step 3: Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing users' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let userId: string;

    if (existingUser) {
      // User exists - verify they belong to this client
      console.log('Existing user found:', existingUser.id);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', existingUser.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify user client' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (profile.client_id !== client_id) {
        console.error('User belongs to different client. User client:', profile.client_id, 'Requested client:', client_id);
        return new Response(
          JSON.stringify({ error: 'User belongs to a different client' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = existingUser.id;
      console.log('User verified for client:', client_id);
    } else {
      // User doesn't exist - create new user
      console.log('Creating new user for email:', email);

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true, // Auto-confirm email since LSC already verified
        user_metadata: {
          first_name: first_name || '',
          last_name: last_name || '',
          client_id: client_id
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user: ' + createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      console.log('New user created:', userId);

      // The handle_new_user trigger will create the profile automatically
      // But we need to add the user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'user'
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
        // Don't fail the request, user is created
      } else {
        console.log('User role assigned: user');
      }
    }

    // Step 4: Generate magic link
    const redirectUrl = `${req.headers.get('origin') || 'https://gx-lmp.lovable.app'}/client-dashboard`;
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate magic link: ' + linkError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Magic link generated successfully for user:', userId);

    // Return the magic link
    return new Response(
      JSON.stringify({ 
        magic_link: linkData.properties.action_link,
        user_id: userId,
        is_new_user: !existingUser
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in generate-lsc-magic-link:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
