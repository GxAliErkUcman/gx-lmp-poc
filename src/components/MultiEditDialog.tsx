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

const multiEditFormSchema = z.object({
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  primary_category: z.string().optional(),
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
      phone: '',
      website: '',
      description: '',
      primary_category: '',
    },
  });

  const onSubmit = async (values: MultiEditFormValues) => {
    setLoading(true);
    try {
      // Filter out empty values
      const updateData = Object.fromEntries(
        Object.entries(values).filter(([_, value]) => value !== '' && value !== undefined)
      );

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

      // Update all selected businesses with this photo
      const photoData = {
        photos: [{
          fileName: fileName,
          url: publicUrl,
          altText: `Photo for business locations`
        }]
      };

      const { error: updateError } = await supabase
        .from('businesses')
        .update(photoData)
        .in('id', selectedIds);

      if (updateError) throw updateError;

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit {selectedIds.length} Selected Businesses</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="phone"
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
              name="primary_category"
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
              name="description"
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : `Update ${selectedIds.length} Businesses`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default MultiEditDialog;