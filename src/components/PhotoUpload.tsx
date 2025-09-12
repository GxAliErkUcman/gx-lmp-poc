import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PhotoUploadProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}

const PhotoUpload = ({ photos, onPhotosChange, maxPhotos = 10 }: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
      const uploadPromises = acceptedFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

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
  }, [photos, onPhotosChange, maxPhotos]);

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
      {photos.length < maxPhotos && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {isDragActive ? 'Drop photos here' : 'Drag & drop photos here, or click to select'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {photos.length}/{maxPhotos} photos uploaded
          </p>
          {uploading && <p className="text-xs text-muted-foreground mt-2">Uploading...</p>}
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