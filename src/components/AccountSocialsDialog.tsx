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
import { Share2, Globe, BarChart3, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  clientId?: string;
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

const AccountSocialsDialog = ({ open, onOpenChange, onSuccess, clientId }: AccountSocialsDialogProps) => {
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
      let query = supabase
        .from('businesses')
        .select('socialMediaUrls');

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', user.id)
          .single();

        query = query.or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);
      }

      const { data: businesses, error } = await query;

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

      // Update all businesses for the specified client or user's client
      let updateQuery = supabase
        .from('businesses')
        .update({ socialMediaUrls });

      if (clientId) {
        updateQuery = updateQuery.eq('client_id', clientId);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', user.id)
          .single();

        updateQuery = updateQuery.or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);
      }

      const { error } = await updateQuery;

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
      // Get current social media URLs for all businesses
      let fetchQuery = supabase
        .from('businesses')
        .select('id, socialMediaUrls');

      if (clientId) {
        fetchQuery = fetchQuery.eq('client_id', clientId);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', user.id)
          .single();

        fetchQuery = fetchQuery.or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);
      }

      const { data: businesses, error: fetchError } = await fetchQuery;

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

  const onRemoveAll = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get count of businesses with social media URLs
      let countQuery = supabase
        .from('businesses')
        .select('id, socialMediaUrls');

      if (clientId) {
        countQuery = countQuery.eq('client_id', clientId);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', user.id)
          .single();

        countQuery = countQuery.or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);
      }

      const { data: businesses, error: fetchError } = await countQuery;
      if (fetchError) throw fetchError;

      // Count how many actually have social URLs
      const affectedCount = businesses?.filter(b => 
        Array.isArray(b.socialMediaUrls) && b.socialMediaUrls.length > 0
      ).length || 0;

      // Update all businesses to remove social media URLs
      let updateQuery = supabase
        .from('businesses')
        .update({ socialMediaUrls: [] });

      if (clientId) {
        updateQuery = updateQuery.eq('client_id', clientId);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', user.id)
          .single();

        updateQuery = updateQuery.or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      toast({
        title: "Social Links Removed",
        description: `Removed all social media links from ${affectedCount} location${affectedCount !== 1 ? 's' : ''}`,
      });

      fetchSocialStats();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error removing social links:', error);
      toast({
        title: "Error",
        description: "Failed to remove social media links",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const [removePlatform, setRemovePlatform] = useState<string>('');

  const onRemoveSingle = async (platformKey: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let fetchQuery = supabase
        .from('businesses')
        .select('id, socialMediaUrls');

      if (clientId) {
        fetchQuery = fetchQuery.eq('client_id', clientId);
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', user.id)
          .single();

        fetchQuery = fetchQuery.or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);
      }

      const { data: businesses, error: fetchError } = await fetchQuery;
      if (fetchError) throw fetchError;

      const platformName = `url_${platformKey.replace('Url', '')}`;
      let removedCount = 0;

      for (const business of businesses || []) {
        const existingSocials = Array.isArray(business.socialMediaUrls) ? business.socialMediaUrls : [];
        const hasPlatform = existingSocials.some((social: any) => social.name === platformName);
        
        if (hasPlatform) {
          const updatedSocials = existingSocials.filter((social: any) => social.name !== platformName);
          const { error: updateError } = await supabase
            .from('businesses')
            .update({ socialMediaUrls: updatedSocials })
            .eq('id', business.id);
          if (updateError) throw updateError;
          removedCount++;
        }
      }

      const platformLabel = SOCIAL_PLATFORMS.find(p => p.key === platformKey)?.label || 'Social media';
      toast({
        title: "Platform Links Removed",
        description: `Removed ${platformLabel} links from ${removedCount} location${removedCount !== 1 ? 's' : ''}`,
      });

      setRemovePlatform('');
      fetchSocialStats();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error removing platform links:', error);
      toast({
        title: "Error",
        description: "Failed to remove platform links",
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Current Status</span>
              <span className="sm:hidden">Status</span>
            </TabsTrigger>
            <TabsTrigger value="single" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Update Single</span>
              <span className="sm:hidden">Update</span>
            </TabsTrigger>
            <TabsTrigger value="remove-single" className="flex items-center gap-2 text-destructive data-[state=active]:text-destructive">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Remove Single</span>
              <span className="sm:hidden">Remove 1</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Update All</span>
              <span className="sm:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="remove" className="flex items-center gap-2 text-destructive data-[state=active]:text-destructive">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Remove All</span>
              <span className="sm:hidden">Remove</span>
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

          <TabsContent value="remove-single" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Remove Single Platform
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select a platform to remove its links from all locations. Other platform links will remain untouched.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {socialStats.some(s => s.locationsWithSocial > 0) ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Select a platform to remove:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {socialStats.filter(s => s.locationsWithSocial > 0).map(stat => (
                        <button
                          key={stat.platform}
                          type="button"
                          onClick={() => setRemovePlatform(stat.platform)}
                          className={`flex items-center justify-between p-3 rounded-md border transition-colors text-left ${
                            removePlatform === stat.platform
                              ? 'border-destructive bg-destructive/10'
                              : 'border-border hover:border-destructive/50 hover:bg-muted'
                          }`}
                        >
                          <span className="text-sm font-medium">{stat.platformLabel}</span>
                          <Badge variant="secondary">{stat.locationsWithSocial}</Badge>
                        </button>
                      ))}
                    </div>

                    {removePlatform && (() => {
                      const selectedStat = socialStats.find(s => s.platform === removePlatform);
                      return selectedStat ? (
                        <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md space-y-1">
                          <p className="text-sm font-medium text-destructive">
                            This will remove {selectedStat.platformLabel} links from {selectedStat.locationsWithSocial} location{selectedStat.locationsWithSocial !== 1 ? 's' : ''}.
                          </p>
                          {selectedStat.mostCommonUrl && (
                            <p className="text-xs text-muted-foreground font-mono break-all">
                              Most common: {selectedStat.mostCommonUrl}
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No social media links are currently set.</p>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        disabled={loading || !removePlatform}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove {SOCIAL_PLATFORMS.find(p => p.key === removePlatform)?.label || 'Platform'} Links
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove all {SOCIAL_PLATFORMS.find(p => p.key === removePlatform)?.label} links from all locations in this account. 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => onRemoveSingle(removePlatform)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, Remove {SOCIAL_PLATFORMS.find(p => p.key === removePlatform)?.label}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
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

          <TabsContent value="remove" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Remove All Social Links
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  This will remove all social media links from all locations in this account. This action cannot be undone.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary of what will be removed */}
                {socialStats.some(s => s.locationsWithSocial > 0) ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Current social links that will be removed:</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {socialStats.filter(s => s.locationsWithSocial > 0).map(stat => (
                        <div key={stat.platform} className="flex items-center justify-between p-2 bg-muted rounded-md">
                          <span className="text-sm">{stat.platformLabel}</span>
                          <Badge variant="secondary">{stat.locationsWithSocial}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No social media links are currently set.</p>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        disabled={loading || !socialStats.some(s => s.locationsWithSocial > 0)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove All Social Links
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove all social media links from all locations in this account. 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={onRemoveAll}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, Remove All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSocialsDialog;