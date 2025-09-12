import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  additionalCategories: z.string().optional(),
  website: z.string().optional(),
  primaryPhone: z.string().optional(),
  additionalPhones: z.string().optional(),
  adwords: z.string().optional(),
  openingDate: z.string().optional(),
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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      storeCode: "",
      businessName: "",
      addressLine1: "",
      country: "",
      primaryCategory: "",
      temporarilyClosed: false,
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

  useEffect(() => {
    if (business) {
      // Populate form with existing business data
      setValue('storeCode', business.storeCode);
      setValue('businessName', business.businessName);
      setValue('addressLine1', business.addressLine1);
      setValue('country', business.country);
      setValue('primaryCategory', business.primaryCategory);
      setValue('addressLine2', business.addressLine2 || '');
      setValue('addressLine3', business.addressLine3 || '');
      setValue('addressLine4', business.addressLine4 || '');
      setValue('addressLine5', business.addressLine5 || '');
      setValue('postalCode', business.postalCode || '');
      setValue('district', business.district || '');
      setValue('city', business.city || '');
      setValue('state', business.state || '');
      setValue('latitude', business.latitude);
      setValue('longitude', business.longitude);
      setValue('additionalCategories', business.additionalCategories || '');
      setValue('website', business.website || '');
      setValue('primaryPhone', business.primaryPhone || '');
      setValue('additionalPhones', business.additionalPhones || '');
      setValue('adwords', business.adwords || '');
      setValue('openingDate', business.openingDate || '');
      setValue('fromTheBusiness', business.fromTheBusiness || '');
      setValue('labels', business.labels || '');
      setValue('temporarilyClosed', business.temporarilyClosed || false);
      setValue('logoPhoto', business.logoPhoto || '');
      setValue('coverPhoto', business.coverPhoto || '');
      setValue('otherPhotos', business.otherPhotos || '');
      setValue('appointmentURL', business.appointmentURL || '');
      setValue('menuURL', business.menuURL || '');
      setValue('reservationsURL', business.reservationsURL || '');
      setValue('orderAheadURL', business.orderAheadURL || '');
      
      // Set individual day hours
      setHours({
        monday: business.mondayHours || "09:00-18:00",
        tuesday: business.tuesdayHours || "09:00-18:00",
        wednesday: business.wednesdayHours || "09:00-18:00",
        thursday: business.thursdayHours || "09:00-18:00",
        friday: business.fridayHours || "09:00-18:00",
        saturday: business.saturdayHours || "10:00-14:00",
        sunday: business.sundayHours ?? null
      });

      // Set cover photo
      setCoverPhoto(business.coverPhoto || '');
    } else {
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
  }, [business, setValue, reset]);

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

    // Validate the complete business data with normalized hours
    const completeData = {
      ...data,
      ...normalizedHours,
      otherPhotos: coverPhoto
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
        latitude: data.latitude || null,
        longitude: data.longitude || null,
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

      if (error) throw error;

      toast({
        title: "Success",
        description: `Business ${business ? 'updated' : 'created'} successfully`,
      });

      setValidationErrors([]);
      onSuccess();
    } catch (error) {
      console.error('Error saving business:', error);
      toast({
        title: "Error",
        description: `Failed to ${business ? 'update' : 'create'} business`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setValue('latitude', lat);
    setValue('longitude', lng);
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
        </DialogHeader>

        {validationErrors.length > 0 && (
          <ValidationErrors errors={validationErrors} className="mb-4" />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                <Input {...register('country')} id="country" placeholder="AT, US, GB or full name" />
                {errors.country && (
                  <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="primaryCategory">Primary Category *</Label>
                <Input {...register('primaryCategory')} id="primaryCategory" placeholder="Contact your project manager for correct category" />
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
                <Input {...register('city')} id="city" />
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
                  <Input {...register('additionalCategories')} id="additionalCategories" placeholder="Comma-separated (max 10)" />
                </div>
                <div>
                  <Label htmlFor="labels">Labels</Label>
                  <Input {...register('labels')} id="labels" placeholder="Internal labels (comma-separated)" />
                </div>
                <div>
                  <Label htmlFor="openingDate">Opening Date</Label>
                  <Input {...register('openingDate')} id="openingDate" type="date" />
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
            latitude={business?.latitude}
            longitude={business?.longitude}
            onLocationChange={handleLocationChange}
            address={getCurrentAddress()}
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