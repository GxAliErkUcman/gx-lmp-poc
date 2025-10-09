import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CategorySelect } from '@/components/CategorySelect';
import { CountrySelect } from '@/components/CountrySelect';
import CategoryNameChangeDialog from '@/components/CategoryNameChangeDialog';

const multiEditFormSchema = z.object({
  businessName: z.string().optional(),
  primaryPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  fromTheBusiness: z.string().optional(),
  primaryCategory: z.string().optional(),
  country: z.string().optional(),
  mondayHours: z.string().optional(),
  tuesdayHours: z.string().optional(),
  wednesdayHours: z.string().optional(),
  thursdayHours: z.string().optional(),
  fridayHours: z.string().optional(),
  saturdayHours: z.string().optional(),
  sundayHours: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  pinterestUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
});

type MultiEditFormValues = z.infer<typeof multiEditFormSchema>;

interface MultiEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}

const MultiEditDialog = ({ open, onOpenChange, selectedIds, onSuccess }: MultiEditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categoryNameWarningOpen, setCategoryNameWarningOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<MultiEditFormValues | null>(null);

  const form = useForm<MultiEditFormValues>({
    resolver: zodResolver(multiEditFormSchema),
    defaultValues: {
      businessName: '',
      primaryPhone: '',
      website: '',
      fromTheBusiness: '',
      primaryCategory: '',
      country: '',
      mondayHours: '',
      tuesdayHours: '',
      wednesdayHours: '',
      thursdayHours: '',
      fridayHours: '',
      saturdayHours: '',
      sundayHours: '',
      facebookUrl: '',
      instagramUrl: '',
      linkedinUrl: '',
      pinterestUrl: '',
      tiktokUrl: '',
      twitterUrl: '',
      youtubeUrl: '',
    },
  });

  const onSubmit = async (values: MultiEditFormValues) => {
    // Check if critical fields are being changed
    const changedFields: string[] = [];
    if (values.businessName && values.businessName.trim() !== '') {
      changedFields.push('Business Name');
    }
    if (values.primaryCategory && values.primaryCategory.trim() !== '') {
      changedFields.push('Primary Category');
    }

    // If critical fields are being changed, show warning
    if (changedFields.length > 0) {
      setPendingFormData(values);
      setCategoryNameWarningOpen(true);
      return;
    }

    // Proceed with submission
    await submitMultiEditData(values);
  };

  const submitMultiEditData = async (values: MultiEditFormValues) => {
    setLoading(true);
    try {
      // Filter out empty values for regular fields
      const regularFields = ['businessName', 'primaryPhone', 'website', 'fromTheBusiness', 'primaryCategory', 'country'];
      const hoursFields = ['mondayHours', 'tuesdayHours', 'wednesdayHours', 'thursdayHours', 'fridayHours', 'saturdayHours', 'sundayHours'];
      const socialMediaFields = ['facebookUrl', 'instagramUrl', 'linkedinUrl', 'pinterestUrl', 'tiktokUrl', 'twitterUrl', 'youtubeUrl'];
      
      const allUpdateFields = [...regularFields, ...hoursFields];

      const updateData = Object.fromEntries(
        Object.entries(values)
          .filter(([key, value]) => allUpdateFields.includes(key) && value !== '' && value !== undefined)
      );

      // Handle social media URLs separately
      const socialMediaUrls = [
        { name: 'url_facebook', url: values.facebookUrl || null },
        { name: 'url_instagram', url: values.instagramUrl || null },
        { name: 'url_linkedin', url: values.linkedinUrl || null },
        { name: 'url_pinterest', url: values.pinterestUrl || null },
        { name: 'url_tiktok', url: values.tiktokUrl || null },
        { name: 'url_twitter', url: values.twitterUrl || null },
        { name: 'url_youtube', url: values.youtubeUrl || null },
      ].filter(item => item.url && item.url.trim() !== '');

      // Add social media to update data if any URLs are provided
      if (socialMediaUrls.length > 0) {
        (updateData as any).socialMediaUrls = socialMediaUrls;
      }

      if (Object.keys(updateData).length === 0) {
        toast({
          title: "No changes",
          description: "Please fill in at least one field to update",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('businesses')
        .update(updateData)
        .in('id', selectedIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedIds.length} businesses successfully`,
      });

      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error updating businesses:', error);
      toast({
        title: "Error",
        description: "Failed to update businesses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-photos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('business-photos')
        .getPublicUrl(filePath);

      // Update all selected businesses with the new logo
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ logoPhoto: data.publicUrl })
        .in('id', selectedIds);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Logo uploaded to all selected businesses",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCoverPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `cover-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-photos')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('business-photos')
        .getPublicUrl(filePath);

      // Update all selected businesses with the new cover photo
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ coverPhoto: data.publicUrl })
        .in('id', selectedIds);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Cover photo uploaded to all selected businesses",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload cover photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('business-photos')
        .getPublicUrl(filePath);

      // Update all selected businesses with this photo URL
      // Add to existing otherPhotos or create new
      const { data: existingBusinesses } = await supabase
        .from('businesses')
        .select('otherPhotos')
        .in('id', selectedIds);

      const updatePromises = selectedIds.map(async (businessId) => {
        const existingBusiness = existingBusinesses?.find(b => (b as any).id === businessId);
        const existingPhotos = existingBusiness?.otherPhotos ? existingBusiness.otherPhotos.split(',') : [];
        const newPhotos = [...existingPhotos, data.publicUrl].join(',');
        
        return supabase
          .from('businesses')
          .update({ otherPhotos: newPhotos })
          .eq('id', businessId);
      });

      await Promise.all(updatePromises);

      toast({
        title: "Success",
        description: `Photo uploaded and applied to ${selectedIds.length} businesses`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit {selectedIds.length} Selected Businesses</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Leave empty to skip" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Leave empty to skip" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="Leave empty to skip" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="primaryCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Leave empty to skip" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <CountrySelect
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      placeholder="Leave empty to skip"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fromTheBusiness"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Leave empty to skip" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Opening Hours</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mondayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monday Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 09:00-17:00 or Closed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tuesdayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tuesday Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 09:00-17:00 or Closed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wednesdayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wednesday Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 09:00-17:00 or Closed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thursdayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thursday Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 09:00-17:00 or Closed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fridayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Friday Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 09:00-17:00 or Closed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="saturdayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saturday Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 09:00-17:00 or Closed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sundayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sunday Hours</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 09:00-17:00 or Closed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Social Media Links</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="facebookUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facebook URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Leave empty to skip" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                <FormField
                  control={form.control}
                  name="instagramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Leave empty to skip" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Leave empty to skip" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pinterestUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pinterest URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Leave empty to skip" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tiktokUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TikTok URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Leave empty to skip" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="twitterUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Leave empty to skip" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="youtubeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube URL</FormLabel>
                      <FormControl>
                        <Input placeholder="Leave empty to skip" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Photo Management</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Logo Photo Upload */}
                <div className="space-y-2">
                  <FormLabel>Change Logo Photo</FormLabel>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                      id="logo-upload"
                    />
                    <label htmlFor="logo-upload">
                      <Button 
                        type="button" 
                        variant="outline" 
                        disabled={uploading}
                        className="cursor-pointer w-full"
                        asChild
                      >
                        <div>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Upload Logo'}
                        </div>
                      </Button>
                    </label>
                    <span className="text-xs text-muted-foreground text-center">
                      Logo for all selected businesses
                    </span>
                  </div>
                </div>

                {/* Cover Photo Upload */}
                <div className="space-y-2">
                  <FormLabel>Change Cover Photo</FormLabel>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverPhotoUpload}
                      disabled={uploading}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label htmlFor="cover-upload">
                      <Button 
                        type="button" 
                        variant="outline" 
                        disabled={uploading}
                        className="cursor-pointer w-full"
                        asChild
                      >
                        <div>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Upload Cover'}
                        </div>
                      </Button>
                    </label>
                    <span className="text-xs text-muted-foreground text-center">
                      Cover photo for all selected businesses
                    </span>
                  </div>
                </div>

                {/* Additional Photo Upload */}
                <div className="space-y-2">
                  <FormLabel>Add Additional Photo</FormLabel>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                      className="hidden"
                      id="additional-upload"
                    />
                    <label htmlFor="additional-upload">
                      <Button 
                        type="button" 
                        variant="outline" 
                        disabled={uploading}
                        className="cursor-pointer w-full"
                        asChild
                      >
                        <div>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploading ? 'Uploading...' : 'Upload Photo'}
                        </div>
                      </Button>
                    </label>
                    <span className="text-xs text-muted-foreground text-center">
                      Additional photo for all selected businesses
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Updating...' : `Update ${selectedIds.length} Businesses`}
              </Button>
            </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>

      <CategoryNameChangeDialog
        open={categoryNameWarningOpen}
        onOpenChange={setCategoryNameWarningOpen}
        onConfirm={() => {
          if (pendingFormData) {
            submitMultiEditData(pendingFormData);
            setPendingFormData(null);
          }
        }}
        changedFields={
          [
            pendingFormData?.businessName && pendingFormData.businessName.trim() !== '' ? 'Business Name' : null,
            pendingFormData?.primaryCategory && pendingFormData.primaryCategory.trim() !== '' ? 'Primary Category' : null,
          ].filter(Boolean) as string[]
        }
      />
    </Dialog>
  );
};

export default MultiEditDialog;