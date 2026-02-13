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
  '75d14738-25d0-4c40-9921-bde980bc8e06', // Porsche Test
  '3c9ceb08-13f9-4f50-9945-857e3770940f'  // Fischer-Bike
];

// Validation patterns - MUST match frontend src/lib/validation.ts and generate-json-export exactly
const dayOpeningHoursPattern = /^$|x|^((([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2}), ?)*(([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2})))$/;
const singleUrlPattern = /^$|^(https?:\/\/)?(www\.)?[-A-ÿ0-9ZŠĐČĆŽzšđčćž@:%._\+~#=]{1,256}\.[A-ÿ0-9ZŠĐČĆŽzšđčćž()]{1,6}\b(?:[-A-ÿ0-9ZŠĐČĆŽzšđčćž()@:%_\+.~#?&\/=]*(\s)*)$/;
const multipleUrlsPattern = /^$|^(https?:\/\/)?(www\.)?[-A-ÿ0-9ZŠĐČĆŽzšđčćž@:%._\+~#=]{1,256}\.[A-ÿ0-9ZŠĐČĆŽzšđčćž()]{1,6}\b(?:[-A-ÿ0-9ZŠĐČĆŽzšđčćž()@:%_\+.~#?&\/=]*)((\s)*,(\s)*(https?:\/\/)?(www\.)?[-A-ÿ0-9ZŠĐČĆŽzšđčćž@:%._\+~#=]{1,256}\.[A-ÿ0-9ZŠĐČĆŽzšđčćž()]{1,6}\b(?:[-A-ÿ0-9ZŠĐČĆŽzšđčćž()@:%_\+.~#?&\/=]*)){0,}$/;
const phonePattern = /^\(?[+]?[0-9a-zA-Z  ()./–-]*$/;
const additionalPhonesPattern = /^(\(?[+]?[0-9a-zA-Z  ()./–-]*, ?)*(\(?[+]?[0-9a-zA-Z  ()./–-]*)$/;
const specialHoursPattern = /^(([0-9]{4}-[0-9]{2}-[0-9]{2}: ?(([0-9]{1,2}:[0-9]{2} ?- ?[0-9]{1,2}:[0-9]{2})|x), ?)*([0-9]{4}-[0-9]{2}-[0-9]{2}: ?(([0-9]{1,2}:[0-9]{2} ?- ?[0-9]{1,2}:[0-9]{2})|x))|x|)$/;

// Validation logic - IDENTICAL to generate-json-export and frontend src/lib/validation.ts
function validateBusiness(business: any): boolean {
  // Required fields
  if (!business.storeCode || business.storeCode.length > 64) return false;
  if (!business.businessName || business.businessName.length > 300) return false;
  if (!business.addressLine1 || business.addressLine1.length > 80 || !/^.*[^ ].*$/.test(business.addressLine1)) return false;
  if (!business.country || business.country.length < 2) return false;
  if (!business.primaryCategory || business.primaryCategory.length < 2) return false;

  // Auto-generated store code check
  if (/^STORE\d+$/.test(business.storeCode)) return false;

  // Optional address fields (max 80)
  const addressFields = ['addressLine2', 'addressLine3', 'addressLine4', 'addressLine5', 'postalCode', 'district', 'city', 'state'];
  for (const field of addressFields) {
    const val = business[field];
    if (val && String(val).length > 80) return false;
  }

  // Coordinates
  if (business.latitude != null && (business.latitude < -90 || business.latitude > 90)) return false;
  if (business.longitude != null && (business.longitude < -180 || business.longitude > 180)) return false;

  // Additional categories
  if (business.additionalCategories && !/^(([^,])*,){0,9}(([^,])*)$/.test(business.additionalCategories)) return false;

  // Single URL fields
  if (business.website && (business.website.length > 2083 || !singleUrlPattern.test(business.website))) return false;
  if (business.menuURL && (String(business.menuURL).length > 2083 || !singleUrlPattern.test(String(business.menuURL)))) return false;
  if (business.logoPhoto && !singleUrlPattern.test(business.logoPhoto)) return false;
  if (business.coverPhoto && !singleUrlPattern.test(business.coverPhoto)) return false;

  // Multiple URL fields
  if (business.otherPhotos && !multipleUrlsPattern.test(business.otherPhotos)) return false;
  if (business.appointmentURL && !multipleUrlsPattern.test(business.appointmentURL)) return false;
  if (business.reservationsURL && !multipleUrlsPattern.test(business.reservationsURL)) return false;
  if (business.orderAheadURL && !multipleUrlsPattern.test(business.orderAheadURL)) return false;

  // Phone
  if (business.primaryPhone && !phonePattern.test(business.primaryPhone)) return false;
  if (business.additionalPhones && !additionalPhonesPattern.test(business.additionalPhones)) return false;

  // Adwords
  if (business.adwords && !/^[+]?[0-9a-zA-Z  ()./–-]*$/.test(business.adwords)) return false;

  // Opening date
  if (business.openingDate && !/^([0-9]{4})-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(business.openingDate)) return false;

  // From the business (description) - no URLs allowed
  if (business.fromTheBusiness) {
    if (business.fromTheBusiness.length > 750) return false;
    const urlInDesc = /(https?:\/\/|www\.)[^\s]+/i;
    if (urlInDesc.test(business.fromTheBusiness)) return false;
  }

  // Labels
  if (business.labels && !/^(?:[^,]{1,50},){0,9}[^,]{1,50}$|^$/.test(business.labels)) return false;

  // Opening hours
  const hourFields = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
  for (const field of hourFields) {
    const val = business[field];
    if (val && !dayOpeningHoursPattern.test(val)) return false;
  }

  // Special hours
  if (business.specialHours && !specialHoursPattern.test(business.specialHours)) return false;

  // Social media URLs
  if (business.socialMediaUrls && Array.isArray(business.socialMediaUrls)) {
    const socialUrlPattern = /^$|^(https?:\/\/)?(www\.)?(facebook|instagram|linkedin|pinterest|tiktok|twitter|x|youtube)\.com\b(?:[-A-ÿ0-9ZŠĐČĆŽzšđčćž()@:%_\+.~#?&\/=]*(\s)*)$/;
    for (const social of business.socialMediaUrls) {
      if (social.url && !socialUrlPattern.test(social.url)) return false;
    }
  }

  return true;
}

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
    district: business.district ?? null,
    city: business.city ?? null,
    state: business.state ?? null,
    country: business.country,
    latitude: business.latitude ?? null,
    longitude: business.longitude ?? null,
    primaryCategory: business.primaryCategory,
    additionalCategories: business.additionalCategories ?? null,
    website: business.website ?? null,
    primaryPhone: business.primaryPhone ?? null,
    additionalPhones: business.additionalPhones ?? null,
    adwords: business.adwords ?? null,
    openingDate: business.openingDate ?? null,
    fromTheBusiness: business.fromTheBusiness ?? null,
    labels: business.labels ?? null,
    mondayHours: business.mondayHours ?? null,
    tuesdayHours: business.tuesdayHours ?? null,
    wednesdayHours: business.wednesdayHours ?? null,
    thursdayHours: business.thursdayHours ?? null,
    fridayHours: business.fridayHours ?? null,
    saturdayHours: business.saturdayHours ?? null,
    sundayHours: business.sundayHours ?? null,
    specialHours: business.specialHours ?? null,
    moreHours: business.moreHours ?? null,
    temporarilyClosed: business.temporarilyClosed ?? false,
    logoPhoto: business.logoPhoto ?? null,
    coverPhoto: business.coverPhoto ?? null,
    otherPhotos: business.otherPhotos ?? null,
    appointmentURL: business.appointmentURL ?? null,
    menuURL: business.menuURL ?? null,
    reservationsURL: business.reservationsURL ?? null,
    orderAheadURL: business.orderAheadURL ?? null,
    customServices: business.customServices ?? null,
    socialMediaUrls: business.socialMediaUrls ?? null
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

    // Fetch businesses for the client (excluding async locations, matching generate-json-export)
    const { data: businesses, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .eq('is_async', false);

    if (fetchError) {
      console.error('Error fetching businesses:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${businesses?.length || 0} active businesses for client ${clientId}`);

    // Filter using FULL validation - identical to generate-json-export and frontend
    const validBusinesses = (businesses || []).filter(business => validateBusiness(business));

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
