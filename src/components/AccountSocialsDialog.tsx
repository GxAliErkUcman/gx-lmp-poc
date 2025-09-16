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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Share2, Globe } from 'lucide-react';

const accountSocialsSchema = z.object({
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  pinterestUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
});

const singleSocialSchema = z.object({
  platform: z.string(),
  url: z.string().min(1, 'URL is required'),
});

type AccountSocialsFormValues = z.infer<typeof accountSocialsSchema>;
type SingleSocialFormValues = z.infer<typeof singleSocialSchema>;

const SOCIAL_PLATFORMS = [
  { key: 'facebookUrl', label: 'Facebook', baseUrl: 'https://facebook.com/' },
  { key: 'instagramUrl', label: 'Instagram', baseUrl: 'https://instagram.com/' },
  { key: 'linkedinUrl', label: 'LinkedIn', baseUrl: 'https://linkedin.com/company/' },
  { key: 'pinterestUrl', label: 'Pinterest', baseUrl: 'https://pinterest.com/' },
  { key: 'tiktokUrl', label: 'TikTok', baseUrl: 'https://tiktok.com/@' },
  { key: 'twitterUrl', label: 'X (Twitter)', baseUrl: 'https://x.com/' },
  { key: 'youtubeUrl', label: 'YouTube', baseUrl: 'https://youtube.com/@' },
] as const;

interface AccountSocialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AccountSocialsDialog = ({ open, onOpenChange, onSuccess }: AccountSocialsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('single');
  const { user } = useAuth();

  const allForm = useForm<AccountSocialsFormValues>({
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

  const singleForm = useForm<SingleSocialFormValues>({
    resolver: zodResolver(singleSocialSchema),
    defaultValues: {
      platform: '',
      url: '',
    },
  });

  // Auto-populate base URL when platform changes
  useEffect(() => {
    const subscription = singleForm.watch((value, { name }) => {
      if (name === 'platform' && value.platform) {
        const platformData = SOCIAL_PLATFORMS.find(p => p.key === value.platform);
        if (platformData) {
          singleForm.setValue('url', platformData.baseUrl);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [singleForm]);

  const onSubmitAll = async (values: AccountSocialsFormValues) => {
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

      allForm.reset();
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

  const onSubmitSingle = async (values: SingleSocialFormValues) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get current social media URLs for all businesses
      const { data: businesses, error: fetchError } = await supabase
        .from('businesses')
        .select('id, socialMediaUrls')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      // Update each business individually
      const platformData = SOCIAL_PLATFORMS.find(p => p.key === values.platform);
      const platformName = `url_${values.platform.replace('Url', '')}` as const;

      for (const business of businesses || []) {
        let existingSocials = Array.isArray(business.socialMediaUrls) ? business.socialMediaUrls : [];
        
        // Remove existing entry for this platform
        existingSocials = existingSocials.filter((social: any) => social.name !== platformName);
        
        // Add new entry if URL is provided
        if (values.url.trim() && values.url.trim() !== platformData?.baseUrl) {
          existingSocials = [...existingSocials, {
            name: platformName,
            url: values.url.trim()
          }];
        }

        // Update the business
        const { error: updateError } = await supabase
          .from('businesses')
          .update({ socialMediaUrls: existingSocials })
          .eq('id', business.id);

        if (updateError) throw updateError;
      }

      const platformLabel = platformData?.label || 'Social media';
      toast({
        title: "Success",
        description: `${platformLabel} link updated across all your businesses`,
      });

      singleForm.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating social media:', error);
      toast({
        title: "Error",
        description: "Failed to update social media link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Set Account-Wide Social Media Links
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Update Single Platform
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Update All Platforms
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[60vh] pr-4 mt-4">
            <TabsContent value="single" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Update Single Platform</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select a specific social media platform to update across all your businesses. This preserves existing links on other platforms.
                  </p>
                </CardHeader>
                <CardContent>
                  <Form {...singleForm}>
                    <form onSubmit={singleForm.handleSubmit(onSubmitSingle)} className="space-y-4">
                      <FormField
                        control={singleForm.control}
                        name="platform"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Platform</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a social media platform" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {SOCIAL_PLATFORMS.map((platform) => (
                                  <SelectItem key={platform.key} value={platform.key}>
                                    {platform.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {singleForm.watch('platform') && (
                        <FormField
                          control={singleForm.control}
                          name="url"
                          render={({ field }) => {
                            const selectedPlatform = SOCIAL_PLATFORMS.find(
                              p => p.key === singleForm.watch('platform')
                            );
                            
                            if (!selectedPlatform) return null;
                            
                            return (
                              <FormItem>
                                <FormLabel>{selectedPlatform.label} URL</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={`${selectedPlatform.baseUrl}yourname`}
                                    {...field}
                                    value={field.value || ''}
                                    onFocus={(e) => {
                                      // If empty or just base URL, set to base URL and position cursor
                                      if (!field.value || field.value === selectedPlatform.baseUrl) {
                                        field.onChange(selectedPlatform.baseUrl);
                                        setTimeout(() => {
                                          e.target.setSelectionRange(selectedPlatform.baseUrl.length, selectedPlatform.baseUrl.length);
                                        }, 0);
                                      }
                                    }}
                                    onBlur={() => {
                                      // If user left only the base URL, clear it
                                      if (field.value === selectedPlatform.baseUrl) {
                                        field.onChange('');
                                      }
                                    }}
                                  />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">
                                  The base URL is pre-filled for convenience. Just add your username/page name.
                                </p>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      )}
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Update All Platforms</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Set multiple social media links at once. Empty fields will remove existing links on those platforms.
                  </p>
                </CardHeader>
                <CardContent>
                  <Form {...allForm}>
                    <form onSubmit={allForm.handleSubmit(onSubmitAll)} className="space-y-4">
                      <div className="grid gap-4">
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <FormField
                            key={platform.key}
                            control={allForm.control}
                            name={platform.key as keyof AccountSocialsFormValues}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{platform.label} URL</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder={`${platform.baseUrl}yourname`}
                                    {...field}
                                    value={field.value || ''}
                                    onFocus={(e) => {
                                      if (!field.value || field.value === platform.baseUrl) {
                                        field.onChange(platform.baseUrl);
                                        setTimeout(() => {
                                          e.target.setSelectionRange(platform.baseUrl.length, platform.baseUrl.length);
                                        }, 0);
                                      }
                                    }}
                                    onBlur={() => {
                                      if (field.value === platform.baseUrl) {
                                        field.onChange('');
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === 'single' ? (
            <Button 
              type="submit" 
              disabled={loading || !singleForm.watch('platform') || !singleForm.watch('url')}
              onClick={singleForm.handleSubmit(onSubmitSingle)}
            >
              {loading ? 'Updating...' : 'Update Selected Platform'}
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={loading}
              onClick={allForm.handleSubmit(onSubmitAll)}
            >
              {loading ? 'Applying...' : 'Apply to All Businesses'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSocialsDialog;