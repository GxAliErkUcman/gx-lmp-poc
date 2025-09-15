import { useState, useEffect } from 'react';
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

const multiEditFormSchema = z.object({
  primaryPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  fromTheBusiness: z.string().optional(),
  primaryCategory: z.string().optional(),
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

  const form = useForm<MultiEditFormValues>({
    resolver: zodResolver(multiEditFormSchema),
    defaultValues: {
      primaryPhone: '',
      website: '',
      fromTheBusiness: '',
      primaryCategory: '',
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
    setLoading(true);
    try {
      // Filter out empty values for regular fields
      const regularFields = ['primaryPhone', 'website', 'fromTheBusiness', 'primaryCategory'];
      const socialMediaFields = ['facebookUrl', 'instagramUrl', 'linkedinUrl', 'pinterestUrl', 'tiktokUrl', 'twitterUrl', 'youtubeUrl'];
      
      const updateData = Object.fromEntries(
        Object.entries(values)
          .filter(([key, value]) => regularFields.includes(key) && value !== '' && value !== undefined)
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

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `business-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
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
        const newPhotos = [...existingPhotos, publicUrl].join(',');
        
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
                      <FormLabel>X (Twitter) URL</FormLabel>
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
            <div className="space-y-2">
              <FormLabel>Upload Shared Photo</FormLabel>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload">
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={uploading}
                    className="cursor-pointer"
                    asChild
                  >
                    <div>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                    </div>
                  </Button>
                </label>
                <span className="text-sm text-muted-foreground">
                  Will be applied to all selected businesses
                </span>
              </div>
            </div>

            </form>
          </Form>
        </ScrollArea>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            onClick={form.handleSubmit(onSubmit)}
          >
            {loading ? 'Updating...' : `Update ${selectedIds.length} Businesses`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultiEditDialog;