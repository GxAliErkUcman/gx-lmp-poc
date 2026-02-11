import { validateBusiness } from '@/lib/validation';
import type { Business } from '@/types/business';

/**
 * Check if a business has export validation errors.
 * Uses the same conversion logic as JsonExport to ensure consistency.
 */
export function hasExportValidationErrors(business: Business): boolean {
  const converted = {
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
    socialMediaUrls: business.socialMediaUrls || null,
  };
  const { isValid } = validateBusiness(converted);
  return !isValid;
}
