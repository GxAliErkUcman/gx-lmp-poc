import { validateBusiness, ValidationError } from '@/lib/validation';
import type { Business } from '@/types/business';

// Required fields that make an error "critical" (blocking export)
const REQUIRED_FIELDS = ['storeCode', 'businessName', 'addressLine1', 'country', 'primaryCategory'];

/**
 * Convert business to the same format used by validation
 */
function convertForValidation(business: Business) {
  return {
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
}

/**
 * Get all validation errors for a business (same logic as export edge functions).
 */
export function getExportValidationErrors(business: Business): ValidationError[] {
  const converted = convertForValidation(business);
  const { errors } = validateBusiness(converted);
  return errors;
}

/**
 * Check if a business has export validation errors.
 */
export function hasExportValidationErrors(business: Business): boolean {
  return getExportValidationErrors(business).length > 0;
}

/**
 * Check if an error is critical (required field missing/invalid or auto-generated store code).
 * Critical errors prevent export entirely.
 */
export function isCriticalError(error: ValidationError): boolean {
  // Required field errors are always critical
  if (REQUIRED_FIELDS.includes(error.field)) return true;
  // Auto-generated store code
  if (error.field === 'storeCode' && error.message.includes('auto-generated')) return true;
  return false;
}

/**
 * Get only critical validation errors (missing required fields, auto-generated store codes).
 * These go in the "Need Attention" / "Critical Issues" tab.
 */
export function getCriticalValidationErrors(business: Business): ValidationError[] {
  return getExportValidationErrors(business).filter(isCriticalError);
}

/**
 * Get only minor validation errors (optional field format issues).
 * These go in the "Minor Issues" tab.
 */
export function getMinorValidationErrors(business: Business): ValidationError[] {
  return getExportValidationErrors(business).filter(e => !isCriticalError(e));
}

/**
 * Check if business has critical issues (required fields missing).
 */
export function hasCriticalErrors(business: Business): boolean {
  return getCriticalValidationErrors(business).length > 0 || 
    business.status === 'pending' || 
    (business as any).is_async === true;
}

/**
 * Check if business has ONLY minor issues (optional field validation errors, no critical ones).
 * Business must be active, not async, and have no critical errors but some minor errors.
 */
export function hasOnlyMinorErrors(business: Business): boolean {
  if (business.status !== 'active') return false;
  if ((business as any).is_async === true) return false;
  const errors = getExportValidationErrors(business);
  if (errors.length === 0) return false;
  // Has errors, but none are critical
  return errors.every(e => !isCriticalError(e));
}
