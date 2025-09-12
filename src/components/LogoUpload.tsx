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
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
      }`}
    >
      <input {...getInputProps()} />
      <Image className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
      <p className="text-xs font-medium">
        {isDragActive ? 'Drop logo here' : 'Upload Account Logo'}
      </p>
      {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
    </div>
  );
};

export default LogoUpload;