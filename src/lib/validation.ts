import { z } from 'zod';

// JSON Schema validation patterns
const dayOpeningHoursPattern = /^$|x|^((([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2}), ?)*(([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2})))$/;
const singleUrlPattern = /^$|^https?:\/\/(www\.)?[-A-ÿ0-9ZŠĐČĆŽzšđčćž@:%._\+~#=]{1,256}\.[A-ÿ0-9ZŠĐČĆŽzšđčćž()]{1,6}\b(?:[-A-ÿ0-9ZŠĐČĆŽzšđčćž()@:%_\+.~#?&\/=]*(\s)*)$/;
const socialUrlPattern = /^$|^https?:\/\/(www\.)?(facebook|instagram|linkedin|pinterest|tiktok|twitter|x|youtube)\.com\b(?:[-A-ÿ0-9ZŠĐČĆŽzšđčćž()@:%_\+.~#?&\/=]*(\s)*)$/;
const multipleUrlsPattern = /^$|^https?:\/\/(www\.)?[-A-ÿ0-9ZŠĐČĆŽzšđčćž@:%._\+~#=]{1,256}\.[A-ÿ0-9ZŠĐČĆŽzšđčćž()]{1,6}\b(?:[-A-ÿ0-9ZŠĐČĆŽzšđčćž()@:%_\+.~#?&\/=]*)((\s)*,(\s)*https?:\/\/(www\.)?[-A-ÿ0-9ZŠĐČĆŽzšđčćž@:%._\+~#=]{1,256}\.[A-ÿ0-9ZŠĐČĆŽzšđčćž()]{1,6}\b(?:[-A-ÿ0-9ZŠĐČĆŽzšđčćž()@:%_\+.~#?&\/=]*)){0,}$/;
const phonePattern = /^\(?[+]?[0-9a-zA-Z  ()./–-]*$/;
const additionalPhonesPattern = /^(\(?[+]?[0-9a-zA-Z  ()./–-]*, ?)*(\(?[+]?[0-9a-zA-Z  ()./–-]*)$/;
const specialHoursPattern = /^(([0-9]{4}-[0-9]{2}-[0-9]{2}: ?(([0-9]{1,2}:[0-9]{2} ?- ?[0-9]{1,2}:[0-9]{2})|x), ?)*([0-9]{4}-[0-9]{2}-[0-9]{2}: ?(([0-9]{1,2}:[0-9]{2} ?- ?[0-9]{1,2}:[0-9]{2})|x))|x|)$/;

// Social media URL schema
const socialMediaUrlSchema = z.object({
  name: z.enum(['url_facebook', 'url_instagram', 'url_linkedin', 'url_pinterest', 'url_tiktok', 'url_twitter', 'url_youtube']),
  url: z.string().nullable().refine((val) => !val || socialUrlPattern.test(val), {
    message: "Invalid social media URL format"
  })
});

// Custom service schema
const customServiceSchema = z.object({
  serviceName: z.string().min(1).max(140),
  serviceDescription: z.string().nullable(),
  serviceCategoryId: z.string().nullable()
});

// More hours schema
const moreHoursSchema = z.object({
  hoursTypeId: z.enum(['ACCESS', 'BRUNCH', 'DELIVERY', 'DRIVE_THROUGH', 'HAPPY_HOUR', 'KITCHEN', 'ONLINE_SERVICE_HOURS', 'PICKUP', 'SENIOR_HOURS', 'TAKEOUT']),
  mondayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val)),
  tuesdayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val)),
  wednesdayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val)),
  thursdayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val)),
  fridayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val)),
  saturdayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val)),
  sundayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val))
});

// Main business validation schema
export const businessValidationSchema = z.object({
  // Required fields
  storeCode: z.string().min(1, "Store code is required").max(64, "Store code must be 64 characters or less"),
  businessName: z.string().min(1, "Business name is required").max(300, "Business name must be 300 characters or less"),
  addressLine1: z.string().min(1, "Street address is required").max(80, "Address line 1 must be 80 characters or less").refine((val) => /^.*[^ ].*$/.test(val), "Address cannot contain only whitespaces"),
  country: z.string().min(2, "Country is required (minimum 2 characters)"),
  primaryCategory: z.string().min(2, "Primary category is required (minimum 2 characters)"),

  // Optional address fields
  addressLine2: z.string().max(80).nullable().optional(),
  addressLine3: z.string().max(80).nullable().optional(),
  addressLine4: z.string().max(80).nullable().optional(),
  addressLine5: z.string().max(80).nullable().optional(),
  postalCode: z.string().max(80).nullable().optional(),
  district: z.string().max(80).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  state: z.string().max(80).nullable().optional(),
  
  // Coordinates
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  
  // Category and business info
  additionalCategories: z.string().nullable().refine((val) => !val || /^(([^,])*,){0,9}(([^,])*)$/.test(val), "Invalid additional categories format (max 10 categories)").optional(),
  website: z.string().max(2083).nullable().refine((val) => !val || singleUrlPattern.test(val), "Invalid website URL format").optional(),
  primaryPhone: z.string().nullable().refine((val) => !val || phonePattern.test(val), "Invalid phone number format").optional(),
  additionalPhones: z.string().nullable().refine((val) => !val || additionalPhonesPattern.test(val), "Invalid additional phones format").optional(),
  adwords: z.string().nullable().refine((val) => !val || /^[+]?[0-9a-zA-Z  ()./–-]*$/.test(val), "Invalid adwords phone format").optional(),
  openingDate: z.string().nullable().refine((val) => !val || /^([0-9]{4})-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/.test(val), "Invalid opening date format (YYYY-MM-DD)").optional(),
  fromTheBusiness: z.string().max(750).nullable().refine((val) => {
    if (!val) return true;
    // Check for URLs - only match explicit URLs with protocol or www prefix
    const urlPattern = /(https?:\/\/|www\.)[^\s]+/i;
    return !urlPattern.test(val);
  }, {
    message: "Business description cannot contain URLs. Please provide a description of your business without web addresses, as this violates Google My Business guidelines."
  }).optional(),
  labels: z.string().nullable().refine((val) => !val || /^(?:[^,]{1,50},){0,9}[^,]{1,50}$|^$/.test(val), "Invalid labels format (max 10 labels, 50 chars each)").optional(),
  
  // Opening hours
  mondayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val), "Invalid Monday hours format").optional(),
  tuesdayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val), "Invalid Tuesday hours format").optional(),
  wednesdayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val), "Invalid Wednesday hours format").optional(),
  thursdayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val), "Invalid Thursday hours format").optional(),
  fridayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val), "Invalid Friday hours format").optional(),
  saturdayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val), "Invalid Saturday hours format").optional(),
  sundayHours: z.string().nullable().refine((val) => !val || dayOpeningHoursPattern.test(val), "Invalid Sunday hours format").optional(),
  specialHours: z.string().nullable().refine((val) => !val || specialHoursPattern.test(val), {
    message: "Invalid special hours format. Use format: 'YYYY-MM-DD: HH:MM-HH:MM' or 'YYYY-MM-DD: x' for closed days. Multiple entries separated by commas."
  }).optional(),
  moreHours: z.array(moreHoursSchema).nullable().optional(),
  
  // Status
  temporarilyClosed: z.boolean().optional(),
  
  // Photos
  logoPhoto: z.string().nullable().refine((val) => !val || singleUrlPattern.test(val), "Invalid logo photo URL").optional(),
  coverPhoto: z.string().nullable().refine((val) => !val || singleUrlPattern.test(val), "Invalid cover photo URL").optional(),
  otherPhotos: z.string().nullable().refine((val) => !val || multipleUrlsPattern.test(val), "Invalid other photos URLs format").optional(),
  
  // Service URLs
  appointmentURL: z.string().nullable().refine((val) => !val || multipleUrlsPattern.test(val), "Invalid appointment URLs format").optional(),
  menuURL: z.string().max(2083).nullable().refine((val) => !val || singleUrlPattern.test(val), "Invalid menu URL format").optional(),
  reservationsURL: z.string().nullable().refine((val) => !val || multipleUrlsPattern.test(val), "Invalid reservations URLs format").optional(),
  orderAheadURL: z.string().nullable().refine((val) => !val || multipleUrlsPattern.test(val), "Invalid order ahead URLs format").optional(),
  
  // Services and social media
  customServices: z.array(customServiceSchema).nullable().optional(),
  socialMediaUrls: z.array(socialMediaUrlSchema).nullable().optional()
});

export type BusinessValidation = z.infer<typeof businessValidationSchema>;

export interface ValidationError {
  field: string;
  message: string;
  suggestion?: string;
}

export function validateBusiness(data: any): { isValid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  try {
    businessValidationSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(...error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        suggestion: getFieldSuggestion(err.path[0] as string, err.message)
      })));
    } else {
      errors.push({ field: 'general', message: 'Unknown validation error' });
    }
  }
  
  // Additional check for procedurally generated store codes
  if (data.storeCode && /^STORE\d+$/.test(data.storeCode)) {
    // Check if this error already exists
    const hasStoreCodeError = errors.some(err => err.field === 'storeCode');
    if (!hasStoreCodeError) {
      errors.push({
        field: 'storeCode',
        message: 'Store code appears to be auto-generated and needs to be replaced',
        suggestion: "Replace with your actual store code"
      });
    }
  }
  
  return { 
    isValid: errors.length === 0, 
    errors 
  };
}

function getFieldSuggestion(field: string, message: string): string {
  const suggestions: Record<string, string> = {
    storeCode: "Use a unique identifier with no spaces or special characters (max 64 chars). Example: 'STORE001234'",
    businessName: "Use your business's real-world name exactly as shown on your storefront (max 300 chars)",
    addressLine1: "Enter the street address and house number (max 80 chars)",
    country: "Use 2-letter country code (AT, US, GB) or full country name",
    primaryCategory: "Contact your project manager for the correct Google Business Category",
    additionalCategories: "Separate multiple categories with commas (max 10 categories)",
    website: "URL must start with https:// or http:// — Example: https://www.example.com",
    primaryPhone: "Use format with country code: +43-1-236-2933 or local: 01 236 2933",
    mondayHours: "Use format: '09:00-17:00' or '09:00-12:00,13:00-17:00' or 'x' for closed",
    specialHours: "Use format: '2025-12-25: x, 2025-01-01: 10:00-15:00' - ONLY use 'x' for closed (not 'y' or other letters)",
    latitude: "Must be between -90 and 90 degrees",
    longitude: "Must be between -180 and 180 degrees"
  };
  
  return suggestions[field] || "Please check the format and requirements for this field";
}

export function generateStoreCode(businessName: string, existingCodes: string[]): string {
  // Clean business name to create a base
  const cleanName = businessName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 8);
  
  let counter = 1;
  let baseCode = cleanName || 'STORE';
  
  while (true) {
    const code = `${baseCode}${counter.toString().padStart(3, '0')}`;
    if (!existingCodes.includes(code) && code.length <= 64) {
      return code;
    }
    counter++;
    
    // If we've tried too many variations, fall back to simple numbering
    if (counter > 999) {
      baseCode = 'STORE';
    }
  }
}

export function validateSpecialHours(specialHours: string): { isValid: boolean; errors: string[] } {
  if (!specialHours || specialHours.trim() === '') {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];
  
  // Check overall format first
  if (!specialHoursPattern.test(specialHours)) {
    // Parse individual entries to provide specific feedback
    const entries = specialHours.split(',').map(entry => entry.trim());
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Check date format (YYYY-MM-DD)
      if (!entry.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}:/)) {
        errors.push(`Entry ${i + 1}: Date must be in YYYY-MM-DD format (e.g., "2025-12-25:")`);
        continue;
      }
      
      const [datePart, timePart] = entry.split(':').map(part => part.trim());
      
      // Validate date format
      if (!datePart.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        errors.push(`Entry ${i + 1}: Invalid date format "${datePart}". Use YYYY-MM-DD`);
      }
      
      // Validate time part
      if (!timePart) {
        errors.push(`Entry ${i + 1}: Missing time after date. Use "x" for closed or "HH:MM-HH:MM" for hours`);
      } else if (timePart !== 'x' && !timePart.match(/^[0-9]{1,2}:[0-9]{2} ?- ?[0-9]{1,2}:[0-9]{2}$/)) {
        if (timePart.toLowerCase() === 'y' || timePart.match(/^[a-zA-Z]$/)) {
          errors.push(`Entry ${i + 1}: Use "x" (lowercase) for closed days, not "${timePart}"`);
        } else {
          errors.push(`Entry ${i + 1}: Invalid time format "${timePart}". Use "x" for closed or "HH:MM-HH:MM" format`);
        }
      }
    }
    
    if (errors.length === 0) {
      errors.push("Invalid special hours format. Please check the overall structure.");
    }
    
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: [] };
}