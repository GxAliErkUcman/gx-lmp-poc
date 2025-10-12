import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserRequest {
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the current user and check if they're an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Check if user is admin or client_admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      throw new Error('Failed to fetch user roles');
    }

    const userRoles = roles?.map(r => r.role) || [];
    const isAdmin = userRoles.includes('admin');
    const isClientAdmin = userRoles.includes('client_admin');

    if (!isAdmin && !isClientAdmin) {
      throw new Error('Insufficient permissions');
    }

    const { userId }: DeleteUserRequest = await req.json();

    console.log('Deleting user:', userId);

    // Check the role of the user being deleted
    const { data: targetRoles, error: targetRolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (targetRolesError) {
      throw new Error('Failed to fetch target user roles');
    }

    const targetUserRoles = targetRoles?.map(r => r.role) || [];
    
    // Prevent deletion of service users
    if (targetUserRoles.includes('service_user')) {
      throw new Error('Cannot delete service users');
    }

    // If the requester is a client_admin, verify they can only delete users in their client
    if (isClientAdmin && !isAdmin) {
      const { data: requesterProfile, error: requesterError } = await supabaseAdmin
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      const { data: targetProfile, error: targetError } = await supabaseAdmin
        .from('profiles')
        .select('client_id')
        .eq('user_id', userId)
        .single();

      if (requesterError || targetError || !requesterProfile || !targetProfile) {
        throw new Error('Failed to verify client permissions');
      }

      if (requesterProfile.client_id !== targetProfile.client_id) {
        throw new Error('Cannot delete users from other clients');
      }
    }

    // Delete the user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      throw deleteError;
    }

    console.log('User deleted successfully:', userId);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'User deleted successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);