import { supabase } from "@/integrations/supabase/client";

export type ChangeSource = 'manual_edit' | 'import' | 'multi_edit' | 'bulk_update' | 'rollback';

interface FieldChange {
  field_name: string;
  old_value: string | null;
  new_value: string | null;
}

/**
 * Normalizes a value to a string for comparison and storage
 */
function normalizeValue(value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Compares old and new business data and returns the list of changed fields
 */
export function getChangedFields(
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  fieldsToTrack?: string[]
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Default fields to track (all editable business fields)
  const trackableFields = fieldsToTrack || [
    'storeCode', 'businessName', 'addressLine1', 'addressLine2',
    'addressLine3', 'addressLine4', 'addressLine5', 'postalCode',
    'district', 'city', 'state', 'country', 'latitude', 'longitude',
    'primaryCategory', 'additionalCategories', 'website', 'primaryPhone',
    'additionalPhones', 'adwords', 'openingDate', 'fromTheBusiness',
    'labels', 'mondayHours', 'tuesdayHours', 'wednesdayHours',
    'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours',
    'specialHours', 'moreHours', 'status', 'temporarilyClosed',
    'logoPhoto', 'coverPhoto', 'otherPhotos', 'appointmentURL',
    'menuURL', 'reservationsURL', 'orderAheadURL', 'customServices',
    'socialMediaUrls', 'relevantLocation', 'goldmine'
  ];

  for (const field of trackableFields) {
    const oldVal = normalizeValue(oldValues[field]);
    const newVal = normalizeValue(newValues[field]);

    // Only track if values are different
    if (oldVal !== newVal) {
      changes.push({
        field_name: field,
        old_value: oldVal,
        new_value: newVal,
      });
    }
  }

  return changes;
}

/**
 * Tracks field changes for a business by inserting history records
 */
export async function trackFieldChanges(
  businessId: string,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  changedBy: string,
  changeSource: ChangeSource = 'manual_edit',
  fieldsToTrack?: string[],
  changedByEmail?: string
): Promise<{ success: boolean; changesCount: number; error?: string }> {
  try {
    const changes = getChangedFields(oldValues, newValues, fieldsToTrack);

    if (changes.length === 0) {
      return { success: true, changesCount: 0 };
    }

    // Get current user's email if not provided
    let email = changedByEmail;
    if (!email) {
      const { data: { user } } = await supabase.auth.getUser();
      email = user?.email || undefined;
    }

    // Insert all changes
    const historyRecords = changes.map(change => ({
      business_id: businessId,
      field_name: change.field_name,
      old_value: change.old_value,
      new_value: change.new_value,
      changed_by: changedBy,
      changed_by_email: email,
      change_source: changeSource,
    }));

    const { error } = await supabase
      .from('business_field_history')
      .insert(historyRecords);

    if (error) {
      console.error('Error tracking field changes:', error);
      return { success: false, changesCount: 0, error: error.message };
    }

    return { success: true, changesCount: changes.length };
  } catch (err) {
    console.error('Error in trackFieldChanges:', err);
    return { success: false, changesCount: 0, error: String(err) };
  }
}

/**
 * Rolls back a specific field to a historical value
 */
export async function rollbackField(
  businessId: string,
  fieldName: string,
  targetValue: string | null,
  currentValue: string | null,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Parse the target value if it's a JSON string for object fields
    let parsedValue: any = targetValue;
    const jsonFields = ['customServices', 'socialMediaUrls', 'moreHours', 'relevantLocation'];

    if (targetValue && jsonFields.includes(fieldName)) {
      try {
        parsedValue = JSON.parse(targetValue);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    // Handle null for nullable fields
    if (targetValue === null) {
      parsedValue = null;
    }

    // Update the business field
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ [fieldName]: parsedValue })
      .eq('id', businessId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Get user email
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email;

    // Track the rollback as a new history record
    const { error: historyError } = await supabase
      .from('business_field_history')
      .insert({
        business_id: businessId,
        field_name: fieldName,
        old_value: currentValue,
        new_value: targetValue,
        changed_by: userId,
        changed_by_email: email,
        change_source: 'rollback',
      });

    if (historyError) {
      console.error('Error creating rollback history:', historyError);
      // Don't fail the rollback if history insert fails
    }

    return { success: true };
  } catch (err) {
    console.error('Error in rollbackField:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Get a display-friendly name for a field
 */
export function getFieldDisplayName(fieldName: string): string {
  const displayNames: Record<string, string> = {
    storeCode: 'Store Code',
    businessName: 'Business Name',
    addressLine1: 'Address Line 1',
    addressLine2: 'Address Line 2',
    addressLine3: 'Address Line 3',
    addressLine4: 'Address Line 4',
    addressLine5: 'Address Line 5',
    postalCode: 'Postal Code',
    district: 'District',
    city: 'City',
    state: 'State',
    country: 'Country',
    latitude: 'Latitude',
    longitude: 'Longitude',
    primaryCategory: 'Primary Category',
    additionalCategories: 'Additional Categories',
    website: 'Website',
    primaryPhone: 'Primary Phone',
    additionalPhones: 'Additional Phones',
    adwords: 'AdWords ID',
    openingDate: 'Opening Date',
    fromTheBusiness: 'Description',
    labels: 'Labels',
    mondayHours: 'Monday Hours',
    tuesdayHours: 'Tuesday Hours',
    wednesdayHours: 'Wednesday Hours',
    thursdayHours: 'Thursday Hours',
    fridayHours: 'Friday Hours',
    saturdayHours: 'Saturday Hours',
    sundayHours: 'Sunday Hours',
    specialHours: 'Special Hours',
    moreHours: 'More Hours',
    status: 'Status',
    temporarilyClosed: 'Temporarily Closed',
    logoPhoto: 'Logo Photo',
    coverPhoto: 'Cover Photo',
    otherPhotos: 'Other Photos',
    appointmentURL: 'Appointment URL',
    menuURL: 'Menu URL',
    reservationsURL: 'Reservations URL',
    orderAheadURL: 'Order Ahead URL',
    customServices: 'Custom Services',
    socialMediaUrls: 'Social Media URLs',
    relevantLocation: 'Relevant Location',
    goldmine: 'Data Goldmine',
  };
  return displayNames[fieldName] || fieldName;
}

/**
 * Get a display-friendly name for a change source
 */
export function getChangeSourceDisplayName(source: string): string {
  const sourceNames: Record<string, string> = {
    manual_edit: 'Manual Edit',
    import: 'Import',
    multi_edit: 'Multi-Edit',
    bulk_update: 'Bulk Update',
    rollback: 'Rollback',
    crud: 'CRUD',
  };
  return sourceNames[source] || source;
}

/**
 * Tracks when a new business is created
 */
export async function trackBusinessCreated(
  businessId: string,
  storeCode: string,
  businessName: string | null,
  userId: string,
  changeSource: 'crud' | 'import' = 'crud'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email;

    const { error } = await supabase
      .from('business_field_history')
      .insert({
        business_id: businessId,
        field_name: 'business_created',
        old_value: null,
        new_value: JSON.stringify({ storeCode, businessName }),
        changed_by: userId,
        changed_by_email: email,
        change_source: changeSource,
      });

    if (error) {
      console.error('Error tracking business creation:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in trackBusinessCreated:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Tracks when a business is deleted
 */
export async function trackBusinessDeleted(
  businessId: string,
  storeCode: string,
  businessName: string | null,
  userId: string,
  changeSource: 'crud' | 'import' = 'crud'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email;

    const { error } = await supabase
      .from('business_field_history')
      .insert({
        business_id: businessId,
        field_name: 'business_deleted',
        old_value: JSON.stringify({ storeCode, businessName }),
        new_value: null,
        changed_by: userId,
        changed_by_email: email,
        change_source: changeSource,
      });

    if (error) {
      console.error('Error tracking business deletion:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in trackBusinessDeleted:', err);
    return { success: false, error: String(err) };
  }
}
