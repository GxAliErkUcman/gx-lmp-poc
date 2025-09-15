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

    const userId = newUser.user.id;

    // The handle_new_user trigger already created a profile and a new client for this user.
    // Promote to admin without creating duplicate profile/clients.
    const { data: existingProfile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, role')
      .eq('user_id', userId)
      .single();

    if (profileFetchError) {
      console.warn('Profile not found right after user creation, creating one manually...', profileFetchError);
      // As a fallback only: create minimal profile without touching client assignment
      const { error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert([{ user_id: userId, first_name: 'GX', last_name: 'Admin', email: 'gx-admin@admin.com', role: 'admin' }]);
      if (insertProfileError) throw insertProfileError;
    } else {
      if (existingProfile.role !== 'admin') {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ role: 'admin' })
          .eq('user_id', userId);
        if (updateError) throw updateError;
      }
    }

    console.log('Admin profile ensured and promoted successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin user created and promoted successfully',
        user: newUser
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