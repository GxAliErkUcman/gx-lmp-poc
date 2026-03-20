import type { Business } from '@/types/business';
import { supabase } from '@/integrations/supabase/client';

export type SeoPriority = 'high' | 'medium' | 'low';

export interface SeoSuggestion {
  field: string;
  priority: SeoPriority;
  category: string;
  message: string;
  impact: string;
}

export interface SeoCategoryScore {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface SeoScoreResult {
  overallScore: number;
  categories: SeoCategoryScore[];
  suggestions: SeoSuggestion[];
  band: 'green' | 'yellow' | 'red';
  gateFailure: boolean;
}

export const SEO_THRESHOLD = 70;

// Cached weights from DB
let cachedWeights: Record<string, number> | null = null;
let cachedBaseScore: number = 45;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

// Per-client profile cache
const clientProfileCache: Record<string, { weights: Record<string, number>; baseScore: number; ts: number }> = {};

export async function loadSeoWeights(): Promise<{ weights: Record<string, number>; baseScore: number }> {
  const now = Date.now();
  if (cachedWeights && now - cacheTimestamp < CACHE_TTL) {
    return { weights: cachedWeights, baseScore: cachedBaseScore };
  }

  try {
    const { data, error } = await supabase
      .from('seo_weights')
      .select('factor_key, weight, base_score');

    if (error || !data || data.length === 0) {
      return { weights: DEFAULT_WEIGHTS, baseScore: 45 };
    }

    const weights: Record<string, number> = {};
    let baseScore = 45;
    data.forEach((row: any) => {
      weights[row.factor_key] = row.weight;
      baseScore = row.base_score;
    });

    cachedWeights = weights;
    cachedBaseScore = baseScore;
    cacheTimestamp = now;

    return { weights, baseScore };
  } catch {
    return { weights: DEFAULT_WEIGHTS, baseScore: 45 };
  }
}

// Load weights for a specific client (checks for assigned profile first)
export async function loadClientSeoWeights(clientId: string): Promise<{ weights: Record<string, number>; baseScore: number }> {
  const now = Date.now();
  const cached = clientProfileCache[clientId];
  if (cached && now - cached.ts < CACHE_TTL) {
    return { weights: cached.weights, baseScore: cached.baseScore };
  }

  try {
    // Check if client has a custom profile assigned
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('seo_weight_profile_id')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData?.seo_weight_profile_id) {
      // No custom profile — use global weights
      return loadSeoWeights();
    }

    const profileId = clientData.seo_weight_profile_id;

    // Fetch profile base_score
    const { data: profileData } = await supabase
      .from('seo_weight_profiles')
      .select('base_score')
      .eq('id', profileId)
      .single();

    // Fetch profile items
    const { data: items } = await supabase
      .from('seo_weight_profile_items')
      .select('factor_key, weight')
      .eq('profile_id', profileId);

    if (!items || items.length === 0) {
      return loadSeoWeights();
    }

    const weights: Record<string, number> = {};
    items.forEach((item: any) => {
      weights[item.factor_key] = item.weight;
    });

    const baseScore = profileData?.base_score ?? 45;

    clientProfileCache[clientId] = { weights, baseScore, ts: now };
    return { weights, baseScore };
  } catch {
    return loadSeoWeights();
  }
}

// Allow forcing cache invalidation
export function invalidateSeoWeightsCache() {
  cachedWeights = null;
  cacheTimestamp = 0;
  // Also clear client caches
  Object.keys(clientProfileCache).forEach(k => delete clientProfileCache[k]);
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  additionalCategories: 8,
  fromTheBusiness: 7,
  postalCode: 7,
  latLong: 8,
  primaryPhone: 8,
  website: 9,
  socialMediaUrls: 3,
  openingHours: 10,
  specialHours: 8,
  coverPhoto: 8,
  otherPhotos: 7,
  customServices: 8,
  labels: 2,
  serviceUrls: 3,
};

function hasValue(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return true;
}

function countOtherPhotos(otherPhotos: string | undefined | null): number {
  if (!otherPhotos || typeof otherPhotos !== 'string') return 0;
  return otherPhotos.split(',').filter(u => u.trim().length > 0).length;
}

function countFilledHours(b: Business): number {
  const days = [b.mondayHours, b.tuesdayHours, b.wednesdayHours, b.thursdayHours, b.fridayHours, b.saturdayHours, b.sundayHours];
  return days.filter(d => hasValue(d)).length;
}

function parseSocialMedia(val: any): any[] {
  if (!val) return [];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  if (Array.isArray(val)) return val;
  return [];
}

function parseCustomServices(val: any): any[] {
  if (!val) return [];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  if (Array.isArray(val)) return val;
  return [];
}

export function calculateSeoScore(business: Business, w: Record<string, number> = DEFAULT_WEIGHTS, baseScore: number = 45): SeoScoreResult {
  const suggestions: SeoSuggestion[] = [];

  // === GATE CHECK: Required fields — if ANY missing, score is ZERO ===
  const gateFields = [
    { field: 'businessName', value: business.businessName, label: 'Business Name' },
    { field: 'primaryCategory', value: business.primaryCategory, label: 'Primary Category' },
    { field: 'addressLine1', value: business.addressLine1, label: 'Address Line 1' },
    { field: 'city', value: business.city, label: 'City' },
  ];

  const missingGates = gateFields.filter(g => !hasValue(g.value));
  if (missingGates.length > 0) {
    missingGates.forEach(g => {
      suggestions.push({
        field: g.field,
        priority: 'high',
        category: 'Required Fields',
        message: `Add ${g.label} — listing cannot exist without it`,
        impact: 'This field is mandatory. Without it, the listing has zero SEO value.',
      });
    });

    const categories: SeoCategoryScore[] = [
      { name: 'Core Identity', score: 0, maxScore: (w.additionalCategories || 0) + (w.fromTheBusiness || 0), percentage: 0 },
      { name: 'Address & Geo', score: 0, maxScore: (w.postalCode || 0) + (w.latLong || 0), percentage: 0 },
      { name: 'Contact & Web', score: 0, maxScore: (w.primaryPhone || 0) + (w.website || 0) + (w.socialMediaUrls || 0), percentage: 0 },
      { name: 'Opening Hours', score: 0, maxScore: (w.openingHours || 0) + (w.specialHours || 0), percentage: 0 },
      { name: 'Photos & Media', score: 0, maxScore: (w.coverPhoto || 0) + (w.otherPhotos || 0), percentage: 0 },
      { name: 'Services & Extras', score: 0, maxScore: (w.customServices || 0) + (w.labels || 0) + (w.serviceUrls || 0), percentage: 0 },
    ];

    return { overallScore: 0, categories, suggestions, band: 'red', gateFailure: true };
  }

  // === CORE IDENTITY ===
  let coreScore = 0;
  const coreMax = (w.additionalCategories || 0) + (w.fromTheBusiness || 0);

  if (hasValue(business.additionalCategories)) { coreScore += w.additionalCategories || 0; }
  else { suggestions.push({ field: 'additionalCategories', priority: 'medium', category: 'Core Identity', message: 'Add additional categories to increase visibility', impact: 'Additional categories help you appear in more search results' }); }

  if (hasValue(business.fromTheBusiness)) {
    const len = business.fromTheBusiness!.length;
    if (len >= 100 && len <= 750) {
      coreScore += w.fromTheBusiness || 0;
    } else {
      coreScore += Math.floor((w.fromTheBusiness || 0) * 0.43);
      if (len < 100) {
        suggestions.push({ field: 'fromTheBusiness', priority: 'medium', category: 'Core Identity', message: 'Expand your business description to at least 100 characters', impact: 'Longer descriptions improve keyword relevance and engagement' });
      } else {
        suggestions.push({ field: 'fromTheBusiness', priority: 'low', category: 'Core Identity', message: 'Shorten your business description to 750 characters or less', impact: 'Overly long descriptions may be truncated by Google' });
      }
    }
  } else {
    suggestions.push({ field: 'fromTheBusiness', priority: 'high', category: 'Core Identity', message: 'Add a business description ("From the Business")', impact: 'Descriptions significantly boost local search rankings' });
  }

  // === ADDRESS & GEO ===
  let addrScore = 0;
  const addrMax = (w.postalCode || 0) + (w.latLong || 0);

  if (hasValue(business.postalCode)) { addrScore += w.postalCode || 0; }
  else { suggestions.push({ field: 'postalCode', priority: 'medium', category: 'Address & Geo', message: 'Add a postal code', impact: 'Postal codes improve proximity-based search results' }); }

  if (hasValue(business.latitude) && hasValue(business.longitude)) { addrScore += w.latLong || 0; }
  else { suggestions.push({ field: 'latitude/longitude', priority: 'high', category: 'Address & Geo', message: 'Add GPS coordinates (latitude & longitude)', impact: 'Coordinates are critical for Google Maps placement and proximity ranking' }); }

  // === CONTACT & WEB ===
  let contactScore = 0;
  const contactMax = (w.primaryPhone || 0) + (w.website || 0) + (w.socialMediaUrls || 0);

  if (hasValue(business.primaryPhone)) { contactScore += w.primaryPhone || 0; }
  else { suggestions.push({ field: 'primaryPhone', priority: 'high', category: 'Contact & Web', message: 'Add a phone number', impact: 'Phone numbers increase trust and click-to-call conversions' }); }

  if (hasValue(business.website)) { contactScore += w.website || 0; }
  else { suggestions.push({ field: 'website', priority: 'high', category: 'Contact & Web', message: 'Add a website URL', impact: 'Website links drive traffic and improve search authority' }); }

  const socialMedia = parseSocialMedia(business.socialMediaUrls);
  if (socialMedia.length >= 2) { contactScore += w.socialMediaUrls || 0; }
  else if (socialMedia.length === 1) {
    contactScore += Math.floor((w.socialMediaUrls || 0) * 0.33);
    suggestions.push({ field: 'socialMediaUrls', priority: 'low', category: 'Contact & Web', message: 'Add at least 2 social media profiles', impact: 'Social signals strengthen your online presence' });
  }
  else { suggestions.push({ field: 'socialMediaUrls', priority: 'low', category: 'Contact & Web', message: 'Add social media profiles', impact: 'Social signals strengthen your online presence' }); }

  // === OPENING HOURS ===
  let hoursScore = 0;
  const hoursMax = (w.openingHours || 0) + (w.specialHours || 0);

  const filledDays = countFilledHours(business);
  // If at least one day has hours, the location has a defined schedule.
  // Days without hours simply mean "closed" — that's valid, not a penalty.
  if (filledDays > 0) {
    hoursScore += w.openingHours || 0;
  } else {
    suggestions.push({ field: 'openingHours', priority: 'high', category: 'Opening Hours', message: 'Add opening hours for your business', impact: 'Opening hours are one of the top local SEO ranking factors' });
  }

  if (hasValue(business.specialHours)) { hoursScore += w.specialHours || 0; }
  else { suggestions.push({ field: 'specialHours', priority: 'medium', category: 'Opening Hours', message: 'Add special/holiday hours', impact: 'Special hours prevent customer frustration and improve trust' }); }

  // === PHOTOS & MEDIA ===
  let photosScore = 0;
  const photosMax = (w.coverPhoto || 0) + (w.otherPhotos || 0);

  if (hasValue(business.coverPhoto)) { photosScore += w.coverPhoto || 0; }
  else { suggestions.push({ field: 'coverPhoto', priority: 'medium', category: 'Photos & Media', message: 'Upload a cover photo', impact: 'Cover photos are the first visual impression on your listing' }); }

  const photoCount = countOtherPhotos(business.otherPhotos);
  if (photoCount >= 3) { photosScore += w.otherPhotos || 0; }
  else if (photoCount > 0) {
    photosScore += Math.floor((w.otherPhotos || 0) * 0.43);
    suggestions.push({ field: 'otherPhotos', priority: 'medium', category: 'Photos & Media', message: `Add more photos (${photoCount}/3+ recommended)`, impact: 'Listings with 3+ photos get 42% more direction requests' });
  }
  else { suggestions.push({ field: 'otherPhotos', priority: 'medium', category: 'Photos & Media', message: 'Add at least 3 additional photos', impact: 'Listings with photos get 42% more direction requests and 35% more clicks' }); }

  // === SERVICES & EXTRAS ===
  let servicesScore = 0;
  const servicesMax = (w.customServices || 0) + (w.labels || 0) + (w.serviceUrls || 0);

  const services = parseCustomServices(business.customServices);
  if (services.length > 0) { servicesScore += w.customServices || 0; }
  else { suggestions.push({ field: 'customServices', priority: 'low', category: 'Services & Extras', message: 'Add services to showcase your offerings', impact: 'Services help match user search intent' }); }

  if (hasValue(business.labels)) { servicesScore += w.labels || 0; }

  const serviceUrls = [business.menuURL, business.reservationsURL, business.orderAheadURL, business.appointmentURL];
  const filledUrls = serviceUrls.filter(u => hasValue(u)).length;
  if (filledUrls >= 1) { servicesScore += Math.min(filledUrls, w.serviceUrls || 0); }

  // === CALCULATE TOTALS ===
  const MAX_SCORE = Object.values(w).reduce((s, v) => s + v, 0);
  const rawScore = coreScore + addrScore + contactScore + hoursScore + photosScore + servicesScore;
  const remaining = 100 - baseScore;
  const factorPercentage = MAX_SCORE > 0 ? rawScore / MAX_SCORE : 0;
  const overallScore = Math.round(baseScore + factorPercentage * remaining);

  const categories: SeoCategoryScore[] = [
    { name: 'Core Identity', score: coreScore, maxScore: coreMax, percentage: coreMax > 0 ? Math.round((coreScore / coreMax) * 100) : 0 },
    { name: 'Address & Geo', score: addrScore, maxScore: addrMax, percentage: addrMax > 0 ? Math.round((addrScore / addrMax) * 100) : 0 },
    { name: 'Contact & Web', score: contactScore, maxScore: contactMax, percentage: contactMax > 0 ? Math.round((contactScore / contactMax) * 100) : 0 },
    { name: 'Opening Hours', score: hoursScore, maxScore: hoursMax, percentage: hoursMax > 0 ? Math.round((hoursScore / hoursMax) * 100) : 0 },
    { name: 'Photos & Media', score: photosScore, maxScore: photosMax, percentage: photosMax > 0 ? Math.round((photosScore / photosMax) * 100) : 0 },
    { name: 'Services & Extras', score: servicesScore, maxScore: servicesMax, percentage: servicesMax > 0 ? Math.round((servicesScore / servicesMax) * 100) : 0 },
  ];

  const priorityOrder: Record<SeoPriority, number> = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const band: 'green' | 'yellow' | 'red' = overallScore >= 80 ? 'green' : overallScore >= 50 ? 'yellow' : 'red';

  return { overallScore, categories, suggestions, band, gateFailure: false };
}

export function calculateClientSeoStats(businesses: Business[], weights?: Record<string, number>, baseScore?: number) {
  if (businesses.length === 0) {
    return {
      averageScore: 0,
      distribution: { green: 0, yellow: 0, red: 0 },
      lowestScoring: [],
      commonMissingFields: [],
    };
  }

  const w = weights || DEFAULT_WEIGHTS;
  const bs = baseScore ?? 45;

  const results = businesses.map(b => ({ business: b, result: calculateSeoScore(b, w, bs) }));
  const averageScore = Math.round(results.reduce((sum, r) => sum + r.result.overallScore, 0) / results.length);

  const distribution = { green: 0, yellow: 0, red: 0 };
  results.forEach(r => { distribution[r.result.band]++; });

  const lowestScoring = [...results]
    .sort((a, b) => a.result.overallScore - b.result.overallScore)
    .slice(0, 10)
    .map(r => ({ business: r.business, score: r.result.overallScore, band: r.result.band }));

  const fieldCounts: Record<string, number> = {};
  results.forEach(r => {
    r.result.suggestions.forEach(s => {
      fieldCounts[s.field] = (fieldCounts[s.field] || 0) + 1;
    });
  });

  const commonMissingFields = Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([field, count]) => ({ field, count, percentage: Math.round((count / businesses.length) * 100) }));

  return { averageScore, distribution, lowestScoring, commonMissingFields };
}
