import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManualExportRequest {
  clientId: string;
}

// Client IDs that should include goldmine in export
const GOLDMINE_ENABLED_CLIENTS = [
  '75d14738-25d0-4c40-9921-bde980bc8e06' // Porsche Test
];

// Parse goldmine string - if it has "Key: Value" format, parse it; otherwise use empty key
function parseGoldmine(goldmine: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  if (!goldmine || !goldmine.trim()) {
    return result;
  }

  // Check if it has "Key: Value" format (contains colon with text before it)
  const hasKeyValueFormat = goldmine.includes(':') && goldmine.indexOf(':') > 0;
  
  if (hasKeyValueFormat) {
    // Split by semicolon and process each pair
    const pairs = goldmine.split(';');
    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();
        if (key) {
          result[key] = value;
        }
      }
    }
  } else {
    // No key-value format - use empty string key (no wrapper)
    result[''] = goldmine;
  }

  return result;
}

function convertToJsonSchema(business: any, includeGoldmine: boolean = false): Record<string, any> {
  const baseSchema: Record<string, any> = {
    storeCode: business.storeCode,
    businessName: business.businessName,
    addressLine1: business.addressLine1,
    addressLine2: business.addressLine2 ?? null,
    addressLine3: business.addressLine3 ?? null,
    addressLine4: business.addressLine4 ?? null,
    addressLine5: business.addressLine5 ?? null,
    postalCode: business.postalCode ?? null,
    city: business.city ?? null,
    state: business.state ?? null,
    country: business.country,
    primaryCategory: business.primaryCategory,
    additionalCategories: business.additionalCategories ?? null,
    website: business.website ?? null,
    primaryPhone: business.primaryPhone ?? null,
    latitude: business.latitude ?? null,
    longitude: business.longitude ?? null,
    mondayHours: business.mondayHours ?? null,
    tuesdayHours: business.tuesdayHours ?? null,
    wednesdayHours: business.wednesdayHours ?? null,
    thursdayHours: business.thursdayHours ?? null,
    fridayHours: business.fridayHours ?? null,
    saturdayHours: business.saturdayHours ?? null,
    sundayHours: business.sundayHours ?? null,
    logoPhoto: business.logoPhoto ?? null,
    coverPhoto: business.coverPhoto ?? null,
    otherPhotos: business.otherPhotos ?? null
  };

  // Parse goldmine and spread directly into the object (no wrapper key)
  if (includeGoldmine && business.goldmine) {
    const goldmineFields = parseGoldmine(business.goldmine);
    return {
      ...baseSchema,
      ...goldmineFields
    };
  }

  return baseSchema;
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

    const { clientId }: ManualExportRequest = await req.json();

    console.log('Manual JSON export requested for client:', clientId);

    // Fetch businesses for the client
    const { data: businesses, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active');

    if (fetchError) {
      console.error('Error fetching businesses:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${businesses?.length || 0} active businesses for client ${clientId}`);

    // Validate businesses using the same logic as automatic export
    const validBusinesses = businesses?.filter(business => {
      return business.businessName && 
             business.addressLine1 && 
             business.country && 
             business.primaryCategory;
    }) || [];

    console.log(`${validBusinesses.length} businesses passed validation`);

    // Check if this client should include goldmine
    const includeGoldmine = GOLDMINE_ENABLED_CLIENTS.includes(clientId);
    console.log(`Goldmine export enabled: ${includeGoldmine}`);

    // Generate JSON export as a plain array (no metadata wrapper)
    const businessesArray = validBusinesses.map(business => 
      convertToJsonSchema(business, includeGoldmine)
    );

    const jsonString = JSON.stringify(businessesArray, null, 2);
    const fileName = `manualexport-${clientId}-businesses.json`;

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