import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ValidationErrors } from '@/components/ValidationErrors';
import { validateBusiness, generateStoreCode } from '@/lib/validation';
import { Business } from '@/types/business';
import PhotoUpload from '@/components/PhotoUpload';
import OpeningHours from '@/components/OpeningHours';
import LocationMap from '@/components/LocationMap';
import { CategorySelect } from '@/components/CategorySelect';
import { CountrySelect } from '@/components/CountrySelect';
import { CitySelect } from '@/components/CitySelect';

const businessSchema = z.object({
  storeCode: z.string().min(1, 'Store code is required'),
  businessName: z.string().min(1, 'Business name is required'),
  addressLine1: z.string().min(1, 'Street address is required'),
  country: z.string().min(1, 'Country is required'),
  primaryCategory: z.string().min(1, 'Primary category is required'),
  addressLine2: z.string().optional(),
  addressLine3: z.string().optional(),
  addressLine4: z.string().optional(),
  addressLine5: z.string().optional(),
  postalCode: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  additionalCategories: z.string().optional(),
  website: z.string().optional(),
  primaryPhone: z.string().optional(),
  additionalPhones: z.string().optional(),
  adwords: z.string().optional(),
  openingDate: z.string().optional().refine((date) => {
    if (!date) return true; // Optional field
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return selectedDate <= today;
  }, { message: "Opening date cannot be in the future" }),
  fromTheBusiness: z.string().optional(),
  labels: z.string().optional(),
  temporarilyClosed: z.boolean().optional(),
  logoPhoto: z.string().optional(),
  coverPhoto: z.string().optional(),
  otherPhotos: z.string().optional(),
  appointmentURL: z.string().optional(),
  menuURL: z.string().optional(),
  reservationsURL: z.string().optional(),
  orderAheadURL: z.string().optional(),
  // Social Media URLs
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  pinterestUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

interface BusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business?: Business | null;
  onSuccess: () => void;
}

const BusinessDialog = ({ open, onOpenChange, business, onSuccess }: BusinessDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [coverPhoto, setCoverPhoto] = useState<string>('');
  const [hours, setHours] = useState({
    monday: "09:00-18:00",
    tuesday: "09:00-18:00", 
    wednesday: "09:00-18:00",
    thursday: "09:00-18:00",
    friday: "09:00-18:00",
    saturday: "10:00-14:00",
    sunday: null as string | null
  });

  const [socialMediaUrls, setSocialMediaUrls] = useState({
    facebookUrl: "",
    instagramUrl: "",
    linkedinUrl: "",
    pinterestUrl: "",
    tiktokUrl: "",
    twitterUrl: "",
    youtubeUrl: ""
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      storeCode: "",
      businessName: "",
      addressLine1: "",
      country: "",
      primaryCategory: "",
      temporarilyClosed: false,
      facebookUrl: "",
      instagramUrl: "",
      linkedinUrl: "",
      pinterestUrl: "",
      tiktokUrl: "",
      twitterUrl: "",
      youtubeUrl: "",
    }
  });

  // Generate store code when business name changes
  const businessName = watch('businessName');
  useEffect(() => {
    if (businessName && !business && !watch('storeCode')) {
      // Auto-generate store code for new businesses
      const generateCode = async () => {
        try {
          const { data: existingBusinesses } = await supabase
            .from('businesses')
            .select('storeCode');
          
          const existingCodes = existingBusinesses?.map(b => b.storeCode) || [];
          const newCode = generateStoreCode(businessName, existingCodes);
          setValue('storeCode', newCode);
        } catch (error) {
          console.error('Error generating store code:', error);
        }
      };
      generateCode();
    }
  }, [businessName, business, setValue, watch]);

  // Fetch fresh business data when dialog opens
  const fetchFreshBusinessData = async (businessId: string) => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      return data as Business;
    } catch (error) {
      console.error('Error fetching fresh business data:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadBusinessData = async () => {
      if (business && open) {
        // Fetch fresh data when dialog opens
        const freshBusiness = await fetchFreshBusinessData(business.id);
        const businessToUse = freshBusiness || business;
        
        // Populate form with existing business data
        setValue('storeCode', businessToUse.storeCode);
        setValue('businessName', businessToUse.businessName);
        setValue('addressLine1', businessToUse.addressLine1);
        setValue('country', businessToUse.country);
        setValue('primaryCategory', businessToUse.primaryCategory);
        setValue('addressLine2', businessToUse.addressLine2 || '');
        setValue('addressLine3', businessToUse.addressLine3 || '');
        setValue('addressLine4', businessToUse.addressLine4 || '');
        setValue('addressLine5', businessToUse.addressLine5 || '');
        setValue('postalCode', businessToUse.postalCode || '');
        setValue('district', businessToUse.district || '');
        setValue('city', businessToUse.city || '');
        setValue('state', businessToUse.state || '');
        setValue('latitude', businessToUse.latitude);
        setValue('longitude', businessToUse.longitude);
        setValue('additionalCategories', businessToUse.additionalCategories || '');
        setValue('website', businessToUse.website || '');
        setValue('primaryPhone', businessToUse.primaryPhone || '');
        setValue('additionalPhones', businessToUse.additionalPhones || '');
        setValue('adwords', businessToUse.adwords || '');
        setValue('openingDate', businessToUse.openingDate || '');
        setValue('fromTheBusiness', businessToUse.fromTheBusiness || '');
        setValue('labels', businessToUse.labels || '');
        setValue('temporarilyClosed', businessToUse.temporarilyClosed || false);
        setValue('logoPhoto', businessToUse.logoPhoto || '');
        setValue('coverPhoto', businessToUse.coverPhoto || '');
        setValue('otherPhotos', businessToUse.otherPhotos || '');
        setValue('appointmentURL', businessToUse.appointmentURL || '');
        setValue('menuURL', businessToUse.menuURL || '');
        setValue('reservationsURL', businessToUse.reservationsURL || '');
        setValue('orderAheadURL', businessToUse.orderAheadURL || '');
        
        // Set social media URLs
        const currentSocialMedia = businessToUse.socialMediaUrls || [];
        const socialMediaData = {
          facebookUrl: currentSocialMedia.find((s: any) => s.name === 'url_facebook')?.url || "",
          instagramUrl: currentSocialMedia.find((s: any) => s.name === 'url_instagram')?.url || "",
          linkedinUrl: currentSocialMedia.find((s: any) => s.name === 'url_linkedin')?.url || "",
          pinterestUrl: currentSocialMedia.find((s: any) => s.name === 'url_pinterest')?.url || "",
          tiktokUrl: currentSocialMedia.find((s: any) => s.name === 'url_tiktok')?.url || "",
          twitterUrl: currentSocialMedia.find((s: any) => s.name === 'url_twitter')?.url || "",
          youtubeUrl: currentSocialMedia.find((s: any) => s.name === 'url_youtube')?.url || "",
        };
        setSocialMediaUrls(socialMediaData);
        setValue('facebookUrl', socialMediaData.facebookUrl);
        setValue('instagramUrl', socialMediaData.instagramUrl);
        setValue('linkedinUrl', socialMediaData.linkedinUrl);
        setValue('pinterestUrl', socialMediaData.pinterestUrl);
        setValue('tiktokUrl', socialMediaData.tiktokUrl);
        setValue('twitterUrl', socialMediaData.twitterUrl);
        setValue('youtubeUrl', socialMediaData.youtubeUrl);
        
        // Set individual day hours
        setHours({
          monday: businessToUse.mondayHours || "09:00-18:00",
          tuesday: businessToUse.tuesdayHours || "09:00-18:00",
          wednesday: businessToUse.wednesdayHours || "09:00-18:00",
          thursday: businessToUse.thursdayHours || "09:00-18:00",
          friday: businessToUse.fridayHours || "09:00-18:00",
          saturday: businessToUse.saturdayHours || "10:00-14:00",
          sunday: businessToUse.sundayHours ?? null
        });

        // Set cover photo
        setCoverPhoto(businessToUse.coverPhoto || '');
      } else if (!business) {
        // Reset for new business
        reset();
        setCoverPhoto('');
        setHours({
          monday: "09:00-18:00",
          tuesday: "09:00-18:00",
          wednesday: "09:00-18:00",
          thursday: "09:00-18:00",
          friday: "09:00-18:00",
          saturday: "10:00-14:00",
          sunday: null
        });
      }
    };

    loadBusinessData();
  }, [business, setValue, reset, open]);

  const onSubmit = async (data: BusinessFormData) => {
    if (!user) return;

    // Normalize opening hours: convert 'Closed' to null
    const normalizeHour = (v: string | null | undefined) =>
      v && typeof v === 'string' && v.toLowerCase() === 'closed' ? null : v;

    const normalizedHours = {
      mondayHours: normalizeHour(hours.monday),
      tuesdayHours: normalizeHour(hours.tuesday),
      wednesdayHours: normalizeHour(hours.wednesday),
      thursdayHours: normalizeHour(hours.thursday),
      fridayHours: normalizeHour(hours.friday),
      saturdayHours: normalizeHour(hours.saturday),
      sundayHours: normalizeHour(hours.sunday),
    };

    // Convert social media URLs to schema format
    const socialMediaUrls = [
      { name: 'url_facebook', url: data.facebookUrl || null },
      { name: 'url_instagram', url: data.instagramUrl || null },
      { name: 'url_linkedin', url: data.linkedinUrl || null },
      { name: 'url_pinterest', url: data.pinterestUrl || null },
      { name: 'url_tiktok', url: data.tiktokUrl || null },
      { name: 'url_twitter', url: data.twitterUrl || null },
      { name: 'url_youtube', url: data.youtubeUrl || null },
    ].filter(item => item.url && item.url.trim() !== '');

    // Validate the complete business data with normalized hours
    const safeLatitude = typeof (data as any).latitude === 'string'
      ? ((data as any).latitude.trim() === '' ? null : Number((data as any).latitude))
      : (data as any).latitude ?? null;
    const safeLongitude = typeof (data as any).longitude === 'string'
      ? ((data as any).longitude.trim() === '' ? null : Number((data as any).longitude))
      : (data as any).longitude ?? null;

    const completeData = {
      ...data,
      latitude: safeLatitude,
      longitude: safeLongitude,
      ...normalizedHours,
      otherPhotos: coverPhoto,
      socialMediaUrls: socialMediaUrls.length > 0 ? socialMediaUrls : null
    };

    const validation = validateBusiness(completeData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before saving",
        variant: "destructive",
      });
      return;
    }

    // Decide status: active if valid and store code is not DB auto-generated
    const isDbAutoStore = /^STORE\d{6}$/.test(data.storeCode || '');
    const newStatus = validation.isValid && !isDbAutoStore ? 'active' : 'pending';

    setLoading(true);
    try {
      // Get the user's profile to get their client_id (required for shared business model)
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // For shared business model, client_id is required
      if (!profile?.client_id) {
        toast({
          title: "Error",
          description: "You must be assigned to a client to create businesses. Please contact your administrator.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const businessData = {
        user_id: user.id,
        storeCode: data.storeCode,
        businessName: data.businessName,
        addressLine1: data.addressLine1,
        country: data.country,
        primaryCategory: data.primaryCategory,
        addressLine2: data.addressLine2 || null,
        addressLine3: data.addressLine3 || null,
        addressLine4: data.addressLine4 || null,
        addressLine5: data.addressLine5 || null,
        postalCode: data.postalCode || null,
        district: data.district || null,
        city: data.city || null,
        state: data.state || null,
        latitude: (typeof data.latitude === 'number' ? data.latitude : null),
        longitude: (typeof data.longitude === 'number' ? data.longitude : null),
        additionalCategories: data.additionalCategories || null,
        website: data.website || null,
        primaryPhone: data.primaryPhone || null,
        additionalPhones: data.additionalPhones || null,
        adwords: data.adwords || null,
        openingDate: data.openingDate || null,
        fromTheBusiness: data.fromTheBusiness || null,
        labels: data.labels || null,
        mondayHours: normalizedHours.mondayHours,
        tuesdayHours: normalizedHours.tuesdayHours,
        wednesdayHours: normalizedHours.wednesdayHours,
        thursdayHours: normalizedHours.thursdayHours,
        fridayHours: normalizedHours.fridayHours,
        saturdayHours: normalizedHours.saturdayHours,
        sundayHours: normalizedHours.sundayHours,
        temporarilyClosed: data.temporarilyClosed || false,
        logoPhoto: data.logoPhoto || null,
        coverPhoto: data.coverPhoto || null,
        otherPhotos: coverPhoto || null,
        appointmentURL: data.appointmentURL || null,
        menuURL: data.menuURL || null,
        reservationsURL: data.reservationsURL || null,
        orderAheadURL: data.orderAheadURL || null,
        socialMediaUrls: socialMediaUrls.length > 0 ? socialMediaUrls : null,
        client_id: profile.client_id, // Required for shared business model
        status: newStatus,
      };

      let error;
      if (business) {
        ({ error } = await supabase
          .from('businesses')
          .update(businessData)
          .eq('id', business.id));
      } else {
        ({ error } = await supabase
          .from('businesses')
          .insert([businessData]));
      }

      if (error) {
        console.error('Database error:', error);
        
        // Re-run validation to show user-friendly errors
        const revalidation = validateBusiness(completeData);
        if (!revalidation.isValid) {
          setValidationErrors(revalidation.errors);
        }
        
        let errorMessage = `Failed to ${business ? 'update' : 'create'} business`;
        
        // Provide more specific error messages
        if (error.message?.includes('duplicate key') || error.message?.includes('storeCode')) {
          errorMessage = 'A business with this store code already exists';
        } else if (error.message?.includes('violates check constraint')) {
          errorMessage = 'Invalid data format detected. Please check all required fields are filled correctly.';
        } else if (error.message?.includes('foreign key')) {
          errorMessage = 'Invalid reference data detected';
        } else if (error.message?.includes('null value')) {
          errorMessage = 'Required field is missing. Please check all required fields are filled.';
        } else if (error.code === '23505') {
          errorMessage = 'Duplicate entry detected - Store code must be unique';
        } else if (error.code === '23503') {
          errorMessage = 'Referenced data not found';
        } else if (error.code === '23514') {
          errorMessage = 'Data validation failed - Please check field formats';
        } else if (error.code === '23502') {
          errorMessage = 'Required field is missing';
        } else if (error.message) {
          // Include the actual error message for debugging
          errorMessage = `${errorMessage}: ${error.message}`;
        }
        
        throw new Error(errorMessage);
      }

      toast({
        title: "Success",
        description: `Business ${business ? 'updated' : 'created'} successfully`,
      });

      setValidationErrors([]);
      onSuccess();
    } catch (error: any) {
      console.error('Error saving business:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${business ? 'update' : 'create'} business`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (lat: number | null, lng: number | null) => {
    try {
      setValue('latitude', lat);
      setValue('longitude', lng);
      
      // Clear any previous location-related validation errors
      setValidationErrors(prev => prev.filter(err => 
        !['latitude', 'longitude', 'location'].includes(err.field.toLowerCase())
      ));
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Location Update Error",
        description: "Failed to update location coordinates",
        variant: "destructive",
      });
    }
  };

  const handleCoverPhotoChange = (photos: string[]) => {
    const photoUrl = photos[0] || '';
    setCoverPhoto(photoUrl);
    setValue('coverPhoto', photoUrl);
  };

  const getCurrentAddress = () => {
    const addressLine1 = watch('addressLine1') || '';
    const city = watch('city') || '';
    const state = watch('state') || '';
    const country = watch('country') || '';
    
    return [addressLine1, city, state, country].filter(Boolean).join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {business ? 'Edit Business' : 'Add New Business'}
          </DialogTitle>
          <DialogDescription>
            {business ? 'Update business information and location details.' : 'Create a new business listing with all required information.'}
          </DialogDescription>
        </DialogHeader>

        {validationErrors.length > 0 && (
          <ValidationErrors errors={validationErrors} className="mb-4" />
        )}

        <form onSubmit={handleSubmit(onSubmit, (formErrors: any) => {
          try {
            const collected = Object.entries(formErrors || {}).map(([field, err]: any) => ({
              field,
              message: err?.message || 'Invalid value'
            }));
            setValidationErrors(collected);
            toast({
              title: 'Validation Error',
              description: 'Please review the highlighted fields and try again.',
              variant: 'destructive',
            });
          } catch (e) {
            console.error('Validation parse error:', e);
          }
        })} className="space-y-6">
          {/* Required Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Required Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="storeCode">Store Code *</Label>
                <Input {...register('storeCode')} id="storeCode" />
                {errors.storeCode && (
                  <p className="text-sm text-destructive mt-1">{errors.storeCode.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input {...register('businessName')} id="businessName" />
                {errors.businessName && (
                  <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="addressLine1">Street Address *</Label>
                <Input {...register('addressLine1')} id="addressLine1" />
                {errors.addressLine1 && (
                  <p className="text-sm text-destructive mt-1">{errors.addressLine1.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <CountrySelect
                  value={watch('country')}
                  onValueChange={(value) => {
                    setValue('country', value, { shouldValidate: true, shouldTouch: true });
                  }}
                  placeholder="Select country..."
                  required
                />
                {errors.country && (
                  <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="primaryCategory">Primary Category *</Label>
                <CategorySelect
                  value={watch('primaryCategory')}
                  onValueChange={(value) => setValue('primaryCategory', value)}
                  placeholder="Select primary category..."
                  required
                />
                {errors.primaryCategory && (
                  <p className="text-sm text-destructive mt-1">{errors.primaryCategory.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Address Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Address Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input {...register('addressLine2')} id="addressLine2" placeholder="Suite, building, floor" />
              </div>
              <div>
                <Label htmlFor="addressLine3">Address Line 3</Label>
                <Input {...register('addressLine3')} id="addressLine3" placeholder="Additional address info" />
              </div>
              <div>
                <Label htmlFor="addressLine4">Address Line 4</Label>
                <Input {...register('addressLine4')} id="addressLine4" placeholder="Additional address info" />
              </div>
              <div>
                <Label htmlFor="addressLine5">Address Line 5</Label>
                <Input {...register('addressLine5')} id="addressLine5" placeholder="Additional address info" />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <CitySelect
                  value={watch('city')}
                  onValueChange={(value) => setValue('city', value)}
                  countryCode={watch('country')}
                  placeholder="Select city..."
                />
              </div>
              <div>
                <Label htmlFor="state">State/Region</Label>
                <Input {...register('state')} id="state" />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input {...register('postalCode')} id="postalCode" />
              </div>
              <div>
                <Label htmlFor="district">District</Label>
                <Input {...register('district')} id="district" placeholder="Neighborhood, borough" />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="primaryPhone">Primary Phone</Label>
                <Input {...register('primaryPhone')} id="primaryPhone" placeholder="+43-1-236-2933" />
              </div>
              <div>
                <Label htmlFor="additionalPhones">Additional Phones</Label>
                <Input {...register('additionalPhones')} id="additionalPhones" placeholder="Comma-separated" />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input {...register('website')} id="website" placeholder="https://www.example.com" />
              </div>
              <div>
                <Label htmlFor="adwords">Google Ads Phone</Label>
                <Input {...register('adwords')} id="adwords" placeholder="Internal use only" />
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fromTheBusiness">Description (From the Business)</Label>
                <Textarea 
                  {...register('fromTheBusiness')} 
                  id="fromTheBusiness" 
                  placeholder="Brief description of your business (max 750 characters)"
                  maxLength={750}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="additionalCategories">Additional Categories</Label>
                  <CategorySelect
                    value={watch('additionalCategories')}
                    onValueChange={(value) => setValue('additionalCategories', value)}
                    placeholder="Select additional category..."
                  />
                </div>
                <div>
                  <Label htmlFor="labels">Labels</Label>
                  <Input {...register('labels')} id="labels" placeholder="Internal labels (comma-separated)" />
                </div>
                <div>
                  <Label htmlFor="openingDate">Opening Date</Label>
                  <Input 
                    {...register('openingDate')} 
                    id="openingDate" 
                    type="date" 
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.openingDate && (
                    <p className="text-sm text-destructive mt-1">{errors.openingDate.message}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox {...register('temporarilyClosed')} id="temporarilyClosed" />
                  <Label htmlFor="temporarilyClosed">Temporarily Closed</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Coordinates */}
          <LocationMap
            latitude={watch('latitude') as any}
            longitude={watch('longitude') as any}
            onLocationChange={handleLocationChange}
            address={getCurrentAddress()}
            addressLine1={watch('addressLine1')}
            city={watch('city')}
            state={watch('state')}
            country={watch('country')}
            postalCode={watch('postalCode')}
          />

          {/* Opening Hours */}
          <OpeningHours
            hours={hours}
            onHoursChange={setHours}
          />

          {/* Cover Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                photos={coverPhoto ? [coverPhoto] : []}
                onPhotosChange={handleCoverPhotoChange}
                maxPhotos={1}
              />
            </CardContent>
          </Card>

          {/* Social Media Links */}
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input {...register('facebookUrl')} id="facebookUrl" placeholder="https://www.facebook.com/yourpage" />
              </div>
              <div>
                <Label htmlFor="instagramUrl">Instagram URL</Label>
                <Input {...register('instagramUrl')} id="instagramUrl" placeholder="https://www.instagram.com/youraccount" />
              </div>
              <div>
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input {...register('linkedinUrl')} id="linkedinUrl" placeholder="https://www.linkedin.com/in/yourprofile" />
              </div>
              <div>
                <Label htmlFor="pinterestUrl">Pinterest URL</Label>
                <Input {...register('pinterestUrl')} id="pinterestUrl" placeholder="https://www.pinterest.com/youraccount" />
              </div>
              <div>
                <Label htmlFor="tiktokUrl">TikTok URL</Label>
                <Input {...register('tiktokUrl')} id="tiktokUrl" placeholder="https://www.tiktok.com/@youraccount" />
              </div>
              <div>
                <Label htmlFor="twitterUrl">X (Twitter) URL</Label>
                <Input {...register('twitterUrl')} id="twitterUrl" placeholder="https://www.x.com/youraccount" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="youtubeUrl">YouTube URL</Label>
                <Input {...register('youtubeUrl')} id="youtubeUrl" placeholder="https://www.youtube.com/channel/yourchannel" />
              </div>
            </CardContent>
          </Card>

          {/* Service URLs */}
          <Card>
            <CardHeader>
              <CardTitle>Service URLs</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="appointmentURL">Appointment URLs</Label>
                <Input {...register('appointmentURL')} id="appointmentURL" placeholder="Comma-separated URLs" />
              </div>
              <div>
                <Label htmlFor="menuURL">Menu URL</Label>
                <Input {...register('menuURL')} id="menuURL" placeholder="Single URL" />
              </div>
              <div>
                <Label htmlFor="reservationsURL">Reservations URLs</Label>
                <Input {...register('reservationsURL')} id="reservationsURL" placeholder="Comma-separated URLs" />
              </div>
              <div>
                <Label htmlFor="orderAheadURL">Order Ahead URLs</Label>
                <Input {...register('orderAheadURL')} id="orderAheadURL" placeholder="Comma-separated URLs" />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (business ? 'Update Business' : 'Create Business')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BusinessDialog;