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
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { toast } from '@/hooks/use-toast';
import PhotoUpload from '@/components/PhotoUpload';
import OpeningHours from '@/components/OpeningHours';
import LocationMap from '@/components/LocationMap';

type BusinessRow = Database['public']['Tables']['businesses']['Row'];

const businessSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  primaryCategory: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  street: z.string().optional(),
  suite: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type BusinessFormData = z.infer<typeof businessSchema>;

interface BusinessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business?: BusinessRow | null;
  onSuccess: () => void;
}

const BusinessDialog = ({ open, onOpenChange, business, onSuccess }: BusinessDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [additionalCategories, setAdditionalCategories] = useState<string[]>([]);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<string[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [hours, setHours] = useState({
    monday: "09:00-18:00",
    tuesday: "09:00-18:00", 
    wednesday: "09:00-18:00",
    thursday: "09:00-18:00",
    friday: "09:00-18:00",
    saturday: "10:00-14:00",
    sunday: "Closed"
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
  });

  useEffect(() => {
    if (business) {
      // Populate form with existing business data
      setValue('businessName', business.business_name);
      setValue('primaryCategory', business.primary_category || '');
      setValue('phone', business.phone || '');
      setValue('website', business.website || '');
      setValue('description', business.description || '');
      setValue('street', business.street || '');
      setValue('suite', business.suite || '');
      setValue('city', business.city || '');
      setValue('postalCode', business.postal_code || '');
      setValue('region', business.region || '');
      setValue('country', business.country || '');
      setValue('latitude', business.latitude || undefined);
      setValue('longitude', business.longitude || undefined);
      
      setAdditionalCategories(business.additional_categories || []);
      setServiceAreas(business.service_area || []);
      setAttributes(business.attributes || []);
      setPhotos(business.photos as any[] || []);
      setHours({
        monday: (business.hours as any)?.monday || "09:00-18:00",
        tuesday: (business.hours as any)?.tuesday || "09:00-18:00",
        wednesday: (business.hours as any)?.wednesday || "09:00-18:00",
        thursday: (business.hours as any)?.thursday || "09:00-18:00",
        friday: (business.hours as any)?.friday || "09:00-18:00",
        saturday: (business.hours as any)?.saturday || "10:00-14:00",
        sunday: (business.hours as any)?.sunday || "Closed"
      });
    } else {
      // Reset for new business
      reset();
      setAdditionalCategories([]);
      setServiceAreas([]);
      setAttributes([]);
      setPhotos([]);
      setHours({
        monday: "09:00-18:00",
        tuesday: "09:00-18:00",
        wednesday: "09:00-18:00",
        thursday: "09:00-18:00",
        friday: "09:00-18:00",
        saturday: "10:00-14:00",
        sunday: "Closed"
      });
    }
  }, [business, setValue, reset]);

  const onSubmit = async (data: BusinessFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const businessData = {
        user_id: user.id,
        business_name: data.businessName,
        primary_category: data.primaryCategory || null,
        additional_categories: additionalCategories,
        street: data.street || null,
        suite: data.suite || null,
        city: data.city || null,
        postal_code: data.postalCode || null,
        region: data.region || null,
        country: data.country || null,
        service_area: serviceAreas,
        phone: data.phone || null,
        website: data.website || null,
        description: data.description || null,
        attributes,
        photos,
        hours,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        // Keep existing hidden fields for editing
        place_id: business?.place_id || null,
        cid: business?.cid || null,
        business_profile_id: business?.business_profile_id || null,
        kg_id: business?.kg_id || null,
        opening_date: business?.opening_date || null,
        review_count: business?.review_count || 0,
        review_rating: business?.review_rating || null,
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

  const updateArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, currentArray: string[], index: number, value: string) => {
    const newArray = [...currentArray];
    newArray[index] = value;
    setter(newArray);
  };

  const addArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, currentArray: string[]) => {
    setter([...currentArray, '']);
  };

  const removeArrayItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, currentArray: string[], index: number) => {
    const newArray = currentArray.filter((_, i) => i !== index);
    setter(newArray);
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setValue('latitude', lat);
    setValue('longitude', lng);
  };

  const getCurrentAddress = () => {
    const street = register('street').name ? (document.getElementById('street') as HTMLInputElement)?.value : '';
    const city = register('city').name ? (document.getElementById('city') as HTMLInputElement)?.value : '';
    const region = register('region').name ? (document.getElementById('region') as HTMLInputElement)?.value : '';
    const country = register('country').name ? (document.getElementById('country') as HTMLInputElement)?.value : '';
    
    return [street, city, region, country].filter(Boolean).join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {business ? 'Edit Business' : 'Add New Business'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input {...register('businessName')} id="businessName" />
                {errors.businessName && (
                  <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="primaryCategory">Primary Category</Label>
                <Input {...register('primaryCategory')} id="primaryCategory" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input {...register('phone')} id="phone" />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input {...register('website')} id="website" placeholder="https://" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea {...register('description')} id="description" />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="street">Street Address</Label>
                <Input {...register('street')} id="street" />
              </div>
              <div>
                <Label htmlFor="suite">Suite/Unit</Label>
                <Input {...register('suite')} id="suite" />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input {...register('city')} id="city" />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input {...register('postalCode')} id="postalCode" />
              </div>
              <div>
                <Label htmlFor="region">State/Region</Label>
                <Input {...register('region')} id="region" />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input {...register('country')} id="country" />
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

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Business Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUpload
                photos={photos}
                onPhotosChange={setPhotos}
                maxPhotos={10}
              />
            </CardContent>
          </Card>

          {/* Categories and Service Areas */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Additional Categories
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addArrayItem(setAdditionalCategories, additionalCategories)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {additionalCategories.map((category, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={category}
                      onChange={(e) => updateArrayItem(setAdditionalCategories, additionalCategories, index, e.target.value)}
                      placeholder="Category name"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeArrayItem(setAdditionalCategories, additionalCategories, index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Service Areas
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addArrayItem(setServiceAreas, serviceAreas)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {serviceAreas.map((area, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={area}
                      onChange={(e) => updateArrayItem(setServiceAreas, serviceAreas, index, e.target.value)}
                      placeholder="Service area"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeArrayItem(setServiceAreas, serviceAreas, index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Business Attributes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Business Attributes
                <Button
                  type="button"
                  size="sm"
                  onClick={() => addArrayItem(setAttributes, attributes)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attributes.map((attribute, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={attribute}
                    onChange={(e) => updateArrayItem(setAttributes, attributes, index, e.target.value)}
                    placeholder="Attribute (e.g., Wheelchair accessible)"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => removeArrayItem(setAttributes, attributes, index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
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