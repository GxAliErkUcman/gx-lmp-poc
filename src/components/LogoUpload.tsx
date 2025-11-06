import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { validateLogoImage } from '@/lib/imageValidation';

interface LogoUploadProps {
  onLogoUploaded: () => void;
  clientId?: string;
}

const LogoUpload = ({ onLogoUploaded, clientId }: LogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const onDrop = async (acceptedFiles: File[]) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to upload logo",
        variant: "destructive",
      });
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0]; // Only take the first file
    setUploading(true);

    try {
      // Validate logo image
      const validation = await validateLogoImage(file);
      if (!validation.valid) {
        toast({
          title: "Validation Error",
          description: validation.error,
          variant: "destructive",
        });
        setUploading(false);
        return;
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
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

      // Update all businesses for the specified client or user's client
      let updateQuery = supabase
        .from('businesses')
        .update({ logoPhoto: data.publicUrl });

      if (clientId) {
        // If clientId is provided, update only that client's businesses
        updateQuery = updateQuery.eq('client_id', clientId);
      } else {
        // Otherwise, use the user's client_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', user.id)
          .single();

        updateQuery = updateQuery.or(`user_id.eq.${user.id}${profile?.client_id ? `,client_id.eq.${profile.client_id}` : ''}`);
      }

      const { error: updateError } = await updateQuery;

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Success",
        description: "Logo uploaded and applied to all locations",
      });
      
      onLogoUploaded();
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1
  });

  return (
    <Button
      {...getRootProps()}
      variant="outline"
      size="default"
      disabled={uploading}
      className={`shadow-modern transition-all duration-200 ${
        isDragActive ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <input {...getInputProps()} />
      <Image className="w-4 h-4 mr-2" />
      {uploading ? 'Uploading...' : 'Change your Logo'}
    </Button>
  );
};

export default LogoUpload;