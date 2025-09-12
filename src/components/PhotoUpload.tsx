import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Photo {
  fileName: string;
  url: string;
  altText: string;
}

interface PhotoUploadProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
}

const PhotoUpload = ({ photos, onPhotosChange, maxPhotos = 10 }: PhotoUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToUpload = acceptedFiles.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      toast({
        title: "Upload limit reached",
        description: `Maximum ${maxPhotos} photos allowed`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = filesToUpload.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('business-photos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('business-photos')
          .getPublicUrl(filePath);

        return {
          fileName,
          url: publicUrl,
          altText: `Business photo - ${file.name}`,
        };
      });

      const uploadedPhotos = await Promise.all(uploadPromises);
      onPhotosChange([...photos, ...uploadedPhotos]);

      toast({
        title: "Success",
        description: `Uploaded ${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? 's' : ''}`,
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
  }, [user, photos, onPhotosChange, maxPhotos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: true,
    disabled: uploading || photos.length >= maxPhotos,
  });

  const removePhoto = async (index: number) => {
    const photo = photos[index];
    try {
      // Extract file path from URL
      const urlParts = photo.url.split('/');
      const filePath = `${user?.id}/${photo.fileName}`;
      
      await supabase.storage
        .from('business-photos')
        .remove([filePath]);

      const newPhotos = photos.filter((_, i) => i !== index);
      onPhotosChange(newPhotos);

      toast({
        title: "Success",
        description: "Photo removed",
      });
    } catch (error) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "Failed to remove photo",
        variant: "destructive",
      });
    }
  };

  const updateAltText = (index: number, altText: string) => {
    const newPhotos = [...photos];
    newPhotos[index].altText = altText;
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {photos.length < maxPhotos && (
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : uploading 
                  ? 'border-muted-foreground/25 cursor-not-allowed' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <p className="font-medium mb-1">
                {isDragActive 
                  ? 'Drop photos here' 
                  : uploading 
                  ? 'Uploading...' 
                  : 'Drag & drop photos or click to browse'
                }
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Supports JPEG, PNG, WebP, GIF
              </p>
              <Button variant="outline" disabled={uploading} type="button">
                {uploading ? 'Uploading...' : 'Browse Files'}
              </Button>
              <div className="mt-2">
                <Badge variant="outline">
                  {photos.length} / {maxPhotos} photos
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <Card key={index} className="relative">
              <CardContent className="p-2">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={photo.url}
                    alt={photo.altText}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden absolute inset-0 flex items-center justify-center bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={() => removePhoto(index)}
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Alt text (optional)"
                    value={photo.altText}
                    onChange={(e) => updateAltText(index, e.target.value)}
                    className="w-full text-xs p-1 border rounded"
                  />
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