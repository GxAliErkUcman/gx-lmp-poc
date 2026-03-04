import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PhotoUpload from '@/components/PhotoUpload';
import CustomPhotoUpload from '@/components/CustomPhotoUpload';
import { Business } from '@/types/business';
import { Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LocationGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: Business;
  clientName: string;
  onLogoChange?: (url: string) => void;
  onCoverChange?: (url: string) => void;
  disabled?: boolean;
  customPhotosEnabled?: boolean;
}

const LocationGalleryDialog = ({
  open,
  onOpenChange,
  business,
  clientName,
  onLogoChange,
  onCoverChange,
  disabled = false,
  customPhotosEnabled = false,
}: LocationGalleryDialogProps) => {
  const [localLogoPhoto, setLocalLogoPhoto] = useState(business.logoPhoto || '');
  const [localCoverPhoto, setLocalCoverPhoto] = useState(business.coverPhoto || '');

  // Sync local state when business prop changes
  const logoPhoto = onLogoChange ? (business.logoPhoto || '') : localLogoPhoto;
  const coverPhoto = onCoverChange ? (business.coverPhoto || '') : localCoverPhoto;

  const handleDirectUpdate = useCallback(async (field: 'logoPhoto' | 'coverPhoto', url: string) => {
    const { error } = await supabase
      .from('businesses')
      .update({ [field]: url || null })
      .eq('id', business.id);

    if (error) {
      toast({ title: 'Error', description: `Failed to update ${field === 'logoPhoto' ? 'logo' : 'cover photo'}`, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Success', description: `${field === 'logoPhoto' ? 'Logo' : 'Cover photo'} updated` });
    return true;
  }, [business.id]);

  const handleLogoChange = useCallback(async (url: string) => {
    if (onLogoChange) {
      onLogoChange(url);
    } else {
      const success = await handleDirectUpdate('logoPhoto', url);
      if (success) setLocalLogoPhoto(url);
    }
  }, [onLogoChange, handleDirectUpdate]);

  const handleCoverChange = useCallback(async (url: string) => {
    if (onCoverChange) {
      onCoverChange(url);
    } else {
      const success = await handleDirectUpdate('coverPhoto', url);
      if (success) setLocalCoverPhoto(url);
    }
  }, [onCoverChange, handleDirectUpdate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Photo Gallery — {business.businessName || business.storeCode}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="logo" className="mt-4">
          <TabsList className={cn("grid w-full", customPhotosEnabled ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="logo">Logo</TabsTrigger>
            <TabsTrigger value="cover">Cover Photo</TabsTrigger>
            {customPhotosEnabled && <TabsTrigger value="custom">Other Photos</TabsTrigger>}
          </TabsList>

          <TabsContent value="logo" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logo Photo</CardTitle>
              </CardHeader>
              <CardContent>
                {logoPhoto ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <img
                        src={logoPhoto}
                        alt="Logo"
                        className="max-w-[250px] max-h-[250px] object-contain rounded border"
                      />
                    </div>
                    <PhotoUpload
                      photos={[logoPhoto]}
                      onPhotosChange={(photos) => handleLogoChange(photos[0] || '')}
                      maxPhotos={1}
                      disabled={disabled}
                      photoType="logo"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No logo uploaded</p>
                    <PhotoUpload
                      photos={[]}
                      onPhotosChange={(photos) => handleLogoChange(photos[0] || '')}
                      maxPhotos={1}
                      disabled={disabled}
                      photoType="logo"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cover" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cover Photo</CardTitle>
              </CardHeader>
              <CardContent>
                {coverPhoto ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <img
                        src={coverPhoto}
                        alt="Cover"
                        className="max-w-full max-h-[400px] object-contain rounded border"
                      />
                    </div>
                    <PhotoUpload
                      photos={[coverPhoto]}
                      onPhotosChange={(photos) => handleCoverChange(photos[0] || '')}
                      maxPhotos={1}
                      disabled={disabled}
                      photoType="cover"
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No cover photo uploaded</p>
                    <PhotoUpload
                      photos={[]}
                      onPhotosChange={(photos) => handleCoverChange(photos[0] || '')}
                      maxPhotos={1}
                      disabled={disabled}
                      photoType="cover"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {customPhotosEnabled && (
            <TabsContent value="custom" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Other Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomPhotoUpload
                    storeCode={business.storeCode}
                    clientName={clientName}
                    disabled={disabled}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LocationGalleryDialog;
