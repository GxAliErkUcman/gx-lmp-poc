export interface BusinessHours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

export interface BusinessProduct {
  name: string;
  description: string;
  price: string;
  url: string;
}

export interface BusinessPhoto {
  fileName: string;
  url: string;
  altText: string;
}

export interface BusinessAddress {
  street: string;
  suite: string;
  city: string;
  postalCode: string;
  region: string;
  country: string;
}

export interface BusinessCoordinates {
  lat: number;
  lng: number;
}

export interface BusinessGoogleIds {
  placeId: string;
  cid: string;
  businessProfileId: string;
  kgId: string;
}

export interface BusinessReviews {
  count: number;
  rating: number;
}

export interface Business {
  id?: string;
  businessName: string;
  primaryCategory: string;
  additionalCategories: string[];
  address: BusinessAddress;
  serviceArea: string[];
  phone: string;
  website: string;
  hours: BusinessHours;
  description: string;
  attributes: string[];
  products: BusinessProduct[];
  photos: BusinessPhoto[];
  coordinates: BusinessCoordinates;
  googleIds: BusinessGoogleIds;
  openingDate: string;
  reviews: BusinessReviews;
}

export interface DatabaseBusiness {
  id: string;
  user_id: string;
  business_name: string;
  primary_category: string | null;
  additional_categories: string[];
  street: string | null;
  suite: string | null;
  city: string | null;
  postal_code: string | null;
  region: string | null;
  country: string | null;
  service_area: string[];
  phone: string | null;
  website: string | null;
  hours: any; // JSON type from Supabase
  description: string | null;
  attributes: string[];
  products: any[]; // JSON type from Supabase
  photos: any[]; // JSON type from Supabase
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  cid: string | null;
  business_profile_id: string | null;
  kg_id: string | null;
  opening_date: string | null;
  review_count: number;
  review_rating: number | null;
  created_at: string;
  updated_at: string;
}