import { useState, useEffect, useRef } from 'react';
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
import SpecialHours, { SpecialHourEntry, parseSpecialHoursFromSchema, formatSpecialHoursToSchema } from './SpecialHours';
import { Business } from '@/types/business';
import PhotoUpload from '@/components/PhotoUpload';
import OpeningHours from '@/components/OpeningHours';
import LocationMap from '@/components/LocationMap';
import { CategorySelect } from '@/components/CategorySelect';
import { CountrySelect, getCountryCode } from '@/components/CountrySelect';
import { CitySelect } from '@/components/CitySelect';
import CategoryNameChangeDialog from '@/components/CategoryNameChangeDialog';
import BusinessCustomServicesDialog from '@/components/BusinessCustomServicesDialog';
import { useFieldPermissions } from '@/hooks/use-field-permissions';
import { LockedFieldWrapper } from '@/components/LockedFieldWrapper';
import { trackFieldChanges, trackBusinessCreated } from '@/lib/fieldHistory';
import { useTranslation } from 'react-i18next';

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
  specialHours: z.string().optional(),
  // Social Media URLs
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  pinterestUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  // Goldmine - unstructured data (not included in JSON exports)
  goldmine: z.string().optional(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

interface BusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business?: Business | null;
  onSuccess: () => void;
  clientId?: string; // when provided, force new businesses to this client
}

const BusinessDialog = ({ open, onOpenChange, business, onSuccess, clientId }: BusinessDialogProps) => {
  const { t } = useTranslation();
  const { t: tFields } = useTranslation('fields');
  const { user } = useAuth();
  const { isFieldLocked, isGroupLocked, loading: permissionsLoading } = useFieldPermissions(clientId || business?.client_id);
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
  const [specialHours, setSpecialHours] = useState<SpecialHourEntry[]>([]);
  const [initialBusinessName, setInitialBusinessName] = useState<string>('');
  const [initialPrimaryCategory, setInitialPrimaryCategory] = useState<string>('');
  const [categoryNameWarningOpen, setCategoryNameWarningOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [customServicesDialogOpen, setCustomServicesDialogOpen] = useState(false);
  const [customServices, setCustomServices] = useState<any[]>([]);
  
  // Store original business data for field history tracking
  const originalBusinessDataRef = useRef<Record<string, any> | null>(null);

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
      goldmine: "",
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
        // Convert country name to code if necessary (for imported data)
        setValue('country', getCountryCode(businessToUse.country));
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
        setValue('goldmine', businessToUse.goldmine || '');
        setSpecialHours(parseSpecialHoursFromSchema(businessToUse.specialHours));
        
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
          monday: businessToUse.mondayHours || null,
          tuesday: businessToUse.tuesdayHours || null,
          wednesday: businessToUse.wednesdayHours || null,
          thursday: businessToUse.thursdayHours || null,
          friday: businessToUse.fridayHours || null,
          saturday: businessToUse.saturdayHours || null,
          sunday: businessToUse.sundayHours || null
        });

        // Set cover photo
        setCoverPhoto(businessToUse.coverPhoto || '');
        
        // Set custom services
        setCustomServices(businessToUse.customServices || []);
        
        // Store initial values for critical field change detection
        setInitialBusinessName(businessToUse.businessName || '');
        setInitialPrimaryCategory(businessToUse.primaryCategory || '');
        
        // Store original data for field history tracking
        originalBusinessDataRef.current = { ...businessToUse };
      } else if (!business) {
        // Reset for new business
        reset();
        setCoverPhoto('');
        setSpecialHours([]);
        setCustomServices([]);
        setInitialBusinessName('');
        setInitialPrimaryCategory('');
        setHours({
          monday: "09:00-18:00",
          tuesday: "09:00-18:00",
          wednesday: "09:00-18:00",
          thursday: "09:00-18:00",
          friday: "09:00-18:00",
          saturday: "10:00-14:00",
          sunday: null
        });
        
        // Clear original data for new businesses
        originalBusinessDataRef.current = null;
      }
    };

    loadBusinessData();
  }, [business, setValue, reset, open]);

  // Clear validation errors when form values change
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === 'change' && validationErrors.length > 0) {
        // Clear validation errors when user makes changes
        setValidationErrors([]);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, validationErrors.length]);

  const onSubmit = async (data: BusinessFormData) => {
    if (!user) return;

    // Check if critical fields changed (only for editing existing businesses)
    if (business) {
      // Check for data deletion (fields that had data are now empty)
      const deletedFields: string[] = [];
      const fieldsToCheck = [
        { key: 'city', label: 'City', current: data.city, original: business.city },
        { key: 'state', label: 'State', current: data.state, original: business.state },
        { key: 'postalCode', label: 'Postal Code', current: data.postalCode, original: business.postalCode },
        { key: 'district', label: 'District', current: data.district, original: business.district },
        { key: 'website', label: 'Website', current: data.website, original: business.website },
        { key: 'primaryPhone', label: 'Primary Phone', current: data.primaryPhone, original: business.primaryPhone },
        { key: 'fromTheBusiness', label: 'Description', current: data.fromTheBusiness, original: business.fromTheBusiness },
        { key: 'addressLine2', label: 'Address Line 2', current: data.addressLine2, original: business.addressLine2 },
        { key: 'addressLine3', label: 'Address Line 3', current: data.addressLine3, original: business.addressLine3 },
        { key: 'addressLine4', label: 'Address Line 4', current: data.addressLine4, original: business.addressLine4 },
        { key: 'addressLine5', label: 'Address Line 5', current: data.addressLine5, original: business.addressLine5 },
      ];

      fieldsToCheck.forEach(field => {
        const originalValue = field.original;
        const currentValue = field.current;
        const originalHasData = originalValue && String(originalValue).trim() !== '';
        const currentIsEmpty = !currentValue || String(currentValue).trim() === '';
        
        if (originalHasData && currentIsEmpty) {
          deletedFields.push(field.label);
        }
      });

      if (deletedFields.length > 0) {
        const confirmed = window.confirm(
          `⚠️ Warning: You are deleting existing data!\n\n` +
          `The following fields had data and are now empty:\n` +
          deletedFields.map(f => `• ${f}`).join('\n') +
          `\n\nAre you sure you want to proceed?`
        );
        
        if (!confirmed) {
          return;
        }
      }

      const changedFields: string[] = [];
      if (data.businessName !== initialBusinessName) {
        changedFields.push('Business Name');
      }
      if (data.primaryCategory !== initialPrimaryCategory) {
        changedFields.push('Primary Category');
      }

      if (changedFields.length > 0) {
        // Show warning dialog
        setPendingFormData(data);
        setCategoryNameWarningOpen(true);
        return;
      }
    }

    // Proceed with submission
    await submitBusinessData(data);
  };

  const submitBusinessData = async (data: BusinessFormData) => {
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
      // Get the user's profile to get their default client_id (fallback for non-service flows)
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const effectiveClientId = clientId || profile?.client_id;

      // For shared business model, client_id is required
      if (!effectiveClientId) {
        toast({
          title: "Error",
          description: "Please select a client before creating a business.",
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
        specialHours: formatSpecialHoursToSchema(specialHours) || null,
        temporarilyClosed: data.temporarilyClosed || false,
        logoPhoto: data.logoPhoto || null,
        coverPhoto: data.coverPhoto || null,
        otherPhotos: coverPhoto || null,
        appointmentURL: data.appointmentURL || null,
        menuURL: data.menuURL || null,
        reservationsURL: data.reservationsURL || null,
        orderAheadURL: data.orderAheadURL || null,
        socialMediaUrls: socialMediaUrls.length > 0 ? socialMediaUrls : null,
        customServices: customServices.length > 0 ? customServices : null,
        goldmine: data.goldmine || null,
        client_id: effectiveClientId, // Force to selected client when provided
        status: newStatus,
      };

      let error;
      if (business) {
        // CRITICAL: Verify the business belongs to the correct client before updating
        ({ error } = await supabase
          .from('businesses')
          .update(businessData)
          .eq('id', business.id)
          .eq('client_id', effectiveClientId)); // Prevent cross-client updates
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from('businesses')
          .insert([businessData])
          .select('id, storeCode, businessName');
        
        error = insertError;
        
        // Track new business creation
        if (!insertError && insertedData && insertedData[0] && user) {
          trackBusinessCreated(
            insertedData[0].id,
            insertedData[0].storeCode,
            insertedData[0].businessName,
            user.id,
            'crud'
          ).catch(err => console.error('Error tracking business creation:', err));
        }
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
          errorMessage = 'A required field is missing';
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Track field changes for existing businesses
      if (business && originalBusinessDataRef.current && user) {
        trackFieldChanges(
          business.id,
          originalBusinessDataRef.current,
          businessData,
          user.id,
          'manual_edit'
        ).catch(err => console.error('Error tracking field changes:', err));
      }

      toast({
        title: "Success",
        description: `Business ${business ? 'updated' : 'created'} successfully`,
      });

      onSuccess();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{business ? t('dialog.editBusiness') : t('dialog.addNewBusiness')}</DialogTitle>
          <DialogDescription className="text-sm">
            {business ? t('dialog.updateBusinessInfo') : t('dialog.enterBusinessDetails')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {validationErrors.length > 0 && (
            <ValidationErrors errors={validationErrors} />
          )}

          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">{t('sections.basicInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="storeCode" className="text-sm">{tFields('storeCode')} *</Label>
                  <LockedFieldWrapper isLocked={isFieldLocked('storeCode')}>
                    <Input 
                      {...register('storeCode')} 
                      id="storeCode" 
                      disabled={isFieldLocked('storeCode')}
                      className="mt-1"
                    />
                  </LockedFieldWrapper>
                  {errors.storeCode && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{errors.storeCode.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="businessName" className="text-sm">{tFields('businessName')} *</Label>
                  <LockedFieldWrapper isLocked={isFieldLocked('businessName')}>
                    <Input 
                      {...register('businessName')} 
                      id="businessName"
                      disabled={isFieldLocked('businessName')}
                      className="mt-1"
                    />
                  </LockedFieldWrapper>
                  {errors.businessName && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{errors.businessName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="fromTheBusiness" className="text-sm">{tFields('fromTheBusiness')}</Label>
                <LockedFieldWrapper isLocked={isFieldLocked('fromTheBusiness')}>
                  <Textarea 
                    {...register('fromTheBusiness')} 
                    id="fromTheBusiness"
                    placeholder={t('placeholders.briefDescription')}
                    className="min-h-[100px]"
                    disabled={isFieldLocked('fromTheBusiness')}
                  />
                </LockedFieldWrapper>
                {errors.fromTheBusiness && (
                  <p className="text-sm text-destructive mt-1">{errors.fromTheBusiness.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="labels">{tFields('labels')}</Label>
                <LockedFieldWrapper isLocked={isFieldLocked('labels')}>
                  <Input 
                    {...register('labels')} 
                    id="labels" 
                    placeholder={t('placeholders.labelsExample')}
                    disabled={isFieldLocked('labels')}
                  />
                </LockedFieldWrapper>
                {errors.labels && (
                  <p className="text-sm text-destructive mt-1">{errors.labels.message}</p>
                )}
              </div>

              <div>
                <LockedFieldWrapper isLocked={isFieldLocked('primaryCategory')}>
                  <CategorySelect
                    value={watch('primaryCategory') || ''}
                    onValueChange={(value) => !isFieldLocked('primaryCategory') && setValue('primaryCategory', value)}
                    placeholder={`${tFields('primaryCategory')} *`}
                    required
                    clientId={clientId || business?.client_id}
                  />
                </LockedFieldWrapper>
                {errors.primaryCategory && (
                  <p className="text-sm text-destructive mt-1">{errors.primaryCategory.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="additionalCategories">{tFields('additionalCategories')}</Label>
                <LockedFieldWrapper isLocked={isFieldLocked('additionalCategories')}>
                  <Input 
                    {...register('additionalCategories')} 
                    id="additionalCategories" 
                    placeholder={t('placeholders.additionalCategoriesMax')}
                    disabled={isFieldLocked('additionalCategories')}
                  />
                </LockedFieldWrapper>
                {errors.additionalCategories && (
                  <p className="text-sm text-destructive mt-1">{errors.additionalCategories.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <LockedFieldWrapper isLocked={isFieldLocked('temporarilyClosed')}>
                  <Checkbox 
                    id="temporarilyClosed"
                    checked={watch('temporarilyClosed') || false}
                    onCheckedChange={(checked) => setValue('temporarilyClosed', Boolean(checked))}
                    disabled={isFieldLocked('temporarilyClosed')}
                  />
                </LockedFieldWrapper>
                <Label htmlFor="temporarilyClosed">{tFields('temporarilyClosed')}</Label>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">{t('sections.addressInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <LockedFieldWrapper isLocked={isFieldLocked('country')}>
                <CountrySelect
                  key={business?.id || 'new'}
                  value={watch('country') || ''}
                  onValueChange={(value) => !isFieldLocked('country') && setValue('country', value)}
                  placeholder={`${t('placeholders.selectCountry')} *`}
                />
              </LockedFieldWrapper>
              {errors.country && (
                <p className="text-xs sm:text-sm text-destructive mt-1">{errors.country.message}</p>
              )}

              <div>
                <Label htmlFor="addressLine1" className="text-sm">{tFields('addressLine1')} *</Label>
                <LockedFieldWrapper isLocked={isFieldLocked('addressLine1')}>
                  <Input 
                    {...register('addressLine1')} 
                    id="addressLine1"
                    disabled={isFieldLocked('addressLine1')}
                    className="mt-1"
                  />
                </LockedFieldWrapper>
                {errors.addressLine1 && (
                  <p className="text-xs sm:text-sm text-destructive mt-1">{errors.addressLine1.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="addressLine2" className="text-sm">{tFields('addressLine2')}</Label>
                  <Input {...register('addressLine2')} id="addressLine2" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="addressLine3" className="text-sm">{tFields('addressLine3')}</Label>
                  <Input {...register('addressLine3')} id="addressLine3" className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="addressLine4" className="text-sm">{tFields('addressLine4')}</Label>
                  <Input {...register('addressLine4')} id="addressLine4" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="addressLine5" className="text-sm">{tFields('addressLine5')}</Label>
                  <Input {...register('addressLine5')} id="addressLine5" className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="postalCode" className="text-sm">{tFields('postalCode')}</Label>
                  <Input {...register('postalCode')} id="postalCode" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="district" className="text-sm">{tFields('district')}</Label>
                  <Input {...register('district')} id="district" className="mt-1" />
                </div>
                <CitySelect
                  value={watch('city') || ''}
                  onValueChange={(value) => setValue('city', value)}
                  countryCode={watch('country')}
                />
              </div>

              <div>
                <Label htmlFor="state" className="text-sm">{tFields('state')}</Label>
                <Input {...register('state')} id="state" className="mt-1" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="latitude" className="text-sm">{tFields('latitude')}</Label>
                  <Input 
                    {...register('latitude', { valueAsNumber: true })}
                    id="latitude" 
                    type="number" 
                    step="any"
                    placeholder="e.g., 40.7128"
                  />
                  {errors.latitude && (
                    <p className="text-sm text-destructive mt-1">{errors.latitude.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="longitude">{tFields('longitude')}</Label>
                  <Input 
                    {...register('longitude', { valueAsNumber: true })} 
                    id="longitude" 
                    type="number" 
                    step="any"
                    placeholder="e.g., -74.0060"
                  />
                  {errors.longitude && (
                    <p className="text-sm text-destructive mt-1">{errors.longitude.message}</p>
                  )}
                </div>
              </div>

              <LocationMap 
                latitude={watch('latitude')} 
                longitude={watch('longitude')}
                onLocationChange={(lat, lng) => {
                  setValue('latitude', lat);
                  setValue('longitude', lng);
                }}
              />
            </CardContent>
          </Card>


          {/* Contact Information */}
          <LockedFieldWrapper 
            isLocked={isGroupLocked('contact_information')}
            fieldName={t('sections.contactInformation')}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('sections.contactInformation')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="website">{tFields('website')}</Label>
                  <Input 
                    {...register('website')} 
                    id="website" 
                    type="url" 
                    placeholder="https://www.example.com"
                    disabled={isGroupLocked('contact_information')}
                  />
                  {errors.website && (
                    <p className="text-sm text-destructive mt-1">{errors.website.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryPhone">{tFields('primaryPhone')}</Label>
                    <Input 
                      {...register('primaryPhone')} 
                      id="primaryPhone" 
                      placeholder={t('placeholders.phonePlaceholder')}
                      disabled={isGroupLocked('contact_information')}
                    />
                    {errors.primaryPhone && (
                      <p className="text-sm text-destructive mt-1">{errors.primaryPhone.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="additionalPhones">{tFields('additionalPhones')}</Label>
                    <Input 
                      {...register('additionalPhones')} 
                      id="additionalPhones" 
                      placeholder={t('placeholders.additionalPhonesPlaceholder')}
                      disabled={isGroupLocked('contact_information')}
                    />
                    {errors.additionalPhones && (
                      <p className="text-sm text-destructive mt-1">{errors.additionalPhones.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="adwords">{tFields('adwords')}</Label>
                  <Input 
                    {...register('adwords')} 
                    id="adwords" 
                    placeholder={t('placeholders.phonePlaceholder')}
                    disabled={isGroupLocked('contact_information')}
                  />
                  {errors.adwords && (
                    <p className="text-sm text-destructive mt-1">{errors.adwords.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </LockedFieldWrapper>

          {/* Social Media URLs */}
          <LockedFieldWrapper 
            isLocked={isGroupLocked('social_media')}
            fieldName={t('sections.socialMedia')}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('sections.socialMedia')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="facebookUrl">{tFields('facebookUrl')}</Label>
                    <Input 
                      {...register('facebookUrl')} 
                      id="facebookUrl" 
                      placeholder="https://facebook.com/yourpage"
                      disabled={isGroupLocked('social_media')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="instagramUrl">{tFields('instagramUrl')}</Label>
                    <Input 
                      {...register('instagramUrl')} 
                      id="instagramUrl" 
                      placeholder="https://instagram.com/yourpage"
                      disabled={isGroupLocked('social_media')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkedinUrl">{tFields('linkedinUrl')}</Label>
                    <Input 
                      {...register('linkedinUrl')} 
                      id="linkedinUrl" 
                      placeholder="https://linkedin.com/company/yourcompany"
                      disabled={isGroupLocked('social_media')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pinterestUrl">{tFields('pinterestUrl')}</Label>
                    <Input 
                      {...register('pinterestUrl')} 
                      id="pinterestUrl" 
                      placeholder="https://pinterest.com/yourpage"
                      disabled={isGroupLocked('social_media')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tiktokUrl">{tFields('tiktokUrl')}</Label>
                    <Input 
                      {...register('tiktokUrl')} 
                      id="tiktokUrl" 
                      placeholder="https://tiktok.com/@yourpage"
                      disabled={isGroupLocked('social_media')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterUrl">{tFields('twitterUrl')}</Label>
                    <Input 
                      {...register('twitterUrl')} 
                      id="twitterUrl" 
                      placeholder="https://twitter.com/yourpage"
                      disabled={isGroupLocked('social_media')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="youtubeUrl">{tFields('youtubeUrl')}</Label>
                  <Input 
                    {...register('youtubeUrl')} 
                    id="youtubeUrl" 
                    placeholder="https://youtube.com/@yourchannel"
                    disabled={isGroupLocked('social_media')}
                  />
                </div>
              </CardContent>
            </Card>
          </LockedFieldWrapper>

          {/* Business Dates */}
          <LockedFieldWrapper 
            isLocked={isFieldLocked('opening_date')}
            fieldName={t('sections.businessDates')}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('sections.businessDates')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="openingDate">{tFields('openingDate')}</Label>
                  <Input 
                    {...register('openingDate')} 
                    id="openingDate" 
                    type="date"
                    disabled={isFieldLocked('opening_date')}
                  />
                  {errors.openingDate && (
                    <p className="text-sm text-destructive mt-1">{errors.openingDate.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </LockedFieldWrapper>

          {/* Opening Hours */}
          <LockedFieldWrapper 
            isLocked={isGroupLocked('opening_hours')}
            fieldName={t('sections.openingHours')}
          >
            <OpeningHours 
              hours={hours} 
              onHoursChange={setHours} 
              disabled={isGroupLocked('opening_hours')}
            />
          </LockedFieldWrapper>

          {/* Special Hours */}
          <LockedFieldWrapper 
            isLocked={isGroupLocked('special_hours')}
            fieldName={t('sections.specialHours')}
          >
            <SpecialHours 
              specialHours={specialHours} 
              onSpecialHoursChange={setSpecialHours}
              disabled={isGroupLocked('special_hours')}
            />
          </LockedFieldWrapper>

          {/* Cover Photo Upload */}
          <LockedFieldWrapper 
            isLocked={isFieldLocked('cover_photo')}
            fieldName={t('sections.coverPhoto')}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('sections.coverPhoto')}</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUpload
                  photos={coverPhoto ? [coverPhoto] : []}
                  onPhotosChange={(photos) => setCoverPhoto(photos[0] || '')}
                  maxPhotos={1}
                  disabled={isFieldLocked('cover_photo')}
                  photoType="cover"
                />
              </CardContent>
            </Card>
          </LockedFieldWrapper>

          {/* Logo Photo Upload */}
          <LockedFieldWrapper 
            isLocked={isFieldLocked('logo_photo')}
            fieldName={t('sections.logoPhoto')}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('sections.logoPhoto')}</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUpload
                  photos={watch('logoPhoto') ? [watch('logoPhoto')] : []}
                  onPhotosChange={(photos) => setValue('logoPhoto', photos[0] || '')}
                  maxPhotos={1}
                  disabled={isFieldLocked('logo_photo')}
                  photoType="logo"
                />
              </CardContent>
            </Card>
          </LockedFieldWrapper>

          {/* Service URLs */}
          <LockedFieldWrapper 
            isLocked={isGroupLocked('service_urls')}
            fieldName={t('sections.serviceUrls')}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('sections.serviceUrls')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="appointmentURL">{tFields('appointmentURL')}</Label>
                  <Input 
                    {...register('appointmentURL')} 
                    id="appointmentURL" 
                    placeholder="https://booking.example.com"
                    disabled={isGroupLocked('service_urls')}
                  />
                </div>

                <div>
                  <Label htmlFor="menuURL">{tFields('menuURL')}</Label>
                  <Input 
                    {...register('menuURL')} 
                    id="menuURL" 
                    placeholder="https://menu.example.com"
                    disabled={isGroupLocked('service_urls')}
                  />
                </div>

                <div>
                  <Label htmlFor="reservationsURL">{tFields('reservationsURL')}</Label>
                  <Input 
                    {...register('reservationsURL')} 
                    id="reservationsURL" 
                    placeholder="https://reservations.example.com"
                    disabled={isGroupLocked('service_urls')}
                  />
                </div>

                <div>
                  <Label htmlFor="orderAheadURL">{tFields('orderAheadURL')}</Label>
                  <Input 
                    {...register('orderAheadURL')} 
                    id="orderAheadURL" 
                    placeholder="https://order.example.com"
                    disabled={isGroupLocked('service_urls')}
                  />
                </div>
              </CardContent>
            </Card>
          </LockedFieldWrapper>

          {/* Custom Services */}
          <LockedFieldWrapper 
            isLocked={isGroupLocked('custom_services')}
            fieldName={t('sections.customServices')}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('sections.customServices')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  {customServices.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      {customServices.map((service: any, index: number) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <div className="font-semibold">{service.serviceName}</div>
                          {service.serviceDescription && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {service.serviceDescription}
                            </div>
                          )}
                          {service.serviceCategoryId && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Category: {service.serviceCategoryId}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">
                      {t('placeholders.noCustomServices')}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCustomServicesDialogOpen(true)}
                    className="w-full"
                    disabled={isGroupLocked('custom_services')}
                  >
                    {t('actions.manageCustomServices')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </LockedFieldWrapper>

          {/* Data Goldmine */}
          <Card>
            <CardHeader>
              <CardTitle>{t('sections.dataGoldmine')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="goldmine">{tFields('unstructuredData')}</Label>
                <Textarea 
                  {...register('goldmine')} 
                  id="goldmine" 
                  placeholder={t('placeholders.goldminePlaceholder')}
                  className="h-32 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('placeholders.goldmineDescription')}
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('dialog.saving') : (business ? t('dialog.updateBusiness') : t('dialog.createBusiness'))}
            </Button>
          </div>
        </form>
      </DialogContent>

      <CategoryNameChangeDialog
        open={categoryNameWarningOpen}
        onOpenChange={setCategoryNameWarningOpen}
        onConfirm={() => {
          if (pendingFormData) {
            submitBusinessData(pendingFormData);
            setPendingFormData(null);
          }
        }}
        changedFields={
          pendingFormData
            ? [
                pendingFormData.businessName !== initialBusinessName && 'Business Name',
                pendingFormData.primaryCategory !== initialPrimaryCategory && 'Primary Category',
              ].filter(Boolean) as string[]
            : []
        }
      />

      <BusinessCustomServicesDialog
        open={customServicesDialogOpen}
        onOpenChange={setCustomServicesDialogOpen}
        businessId={business?.id}
        clientId={clientId || business?.client_id}
        businessCategories={[
          watch('primaryCategory'),
          ...(watch('additionalCategories')?.split(',').map(c => c.trim()).filter(Boolean) || [])
        ]}
        currentServices={customServices}
        onSave={(services) => setCustomServices(services)}
      />
    </Dialog>
  );
};

export default BusinessDialog;