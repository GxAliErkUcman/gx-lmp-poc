import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManualExportRequest {
  userId: string;
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

    // Check if user has admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }

    const { userId }: ManualExportRequest = await req.json();

    console.log('Manual JSON export requested for user:', userId);

    // Fetch businesses for the specified user
    const { data: businesses, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (fetchError) {
      console.error('Error fetching businesses:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${businesses?.length || 0} active businesses for user ${userId}`);

    // Validate businesses using the same logic as automatic export
    const validBusinesses = businesses?.filter(business => {
      return business.businessName && 
             business.addressLine1 && 
             business.country && 
             business.primaryCategory;
    }) || [];

    console.log(`${validBusinesses.length} businesses passed validation`);

    // Generate JSON export
    const exportData = {
      exportDate: new Date().toISOString(),
      userId: userId,
      exportType: 'manual',
      totalBusinesses: validBusinesses.length,
      businesses: validBusinesses.map(business => ({
        storeCode: business.storeCode,
        businessName: business.businessName,
        addressLine1: business.addressLine1,
        addressLine2: business.addressLine2,
        addressLine3: business.addressLine3,
        addressLine4: business.addressLine4,
        addressLine5: business.addressLine5,
        city: business.city,
        state: business.state,
        postalCode: business.postalCode,
        country: business.country,
        primaryCategory: business.primaryCategory,
        additionalCategories: business.additionalCategories,
        primaryPhone: business.primaryPhone,
        website: business.website,
        latitude: business.latitude,
        longitude: business.longitude,
        mondayHours: business.mondayHours,
        tuesdayHours: business.tuesdayHours,
        wednesdayHours: business.wednesdayHours,
        thursdayHours: business.thursdayHours,
        fridayHours: business.fridayHours,
        saturdayHours: business.saturdayHours,
        sundayHours: business.sundayHours,
        logoPhoto: business.logoPhoto,
        coverPhoto: business.coverPhoto,
        otherPhotos: business.otherPhotos,
        status: business.status,
        updatedAt: business.updated_at
      }))
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `manualexport-${userId}-businesses.json`;

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('json-exports')
      .upload(fileName, jsonString, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading manual export:', uploadError);
      throw uploadError;
    }

    console.log(`Manual export uploaded successfully: ${fileName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName: fileName,
        businessCount: validBusinesses.length,
        message: 'Manual export generated successfully' 
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
    console.error('Error in manual-json-export function:', error);
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