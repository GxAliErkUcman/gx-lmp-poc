import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Energie 360° client ID
const ENERGIE_360_CLIENT_ID = 'e77c44c5-0585-4225-a5ea-59a38edb85fb';

// Map OCPI weekday (1=Monday...7=Sunday) to day name
const WEEKDAY_MAP: Record<number, string> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

interface OCPILocation {
  id: string;
  name?: string;
  address: string;
  city: string;
  postal_code?: string;
  country: string;
  coordinates: {
    latitude: string;
    longitude: string;
  };
  parking_type?: string;
  evses?: Array<{
    uid: string;
    status: string;
    connectors: Array<{
      id: string;
      standard: string;
      format: string;
      power_type: string;
      max_voltage: number;
      max_amperage: number;
      max_electric_power?: number;
    }>;
  }>;
  opening_times?: {
    twentyfourseven?: boolean;
    regular_hours?: Array<{
      weekday: number;
      period_begin: string;
      period_end: string;
    }>;
  };
  last_updated?: string;
}

interface BusinessData {
  storeCode: string;
  businessName: string | null;
  addressLine1: string;
  city: string;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  mondayHours: string | null;
  tuesdayHours: string | null;
  wednesdayHours: string | null;
  thursdayHours: string | null;
  fridayHours: string | null;
  saturdayHours: string | null;
  sundayHours: string | null;
  goldmine: string | null;
  client_id: string;
  user_id: string;
  status: string;
}

function convertCountryCode(ocpiCode: string): string {
  // OCPI uses ISO 3166-1 alpha-3 (CHE), we need alpha-2 (CH)
  const countryMap: Record<string, string> = {
    'CHE': 'CH',
    'DEU': 'DE',
    'AUT': 'AT',
    'FRA': 'FR',
    'ITA': 'IT',
  };
  return countryMap[ocpiCode] || ocpiCode;
}

function parseOpeningHours(openingTimes?: OCPILocation['opening_times']): Record<string, string | null> {
  const hours: Record<string, string | null> = {
    mondayHours: null,
    tuesdayHours: null,
    wednesdayHours: null,
    thursdayHours: null,
    fridayHours: null,
    saturdayHours: null,
    sundayHours: null,
  };

  if (!openingTimes) return hours;

  // 24/7 locations
  if (openingTimes.twentyfourseven === true) {
    return {
      mondayHours: '00:00-23:59',
      tuesdayHours: '00:00-23:59',
      wednesdayHours: '00:00-23:59',
      thursdayHours: '00:00-23:59',
      fridayHours: '00:00-23:59',
      saturdayHours: '00:00-23:59',
      sundayHours: '00:00-23:59',
    };
  }

  // Regular hours - group by weekday and combine periods
  if (openingTimes.regular_hours && openingTimes.regular_hours.length > 0) {
    const dayHours: Record<string, string[]> = {};

    for (const period of openingTimes.regular_hours) {
      const dayName = WEEKDAY_MAP[period.weekday];
      if (!dayName) continue;

      const timeRange = `${period.period_begin}-${period.period_end}`;
      if (!dayHours[dayName]) {
        dayHours[dayName] = [];
      }
      dayHours[dayName].push(timeRange);
    }

    // Combine multiple periods with comma
    for (const [day, periods] of Object.entries(dayHours)) {
      hours[`${day}Hours`] = periods.join(', ');
    }
  }

  return hours;
}

function summarizeEVSEs(evses?: OCPILocation['evses']): string {
  if (!evses || evses.length === 0) return '';

  const connectorSummary: string[] = [];
  const connectorTypes: Record<string, { count: number; maxPower: number }> = {};

  for (const evse of evses) {
    for (const connector of evse.connectors || []) {
      const standard = connector.standard;
      const power = connector.max_electric_power || 
        (connector.max_voltage * connector.max_amperage / 1000);

      if (!connectorTypes[standard]) {
        connectorTypes[standard] = { count: 0, maxPower: 0 };
      }
      connectorTypes[standard].count++;
      connectorTypes[standard].maxPower = Math.max(connectorTypes[standard].maxPower, power);
    }
  }

  for (const [standard, info] of Object.entries(connectorTypes)) {
    connectorSummary.push(`${standard} (${Math.round(info.maxPower)}kW x${info.count})`);
  }

  return connectorSummary.join(', ');
}

function transformLocation(location: OCPILocation, userId: string): BusinessData {
  const openingHours = parseOpeningHours(location.opening_times);
  
  // Build goldmine field with unmapped data
  const goldmineEntries: string[] = [];
  
  if (location.parking_type) {
    goldmineEntries.push(`parking_type: ${location.parking_type}`);
  }
  
  if (location.evses && location.evses.length > 0) {
    goldmineEntries.push(`evse_count: ${location.evses.length}`);
    const connectorSummary = summarizeEVSEs(location.evses);
    if (connectorSummary) {
      goldmineEntries.push(`connectors: ${connectorSummary}`);
    }
  }

  return {
    storeCode: location.id,
    businessName: location.name || null,
    addressLine1: location.address,
    city: location.city,
    postalCode: location.postal_code || null,
    country: convertCountryCode(location.country),
    latitude: location.coordinates ? parseFloat(location.coordinates.latitude) : null,
    longitude: location.coordinates ? parseFloat(location.coordinates.longitude) : null,
    ...openingHours,
    goldmine: goldmineEntries.length > 0 ? goldmineEntries.join('; ') : null,
    client_id: ENERGIE_360_CLIENT_ID,
    user_id: userId,
    status: 'active', // API locations are considered active
  };
}

function getChangedFields(
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  fieldsToTrack: string[]
): Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> {
  const changes: Array<{ fieldName: string; oldValue: string | null; newValue: string | null }> = [];

  for (const field of fieldsToTrack) {
    const oldVal = oldValues[field];
    const newVal = newValues[field];

    // Normalize values for comparison
    const normalizedOld = oldVal === undefined || oldVal === null ? null : String(oldVal);
    const normalizedNew = newVal === undefined || newVal === null ? null : String(newVal);

    if (normalizedOld !== normalizedNew) {
      changes.push({
        fieldName: field,
        oldValue: normalizedOld,
        newValue: normalizedNew,
      });
    }
  }

  return changes;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ecoMovementToken = Deno.env.get('ECO_MOVEMENT_API_TOKEN');

  if (!ecoMovementToken) {
    console.error('ECO_MOVEMENT_API_TOKEN not configured');
    return new Response(
      JSON.stringify({ error: 'API token not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Create import log entry
  const { data: logEntry, error: logError } = await supabase
    .from('api_import_logs')
    .insert({
      client_id: ENERGIE_360_CLIENT_ID,
      source: 'eco_movement',
      status: 'running',
    })
    .select()
    .single();

  if (logError) {
    console.error('Failed to create import log:', logError);
  }

  const logId = logEntry?.id;

  try {
    console.log('Fetching locations from Eco-Movement API...');

    // Fetch from Eco-Movement API
    const apiResponse = await fetch('https://api.eco-movement.com/api/ocpi/cpo/2.2/locations', {
      method: 'GET',
      headers: {
        'Authorization': `Token ${ecoMovementToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`API request failed: ${apiResponse.status} - ${errorText}`);
    }

    const apiData = await apiResponse.json();
    const locations: OCPILocation[] = apiData.data || apiData;

    console.log(`Fetched ${locations.length} locations from API`);

    // Get a service user ID for user_id field (use first admin user)
    const { data: adminUser } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)
      .single();

    const userId = adminUser?.user_id || '00000000-0000-0000-0000-000000000000';

    // Get existing businesses for this client
    const { data: existingBusinesses } = await supabase
      .from('businesses')
      .select('*')
      .eq('client_id', ENERGIE_360_CLIENT_ID);

    const existingByStoreCode = new Map(
      (existingBusinesses || []).map(b => [b.storeCode, b])
    );

    let locationsCreated = 0;
    let locationsUpdated = 0;
    const fieldsToTrack = [
      'businessName', 'addressLine1', 'city', 'postalCode', 'country',
      'latitude', 'longitude', 'mondayHours', 'tuesdayHours', 'wednesdayHours',
      'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours', 'goldmine'
    ];

    for (const location of locations) {
      const businessData = transformLocation(location, userId);
      const existing = existingByStoreCode.get(businessData.storeCode);

      if (existing) {
        // Check for changes
        const changes = getChangedFields(existing, businessData, fieldsToTrack);

        if (changes.length > 0) {
          // Update the business
          const { error: updateError } = await supabase
            .from('businesses')
            .update({
              ...businessData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (updateError) {
            console.error(`Failed to update business ${businessData.storeCode}:`, updateError);
            continue;
          }

          // Track field changes
          const historyRecords = changes.map(change => ({
            business_id: existing.id,
            field_name: change.fieldName,
            old_value: change.oldValue,
            new_value: change.newValue,
            changed_by: userId,
            change_source: 'eco_movement',
          }));

          const { error: historyError } = await supabase
            .from('business_field_history')
            .insert(historyRecords);

          if (historyError) {
            console.error(`Failed to track history for ${businessData.storeCode}:`, historyError);
          }

          locationsUpdated++;
          console.log(`Updated: ${businessData.storeCode} (${changes.length} fields changed)`);
        }
      } else {
        // Insert new business
        const { data: newBusiness, error: insertError } = await supabase
          .from('businesses')
          .insert(businessData)
          .select()
          .single();

        if (insertError) {
          console.error(`Failed to insert business ${businessData.storeCode}:`, insertError);
          continue;
        }

        // Track creation in history
        const { error: historyError } = await supabase
          .from('business_field_history')
          .insert({
            business_id: newBusiness.id,
            field_name: 'business_created',
            old_value: null,
            new_value: JSON.stringify({
              storeCode: businessData.storeCode,
              businessName: businessData.businessName,
              source: 'eco_movement',
            }),
            changed_by: userId,
            change_source: 'eco_movement',
          });

        if (historyError) {
          console.error(`Failed to track creation for ${businessData.storeCode}:`, historyError);
        }

        locationsCreated++;
        console.log(`Created: ${businessData.storeCode}`);
      }
    }

    // Track which store codes are in the API feed
    const apiStoreCodes = locations.map(loc => loc.id);
    const apiStoreCodesSet = new Set(apiStoreCodes);
    console.log(`Updating api_feed_locations with ${apiStoreCodes.length} store codes...`);

    // Upsert all API store codes to api_feed_locations
    const feedLocationRecords = apiStoreCodes.map(storeCode => ({
      client_id: ENERGIE_360_CLIENT_ID,
      store_code: storeCode,
      last_seen_at: new Date().toISOString(),
    }));

    // Insert in batches to avoid query limits
    const batchSize = 100;
    for (let i = 0; i < feedLocationRecords.length; i += batchSize) {
      const batch = feedLocationRecords.slice(i, i + batchSize);
      const { error: feedError } = await supabase
        .from('api_feed_locations')
        .upsert(batch, { onConflict: 'client_id,store_code' });

      if (feedError) {
        console.error(`Failed to upsert api_feed_locations batch:`, feedError);
      }
    }

    console.log(`Updated api_feed_locations with ${apiStoreCodes.length} store codes`);

    // === ASYNC DETECTION LOGIC ===
    // Flag businesses that exist in Jasoner but are NOT in the API feed
    console.log('Checking for async (out-of-sync) locations...');

    // Get all Energie 360° businesses that are active and not already flagged
    const { data: allClientBusinesses } = await supabase
      .from('businesses')
      .select('id, storeCode, is_async')
      .eq('client_id', ENERGIE_360_CLIENT_ID)
      .eq('status', 'active');

    let asyncFlagged = 0;
    let asyncUnflagged = 0;

    for (const business of allClientBusinesses || []) {
      const isInFeed = apiStoreCodesSet.has(business.storeCode);
      const currentlyAsync = business.is_async === true;

      if (!isInFeed && !currentlyAsync) {
        // Business exists in Jasoner but NOT in feed - flag it as async
        const { error: flagError } = await supabase
          .from('businesses')
          .update({ is_async: true, updated_at: new Date().toISOString() })
          .eq('id', business.id);

        if (!flagError) {
          // Track this change in history
          await supabase
            .from('business_field_history')
            .insert({
              business_id: business.id,
              field_name: 'is_async',
              old_value: 'false',
              new_value: 'true',
              changed_by: userId,
              change_source: 'eco_movement',
            });
          asyncFlagged++;
          console.log(`Flagged as async: ${business.storeCode} (missing from API feed)`);
        }
      } else if (isInFeed && currentlyAsync) {
        // Business is back in feed - unflag it
        const { error: unflagError } = await supabase
          .from('businesses')
          .update({ is_async: false, updated_at: new Date().toISOString() })
          .eq('id', business.id);

        if (!unflagError) {
          // Track this change in history
          await supabase
            .from('business_field_history')
            .insert({
              business_id: business.id,
              field_name: 'is_async',
              old_value: 'true',
              new_value: 'false',
              changed_by: userId,
              change_source: 'eco_movement',
            });
          asyncUnflagged++;
          console.log(`Unflagged async: ${business.storeCode} (back in API feed)`);
        }
      }
    }

    console.log(`Async detection complete: ${asyncFlagged} flagged, ${asyncUnflagged} unflagged`);

    // Update import log with success
    if (logId) {
      await supabase
        .from('api_import_logs')
        .update({
          status: 'success',
          locations_fetched: locations.length,
          locations_created: locationsCreated,
          locations_updated: locationsUpdated,
        })
        .eq('id', logId);
    }

    console.log(`Import completed: ${locationsCreated} created, ${locationsUpdated} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        locations_fetched: locations.length,
        locations_created: locationsCreated,
        locations_updated: locationsUpdated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import failed:', error);

    // Update import log with failure
    if (logId) {
      await supabase
        .from('api_import_logs')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
