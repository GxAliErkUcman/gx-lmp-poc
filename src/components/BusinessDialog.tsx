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
  placeId: z.string().optional(),
  cid: z.string().optional(),
  businessProfileId: z.string().optional(),
  kgId: z.string().optional(),
  openingDate: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  reviewCount: z.number().min(0).optional(),
  reviewRating: z.number().min(0).max(5).optional(),
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
      setValue('placeId', business.place_id || '');
      setValue('cid', business.cid || '');
      setValue('businessProfileId', business.business_profile_id || '');
      setValue('kgId', business.kg_id || '');
      setValue('openingDate', business.opening_date || '');
      setValue('latitude', business.latitude || undefined);
      setValue('longitude', business.longitude || undefined);
      setValue('reviewCount', business.review_count || undefined);
      setValue('reviewRating', business.review_rating || undefined);
      
      setAdditionalCategories(business.additional_categories || []);
      setServiceAreas(business.service_area || []);
      setAttributes(business.attributes || []);
    } else {
      // Reset for new business
      reset();
      setAdditionalCategories([]);
      setServiceAreas([]);
      setAttributes([]);
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
        place_id: data.placeId || null,
        cid: data.cid || null,
        business_profile_id: data.businessProfileId || null,
        kg_id: data.kgId || null,
        opening_date: data.openingDate || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        review_count: data.reviewCount || 0,
        review_rating: data.reviewRating || null,
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

  const addArrayItem = (setter: (prev: string[]) => void, currentArray: string[]) => {
    setter([...currentArray, '']);
  };

  const removeArrayItem = (setter: (prev: string[]) => void, currentArray: string[], index: number) => {
    const newArray = currentArray.filter((_, i) => i !== index);
    setter(newArray);
  };

  const updateArrayItem = (setter: (prev: string[]) => void, currentArray: string[], index: number, value: string) => {
    const newArray = [...currentArray];
    newArray[index] = value;
    setter(newArray);
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

          {/* Google IDs and Coordinates */}
          <Card>
            <CardHeader>
              <CardTitle>Google Information & Location</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="placeId">Place ID</Label>
                <Input {...register('placeId')} id="placeId" />
              </div>
              <div>
                <Label htmlFor="cid">CID</Label>
                <Input {...register('cid')} id="cid" />
              </div>
              <div>
                <Label htmlFor="businessProfileId">Business Profile ID</Label>
                <Input {...register('businessProfileId')} id="businessProfileId" />
              </div>
              <div>
                <Label htmlFor="kgId">Knowledge Graph ID</Label>
                <Input {...register('kgId')} id="kgId" />
              </div>
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input 
                  {...register('latitude', { valueAsNumber: true })} 
                  id="latitude" 
                  type="number" 
                  step="any"
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input 
                  {...register('longitude', { valueAsNumber: true })} 
                  id="longitude" 
                  type="number" 
                  step="any"
                />
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="openingDate">Opening Date</Label>
                  <Input {...register('openingDate')} id="openingDate" type="date" />
                </div>
                <div>
                  <Label htmlFor="reviewCount">Review Count</Label>
                  <Input 
                    {...register('reviewCount', { valueAsNumber: true })} 
                    id="reviewCount" 
                    type="number" 
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="reviewRating">Review Rating</Label>
                  <Input 
                    {...register('reviewRating', { valueAsNumber: true })} 
                    id="reviewRating" 
                    type="number" 
                    min="0" 
                    max="5" 
                    step="0.1"
                  />
                </div>
              </CardContent>
            </Card>

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
          </div>

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