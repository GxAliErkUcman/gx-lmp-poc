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
  tiktokUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  pinterestUrl: z.string().optional(),
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
  { key: 'tiktokUrl', label: 'TikTok', baseUrl: 'https://tiktok.com/@' },
  { key: 'linkedinUrl', label: 'LinkedIn', baseUrl: 'https://linkedin.com/company/' },
  { key: 'twitterUrl', label: 'X (Twitter)', baseUrl: 'https://x.com/' },
  { key: 'youtubeUrl', label: 'YouTube', baseUrl: 'https://youtube.com/@' },
  { key: 'pinterestUrl', label: 'Pinterest', baseUrl: 'https://pinterest.com/' },
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
      tiktokUrl: '',
      linkedinUrl: '',
      pinterestUrl: '',
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
        { name: 'url_tiktok', url: values.tiktokUrl || null },
        { name: 'url_linkedin', url: values.linkedinUrl || null },
        { name: 'url_pinterest', url: values.pinterestUrl || null },
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
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh]">
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

          <TabsContent value="analytics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Social Media Status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Overview of social media links across all your business locations.
                </p>
              </CardHeader>
              <ScrollArea className="max-h-[50vh]">
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {socialStats.slice(0, 4).map(stat => (
                      <Card key={stat.platform} className="p-3 bg-card/50">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-xs">{stat.platformLabel}</h4>
                            <Badge variant={stat.locationsWithSocial > 0 ? "default" : "secondary"} className="text-[10px] px-1 py-0.5">
                              {stat.locationsWithSocial}/{stat.totalLocations}
                            </Badge>
                          </div>
                          
                          {stat.locationsWithSocial > 0 ? (
                            <div className="space-y-1">
                              {stat.mostCommonUrl && (
                                <div className="text-[10px]">
                                  <div className="text-muted-foreground break-all font-mono text-[10px] p-1 bg-muted rounded">
                                    {stat.mostCommonUrl.length > 50 ? stat.mostCommonUrl.substring(0, 50) + '...' : stat.mostCommonUrl}
                                  </div>
                                  {stat.urlVariations > 1 && (
                                    <div className="text-[10px] text-amber-600 mt-1">
                                      ⚠️ {stat.urlVariations} variants
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-muted-foreground">
                              Not set
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {socialStats.length > 4 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {socialStats.slice(4).map(stat => (
                        <Card key={stat.platform} className="p-3 bg-card/50">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-xs">{stat.platformLabel}</h4>
                              <Badge variant={stat.locationsWithSocial > 0 ? "default" : "secondary"} className="text-[10px] px-1 py-0.5">
                                {stat.locationsWithSocial}/{stat.totalLocations}
                              </Badge>
                            </div>
                            
                            {stat.locationsWithSocial > 0 ? (
                              <div className="space-y-1">
                                {stat.mostCommonUrl && (
                                  <div className="text-[10px]">
                                    <div className="text-muted-foreground break-all font-mono text-[10px] p-1 bg-muted rounded">
                                      {stat.mostCommonUrl.length > 50 ? stat.mostCommonUrl.substring(0, 50) + '...' : stat.mostCommonUrl}
                                    </div>
                                    {stat.urlVariations > 1 && (
                                      <div className="text-[10px] text-amber-600 mt-1">
                                        ⚠️ {stat.urlVariations} variants
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-muted-foreground">
                                Not set
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {socialStats.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      Loading social media status...
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="single" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Single Platform</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select a specific social media platform to update across all your businesses. This preserves existing links on other platforms.
                </p>
              </CardHeader>
              <ScrollArea className="max-h-[50vh]">
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

                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Updating...' : 'Update Platform'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update All Platforms</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Set multiple social media links at once. Empty fields will remove existing links on those platforms.
                </p>
              </CardHeader>
              <ScrollArea className="max-h-[60vh]">
                <CardContent>
                  <Form {...allForm}>
                    <form onSubmit={allForm.handleSubmit(onSubmitAll)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                        {SOCIAL_PLATFORMS.map((platform) => {
                          const platformStats = socialStats.find(stat => stat.platform === platform.key);
                          return (
                            <Card key={platform.key} className="p-4 bg-card/50 hover:bg-card/70 transition-colors">
                              <FormField
                                control={allForm.control}
                                name={platform.key as keyof AccountSocialsFormValues}
                                render={({ field }) => (
                                  <FormItem className="space-y-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <FormLabel className="text-sm font-medium">{platform.label}</FormLabel>
                                      {platformStats && (
                                        <Badge 
                                          variant={platformStats.locationsWithSocial > 0 ? "default" : "secondary"} 
                                          className="text-[10px] px-1 py-0.5"
                                        >
                                          {platformStats.locationsWithSocial}/{platformStats.totalLocations}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <FormControl>
                                      <Input
                                        placeholder={`${platform.baseUrl}yourname`}
                                        className="text-sm"
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
                                    
                                    {platformStats?.mostCommonUrl && (
                                      <div className="text-[10px] text-blue-600 break-all">
                                        Current: {platformStats.mostCommonUrl.length > 25 ? 
                                          platformStats.mostCommonUrl.substring(0, 25) + '...' : 
                                          platformStats.mostCommonUrl
                                        }
                                        {platformStats.urlVariations > 1 && (
                                          <div className="text-[10px] text-amber-600 mt-1">
                                            ⚠️ {platformStats.urlVariations} variants
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    
                                    <FormMessage className="text-[10px]" />
                                  </FormItem>
                                )}
                              />
                            </Card>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Applying...' : 'Apply to All Businesses'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </ScrollArea>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSocialsDialog;