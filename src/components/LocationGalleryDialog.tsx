import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PhotoUpload from '@/components/PhotoUpload';
import CustomPhotoUpload from '@/components/CustomPhotoUpload';
import { Business } from '@/types/business';
import { Image } from 'lucide-react';

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
}: LocationGalleryDialogProps) => {
  const logoPhoto = business.logoPhoto || '';
  const coverPhoto = business.coverPhoto || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Photo Gallery — {business.businessName || business.storeCode}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="custom" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="logo">Logo</TabsTrigger>
            <TabsTrigger value="cover">Cover Photo</TabsTrigger>
            <TabsTrigger value="custom">Other Photos</TabsTrigger>
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
                    {onLogoChange && (
                      <PhotoUpload
                        photos={[logoPhoto]}
                        onPhotosChange={(photos) => onLogoChange(photos[0] || '')}
                        maxPhotos={1}
                        disabled={disabled}
                        photoType="logo"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No logo uploaded</p>
                    {onLogoChange && (
                      <PhotoUpload
                        photos={[]}
                        onPhotosChange={(photos) => onLogoChange(photos[0] || '')}
                        maxPhotos={1}
                        disabled={disabled}
                        photoType="logo"
                      />
                    )}
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
                    {onCoverChange && (
                      <PhotoUpload
                        photos={[coverPhoto]}
                        onPhotosChange={(photos) => onCoverChange(photos[0] || '')}
                        maxPhotos={1}
                        disabled={disabled}
                        photoType="cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No cover photo uploaded</p>
                    {onCoverChange && (
                      <PhotoUpload
                        photos={[]}
                        onPhotosChange={(photos) => onCoverChange(photos[0] || '')}
                        maxPhotos={1}
                        disabled={disabled}
                        photoType="cover"
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LocationGalleryDialog;
