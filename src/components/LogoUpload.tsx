import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface LogoUploadProps {
  onLogoUploaded: () => void;
}

const LogoUpload = ({ onLogoUploaded }: LogoUploadProps) => {
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

      // Update all businesses for this user with the new logo
      const { error: updateError } = await supabase
        .from('businesses')
        .update({ logoPhoto: data.publicUrl })
        .eq('user_id', user.id);

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