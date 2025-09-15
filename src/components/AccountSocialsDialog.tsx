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
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Share2 } from 'lucide-react';

const accountSocialsSchema = z.object({
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  pinterestUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
});

type AccountSocialsFormValues = z.infer<typeof accountSocialsSchema>;

interface AccountSocialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AccountSocialsDialog = ({ open, onOpenChange, onSuccess }: AccountSocialsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const form = useForm<AccountSocialsFormValues>({
    resolver: zodResolver(accountSocialsSchema),
    defaultValues: {
      facebookUrl: '',
      instagramUrl: '',
      linkedinUrl: '',
      pinterestUrl: '',
      tiktokUrl: '',
      twitterUrl: '',
      youtubeUrl: '',
    },
  });

  const onSubmit = async (values: AccountSocialsFormValues) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Handle social media URLs
      const socialMediaUrls = [
        { name: 'url_facebook', url: values.facebookUrl || null },
        { name: 'url_instagram', url: values.instagramUrl || null },
        { name: 'url_linkedin', url: values.linkedinUrl || null },
        { name: 'url_pinterest', url: values.pinterestUrl || null },
        { name: 'url_tiktok', url: values.tiktokUrl || null },
        { name: 'url_twitter', url: values.twitterUrl || null },
        { name: 'url_youtube', url: values.youtubeUrl || null },
      ].filter(item => item.url && item.url.trim() !== '');

      if (socialMediaUrls.length === 0) {
        toast({
          title: "No changes",
          description: "Please fill in at least one social media URL",
          variant: "destructive",
        });
        return;
      }

      // Update all businesses for this user
      const { error } = await supabase
        .from('businesses')
        .update({ socialMediaUrls })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Social media links applied to all your businesses",
      });

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating social media:', error);
      toast({
        title: "Error",
        description: "Failed to update social media links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Set Account-Wide Social Media Links</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  These social media links will be applied to all your businesses.
                </p>
                
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="facebookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://facebook.com/yourpage" {...field} />
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
                          <Input placeholder="https://instagram.com/youraccount" {...field} />
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
                          <Input placeholder="https://linkedin.com/company/yourcompany" {...field} />
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
                          <Input placeholder="https://pinterest.com/youraccount" {...field} />
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
                          <Input placeholder="https://tiktok.com/@youraccount" {...field} />
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
                          <Input placeholder="https://x.com/youraccount" {...field} />
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
                          <Input placeholder="https://youtube.com/@yourchannel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
            {loading ? 'Applying...' : 'Apply to All Businesses'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSocialsDialog;