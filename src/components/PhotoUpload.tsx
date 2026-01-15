import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { validateCoverPhoto, validateOtherPhoto, validateLogoImage } from '@/lib/imageValidation';
import { useTranslation } from 'react-i18next';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  photoType?: 'cover' | 'logo' | 'other'; // Type of photo for validation
}

const PhotoUpload = ({ photos, onPhotosChange, maxPhotos = 10, disabled = false, photoType = 'other' }: PhotoUploadProps) => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload photos",
        variant: "destructive",
      });
      return;
    }

    if (photos.length + acceptedFiles.length > maxPhotos) {
      toast({
        title: "Too many photos",
        description: `Maximum ${maxPhotos} photos allowed`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Validate images first
      const validationPromises = acceptedFiles.map(async (file) => {
        let validator;
        if (photoType === 'cover') {
          validator = validateCoverPhoto;
        } else if (photoType === 'logo') {
          validator = validateLogoImage;
        } else {
          validator = validateOtherPhoto;
        }
        return validator(file);
      });

      const validationResults = await Promise.all(validationPromises);
      const failedValidation = validationResults.find(result => !result.valid);

      if (failedValidation) {
        toast({
          title: "Validation Error",
          description: failedValidation.error,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      // All validations passed, proceed with upload
      const uploadPromises = acceptedFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        // Include user ID in file path for RLS policy compliance
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

        return data.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      onPhotosChange([...photos, ...uploadedUrls]);

      toast({
        title: "Success",
        description: `Uploaded ${uploadedUrls.length} photo(s)`,
      });
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Error",
        description: "Failed to upload photos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [photos, onPhotosChange, maxPhotos, user, photoType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: maxPhotos - photos.length
  });

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      {photos.length < maxPhotos && !disabled && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <input {...getInputProps()} disabled={disabled} />
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {isDragActive ? t('photos.dropHere') : t('photos.dragAndDrop')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {photos.length}/{maxPhotos} {t('photos.photosUploaded')}
          </p>
          {uploading && <p className="text-xs text-muted-foreground mt-2">{t('status.loading')}</p>}
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <Card key={index} className="relative">
              <CardContent className="p-2">
                <div className="relative aspect-square">
                  <img
                    src={photo}
                    alt={`Business photo ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => removePhoto(index)}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;