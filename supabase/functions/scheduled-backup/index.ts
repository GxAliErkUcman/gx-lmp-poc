import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Business {
  businessName: string;
  storeCode: string;
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  addressLine4: string | null;
  addressLine5: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  primaryPhone: string | null;
  additionalPhones: string | null;
  website: string | null;
  primaryCategory: string;
  additionalCategories: string | null;
  mondayHours: string | null;
  tuesdayHours: string | null;
  wednesdayHours: string | null;
  thursdayHours: string | null;
  fridayHours: string | null;
  saturdayHours: string | null;
  sundayHours: string | null;
  specialHours: string | null;
  moreHours: any;
  labels: string | null;
  fromTheBusiness: string | null;
  adwords: string | null;
  logoPhoto: string | null;
  coverPhoto: string | null;
  otherPhotos: string | null;
  openingDate: string | null;
  temporarilyClosed: boolean | null;
  appointmentURL: string | null;
  menuURL: string | null;
  reservationsURL: string | null;
  orderAheadURL: string | null;
  socialMediaUrls: any;
  customServices: any;
  district: string | null;
  relevantLocation: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scheduled backup for all clients...');

    // Fetch all clients
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, name');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      throw clientsError;
    }

    const results = [];

    for (const client of clients || []) {
      try {
        console.log(`Processing backup for client: ${client.name} (${client.id})`);

        // Fetch active businesses for this client
        const { data: businesses, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('client_id', client.id)
          .eq('status', 'active');

        if (businessError) {
          console.error(`Error fetching businesses for ${client.name}:`, businessError);
          continue;
        }

        // Filter and transform businesses
        const validBusinesses = (businesses || [])
          .filter((b: any) => b.businessName && b.addressLine1 && b.country && b.primaryCategory)
          .map((business: any) => ({
            businessName: business.businessName,
            storeCode: business.storeCode,
            addressLine1: business.addressLine1,
            addressLine2: business.addressLine2,
            addressLine3: business.addressLine3,
            addressLine4: business.addressLine4,
            addressLine5: business.addressLine5,
            city: business.city,
            state: business.state,
            postalCode: business.postalCode,
            country: business.country,
            latitude: business.latitude,
            longitude: business.longitude,
            primaryPhone: business.primaryPhone,
            additionalPhones: business.additionalPhones,
            website: business.website,
            primaryCategory: business.primaryCategory,
            additionalCategories: business.additionalCategories,
            mondayHours: business.mondayHours,
            tuesdayHours: business.tuesdayHours,
            wednesdayHours: business.wednesdayHours,
            thursdayHours: business.thursdayHours,
            fridayHours: business.fridayHours,
            saturdayHours: business.saturdayHours,
            sundayHours: business.sundayHours,
            specialHours: business.specialHours,
            moreHours: business.moreHours,
            labels: business.labels,
            fromTheBusiness: business.fromTheBusiness,
            adwords: business.adwords,
            logoPhoto: business.logoPhoto,
            coverPhoto: business.coverPhoto,
            otherPhotos: business.otherPhotos,
            openingDate: business.openingDate,
            temporarilyClosed: business.temporarilyClosed,
            appointmentURL: business.appointmentURL,
            menuURL: business.menuURL,
            reservationsURL: business.reservationsURL,
            orderAheadURL: business.orderAheadURL,
            socialMediaUrls: business.socialMediaUrls,
            customServices: business.customServices,
            district: business.district,
            relevantLocation: business.relevantLocation,
          }));

        if (validBusinesses.length === 0) {
          console.log(`No valid businesses for ${client.name}, skipping`);
          continue;
        }

        // Generate JSON content
        const jsonContent = JSON.stringify(validBusinesses, null, 2);
        const jsonBlob = new Blob([jsonContent], { type: 'application/json' });

        // Generate filename: ClientName-YYYY-MM-DD.json
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `${client.id}/${client.name}-${timestamp}.json`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('json-backups')
          .upload(fileName, jsonBlob, {
            contentType: 'application/json',
            upsert: true,
          });

        if (uploadError) {
          console.error(`Error uploading backup for ${client.name}:`, uploadError);
          continue;
        }

        // Cleanup: Keep only last 5 backups per client
        const { data: existingFiles } = await supabase.storage
          .from('json-backups')
          .list(client.id, {
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (existingFiles && existingFiles.length > 5) {
          const filesToDelete = existingFiles.slice(5).map(f => `${client.id}/${f.name}`);
          await supabase.storage
            .from('json-backups')
            .remove(filesToDelete);
          console.log(`Cleaned up ${filesToDelete.length} old backups for ${client.name}`);
        }

        results.push({
          client: client.name,
          businessCount: validBusinesses.length,
          fileName,
          success: true,
        });

        console.log(`Backup completed for ${client.name}: ${validBusinesses.length} businesses`);
      } catch (error) {
        console.error(`Error processing ${client.name}:`, error);
        results.push({
          client: client.name,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backup completed for ${results.filter(r => r.success).length}/${results.length} clients`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Backup error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
