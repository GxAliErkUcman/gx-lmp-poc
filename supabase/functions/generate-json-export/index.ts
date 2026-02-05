import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

interface Business {
  id: string;
  user_id: string;
  storeCode: string;
  businessName: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  addressLine5?: string;
  postalCode?: string;
  district?: string;
  city?: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  primaryCategory: string;
  additionalCategories?: string;
  website?: string;
  primaryPhone?: string;
  additionalPhones?: string;
  adwords?: string;
  openingDate?: string;
  fromTheBusiness?: string;
  labels?: string;
  mondayHours?: string;
  tuesdayHours?: string;
  wednesdayHours?: string;
  thursdayHours?: string;
  fridayHours?: string;
  saturdayHours?: string;
  sundayHours?: string;
  specialHours?: string;
  moreHours?: any[];
  temporarilyClosed?: boolean;
  logoPhoto?: string;
  coverPhoto?: string;
  otherPhotos?: string;
  appointmentURL?: string;
  menuURL?: string;
  reservationsURL?: string;
  orderAheadURL?: string;
  customServices?: any[];
  socialMediaUrls?: any[];
  status: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation logic (simplified version from validation.ts)
function validateBusiness(business: Business): boolean {
  // Check required fields
  if (!business.storeCode || !business.businessName || !business.addressLine1 || 
      !business.country || !business.primaryCategory) {
    return false;
  }

  // Validate URLs if present
  const urlRegex = /^https?:\/\/.+/;
  if (business.website && !urlRegex.test(business.website)) return false;
  if (business.appointmentURL && !urlRegex.test(business.appointmentURL)) return false;
  if (business.menuURL && !urlRegex.test(business.menuURL)) return false;
  if (business.reservationsURL && !urlRegex.test(business.reservationsURL)) return false;
  if (business.orderAheadURL && !urlRegex.test(business.orderAheadURL)) return false;

  return true;
}

// Client IDs that should include goldmine in export
const GOLDMINE_ENABLED_CLIENTS = [
  '75d14738-25d0-4c40-9921-bde980bc8e06' // Porsche Test
];

// Parse goldmine string (format: "Key1: Value1; Key2: Value2") into key-value pairs
function parseGoldmine(goldmine: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  if (!goldmine || !goldmine.trim()) {
    return result;
  }

  // Split by semicolon and process each pair
  const pairs = goldmine.split(';');
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    
    // Find the first colon to split key from value
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      if (key) {
        result[key] = value;
      }
    } else {
      // No colon found - treat entire string as a value with generic key
      result['additionalData'] = trimmed;
    }
  }

  return result;
}

function convertToJsonSchema(business: Business & { goldmine?: string }, includeGoldmine: boolean = false) {
  const baseSchema: Record<string, any> = {
    storeCode: business.storeCode,
    businessName: business.businessName,
    addressLine1: business.addressLine1,
    addressLine2: business.addressLine2 || null,
    addressLine3: business.addressLine3 || null,
    addressLine4: business.addressLine4 || null,
    addressLine5: business.addressLine5 || null,
    postalCode: business.postalCode || null,
    district: business.district || null,
    city: business.city || null,
    state: business.state || null,
    country: business.country,
    latitude: business.latitude || null,
    longitude: business.longitude || null,
    primaryCategory: business.primaryCategory,
    additionalCategories: business.additionalCategories || null,
    website: business.website || null,
    primaryPhone: business.primaryPhone || null,
    additionalPhones: business.additionalPhones || null,
    adwords: business.adwords || null,
    openingDate: business.openingDate || null,
    fromTheBusiness: business.fromTheBusiness || null,
    labels: business.labels || null,
    mondayHours: business.mondayHours || null,
    tuesdayHours: business.tuesdayHours || null,
    wednesdayHours: business.wednesdayHours || null,
    thursdayHours: business.thursdayHours || null,
    fridayHours: business.fridayHours || null,
    saturdayHours: business.saturdayHours || null,
    sundayHours: business.sundayHours || null,
    specialHours: business.specialHours || null,
    moreHours: business.moreHours || null,
    temporarilyClosed: business.temporarilyClosed || false,
    logoPhoto: business.logoPhoto || null,
    coverPhoto: business.coverPhoto || null,
    otherPhotos: business.otherPhotos || null,
    appointmentURL: business.appointmentURL || null,
    menuURL: business.menuURL || null,
    reservationsURL: business.reservationsURL || null,
    orderAheadURL: business.orderAheadURL || null,
    customServices: business.customServices || null,
    socialMediaUrls: business.socialMediaUrls || null
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();

    console.log(`Generating JSON export for client: ${client_id}`);

    // Create Supabase client with service role key for admin access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch client info to get LSC ID
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('lsc_id')
      .eq('id', client_id)
      .maybeSingle();

    if (clientError) {
      console.error('Error fetching client:', clientError);
      return new Response(JSON.stringify({ error: 'Failed to fetch client information' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch all active businesses for the client (excluding async locations)
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('client_id', client_id)
      .eq('status', 'active')
      .eq('is_async', false);

    if (error) {
      console.error('Error fetching businesses:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch businesses' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if this client should include goldmine
    const includeGoldmine = GOLDMINE_ENABLED_CLIENTS.includes(client_id);
    console.log(`Goldmine export enabled: ${includeGoldmine}`);

    // Filter and validate businesses
    const validBusinesses = (businesses || [])
      .filter(business => validateBusiness(business))
      .map(business => convertToJsonSchema(business, includeGoldmine));

    console.log(`Found ${validBusinesses.length} valid businesses for export`);

    // Generate JSON export as plain array (no metadata)
    const jsonContent = JSON.stringify(validBusinesses, null, 2);
    
    // Use LSC ID for filename if available, otherwise fall back to client ID
    const fileName = clientData?.lsc_id 
      ? `${clientData.lsc_id}.json`
      : `client-${client_id}-businesses.json`;

    // Upload to storage bucket
    const { error: uploadError } = await supabase.storage
      .from('json-exports')
      .upload(fileName, jsonContent, {
        contentType: 'application/json',
        upsert: true // Overwrite existing file
      });

    if (uploadError) {
      console.error('Error uploading JSON export:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload export' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Successfully uploaded JSON export: ${fileName}`);

    // Auto-sync with GCP
    try {
      console.log('Auto-syncing to GCP...');
      const syncResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-to-gcp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName,
          bucketName: 'json-exports'
        })
      });

      const syncResult = await syncResponse.json();
      if (syncResult.success) {
        console.log(`Successfully synced to GCP: ${syncResult.gcpPath}`);
      } else {
        console.warn('GCP sync failed:', syncResult.error);
      }
    } catch (syncError) {
      const msg = (syncError as any)?.message || String(syncError);
      console.warn('GCP sync error (non-fatal):', msg);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      fileName,
      businessCount: validBusinesses.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-json-export:', error);
    const msg = (error as any)?.message || String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});