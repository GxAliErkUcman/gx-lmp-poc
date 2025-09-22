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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Share2, Globe, BarChart3 } from 'lucide-react';

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

interface SocialStats {
  platform: string;
  platformLabel: string;
  totalLocations: number;
  locationsWithSocial: number;
  mostCommonUrl?: string;
  urlVariations: number;
  allUrls: { url: string; count: number }[];
}

const AccountSocialsDialog = ({ open, onOpenChange, onSuccess }: AccountSocialsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const [socialStats, setSocialStats] = useState<SocialStats[]>([]);
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

  // Fetch existing social media statistics
  const fetchSocialStats = async () => {
    if (!user) return;

    try {
      // Get current user's client_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      const { data: businesses, error } = await supabase
        .from('businesses')
        .select('socialMediaUrls')
        .or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);

      if (error) throw error;

      const totalLocations = businesses?.length || 0;
      const stats: SocialStats[] = [];

      SOCIAL_PLATFORMS.forEach(platform => {
        const platformName = `url_${platform.key.replace('Url', '')}`;
        const urls: { [url: string]: number } = {};
        let locationsWithSocial = 0;

        businesses?.forEach(business => {
          const socialMediaUrls = Array.isArray(business.socialMediaUrls) ? business.socialMediaUrls : [];
          const socialObj = socialMediaUrls.find((social: any) => 
            social && typeof social === 'object' && social.name === platformName
          ) as { name: string; url: string } | undefined;
          
          if (socialObj?.url && typeof socialObj.url === 'string') {
            locationsWithSocial++;
            urls[socialObj.url] = (urls[socialObj.url] || 0) + 1;
          }
        });

        const allUrls = Object.entries(urls)
          .map(([url, count]) => ({ url, count }))
          .sort((a, b) => b.count - a.count);

        const mostCommonUrl = allUrls.length > 0 ? allUrls[0].url : undefined;

        stats.push({
          platform: platform.key,
          platformLabel: platform.label,
          totalLocations,
          locationsWithSocial,
          mostCommonUrl,
          urlVariations: allUrls.length,
          allUrls
        });
      });

      setSocialStats(stats);
    } catch (error) {
      console.error('Error fetching social stats:', error);
    }
  };

  // Fetch stats when dialog opens
  useEffect(() => {
    if (open && user) {
      fetchSocialStats();
    }
  }, [open, user]);

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

      // Get current user's client_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      // Update all businesses for this user or client
      const { error } = await supabase
        .from('businesses')
        .update({ socialMediaUrls })
        .or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Social media links applied to all your businesses",
      });

      allForm.reset();
      fetchSocialStats(); // Refresh stats after update
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
      // Get current user's client_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .single();

      // Get current social media URLs for all businesses
      const { data: businesses, error: fetchError } = await supabase
        .from('businesses')
        .select('id, socialMediaUrls')
        .or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);

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
      fetchSocialStats(); // Refresh stats after update
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Current Status
            </TabsTrigger>
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
            <TabsContent value="analytics" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Social Media Status</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Overview of social media links across all your business locations.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3">
                    {socialStats.map(stat => (
                      <div key={stat.platform} className="p-3 border rounded-lg bg-card/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm">{stat.platformLabel}</h4>
                          <Badge variant={stat.locationsWithSocial > 0 ? "default" : "secondary"} className="text-xs">
                            {stat.locationsWithSocial} of {stat.totalLocations}
                          </Badge>
                        </div>
                        
                        {stat.locationsWithSocial > 0 ? (
                          <div className="space-y-1">
                            {stat.mostCommonUrl && (
                              <div className="text-xs">
                                <span className="font-medium">Current link:</span>
                                <div className="text-muted-foreground break-all font-mono text-xs mt-1 p-1 bg-muted rounded">
                                  {stat.mostCommonUrl}
                                </div>
                                {stat.allUrls[0] && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Used by {stat.allUrls[0].count} location{stat.allUrls[0].count > 1 ? 's' : ''}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {stat.urlVariations > 1 && (
                              <div className="text-xs text-amber-600">
                                <span className="font-medium">⚠️ Inconsistent:</span> {stat.urlVariations} different links across locations
                                {stat.allUrls.length > 1 && (
                                  <div className="mt-1 text-xs space-y-1">
                                    {stat.allUrls.slice(1).map((url, idx) => (
                                      <div key={idx} className="font-mono p-1 bg-amber-50 rounded">
                                        {url.url} ({url.count} location{url.count > 1 ? 's' : ''})
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            No {stat.platformLabel} links set
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {socialStats.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Loading social media status...
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

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
                            const platformStats = socialStats.find(s => s.platform === selectedPlatform?.key);
                            
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
                                      // If empty or just base URL, set to most common URL or base URL
                                      if (!field.value || field.value === selectedPlatform.baseUrl) {
                                        const suggestedUrl = platformStats?.mostCommonUrl || selectedPlatform.baseUrl;
                                        field.onChange(suggestedUrl);
                                        setTimeout(() => {
                                          e.target.setSelectionRange(suggestedUrl.length, suggestedUrl.length);
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
                                {platformStats?.mostCommonUrl && (
                                  <p className="text-xs text-blue-600">
                                    Most used: {platformStats.mostCommonUrl} ({platformStats.allUrls[0]?.count} locations)
                                  </p>
                                )}
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
          {activeTab === 'analytics' ? null : activeTab === 'single' ? (
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