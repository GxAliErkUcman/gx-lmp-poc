import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { validateOtherPhoto } from '@/lib/imageValidation';

interface CustomPhoto {
  name: string;
  url: string;
  size: number;
  created: string;
}

interface CustomPhotoUploadProps {
  storeCode: string;
  clientName: string;
  disabled?: boolean;
  maxPhotos?: number;
}

const CustomPhotoUpload = ({ storeCode, clientName, disabled = false, maxPhotos = 10 }: CustomPhotoUploadProps) => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<CustomPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!storeCode || !clientName) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('manage-custom-photos', {
        body: { action: 'list', clientName, storeCode },
      });

      if (response.data?.success) {
        setPhotos(response.data.photos || []);
      } else {
        console.error('Failed to list custom photos:', response.data?.error);
      }
    } catch (error) {
      console.error('Error fetching custom photos:', error);
    } finally {
      setLoading(false);
    }
  }, [storeCode, clientName]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user || !storeCode || !clientName) {
      toast({ title: "Error", description: "Missing required data for upload", variant: "destructive" });
      return;
    }

    if (photos.length + acceptedFiles.length > maxPhotos) {
      toast({ title: "Too many photos", description: `Maximum ${maxPhotos} other photos allowed`, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        // Validate using other photo rules (5MB max only)
        const validation = await validateOtherPhoto(file);
        if (!validation.valid) {
          toast({ title: "Validation Error", description: validation.error, variant: "destructive" });
          continue;
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';

        // Convert to base64
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        const response = await supabase.functions.invoke('manage-custom-photos', {
          body: {
            action: 'upload',
            clientName,
            storeCode,
            fileData: base64,
            fileExtension: fileExt,
          },
        });

        if (response.data?.success) {
          toast({ title: "Success", description: "Photo uploaded successfully" });
        } else {
          toast({ title: "Upload Failed", description: response.data?.error || 'Unknown error', variant: "destructive" });
        }
      }

      // Refresh the list
      await fetchPhotos();
    } catch (error) {
      console.error('Error uploading custom photos:', error);
      toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [photos, maxPhotos, user, storeCode, clientName, fetchPhotos]);

  const handleDelete = async (photo: CustomPhoto) => {
    if (!confirm('Delete this custom photo?')) return;
    setDeletingPhoto(photo.name);
    try {
      const response = await supabase.functions.invoke('manage-custom-photos', {
        body: {
          action: 'delete',
          clientName,
          storeCode,
          objectName: photo.name,
        },
      });

      if (response.data?.success) {
        toast({ title: "Success", description: "Photo deleted" });
        await fetchPhotos();
      } else {
        toast({ title: "Error", description: response.data?.error || 'Delete failed', variant: "destructive" });
      }
    } catch (error) {
      console.error('Error deleting custom photo:', error);
      toast({ title: "Error", description: "Failed to delete photo", variant: "destructive" });
    } finally {
      setDeletingPhoto(null);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.tiff', '.bmp'] },
    maxFiles: maxPhotos - photos.length,
    disabled: disabled || uploading,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading other photos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {photos.length < maxPhotos && !disabled && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">
            {isDragActive ? 'Drop photos here' : 'Drag & drop or click to upload other photos'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {photos.length}/{maxPhotos} photos uploaded • Max 5 MB per photo
          </p>
          {uploading && (
            <div className="flex items-center justify-center mt-2">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-xs text-muted-foreground">Uploading...</span>
            </div>
          )}
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.name} className="relative group">
              <CardContent className="p-2">
                <div className="relative aspect-video">
                  <img
                    src={photo.url}
                    alt="Other photo"
                    className="w-full h-full object-cover rounded"
                    loading="lazy"
                  />
                  {!disabled && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(photo)}
                      disabled={deletingPhoto === photo.name}
                    >
                      {deletingPhoto === photo.name ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No other photos uploaded yet for this location.
        </p>
      )}
    </div>
  );
};

export default CustomPhotoUpload;
