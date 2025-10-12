export interface Business {
  id: string;
  user_id: string;
  client_id?: string;
  
  // Required fields
  storeCode: string;
  businessName: string;
  addressLine1: string;
  country: string;
  primaryCategory: string;
  
  // Optional address fields
  addressLine2?: string;
  addressLine3?: string;
  addressLine4?: string;
  addressLine5?: string;
  postalCode?: string;
  district?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  
  // Category and business info
  additionalCategories?: string; // comma-separated string
  website?: string;
  primaryPhone?: string;
  additionalPhones?: string;
  adwords?: string;
  openingDate?: string;
  fromTheBusiness?: string;
  labels?: string;
  
  // Individual day hours
  mondayHours?: string | null;
  tuesdayHours?: string | null;
  wednesdayHours?: string | null;
  thursdayHours?: string | null;
  fridayHours?: string | null;
  saturdayHours?: string | null;
  sundayHours?: string | null;
  specialHours?: string;
  moreHours?: any[];
  
  // Status
  status?: string;
  temporarilyClosed?: boolean;
  
  // Photos as URLs
  logoPhoto?: string;
  coverPhoto?: string;
  otherPhotos?: string; // comma-separated URLs
  
  // Service URLs
  appointmentURL?: string;
  menuURL?: string;
  reservationsURL?: string;
  orderAheadURL?: string;
  
  // Services and social media
  customServices?: any[];
  socialMediaUrls?: any[];
  
  // Relevant location relationship (parent location like mall/airport)
  relevantLocation?: {
    placeId: string;
    relationType: 'DEPARTMENT_OF' | 'INDEPENDENT_ESTABLISHMENT_IN';
  } | any | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
}