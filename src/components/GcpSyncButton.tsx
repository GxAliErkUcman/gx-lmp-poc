import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Cloud, Upload } from 'lucide-react';

interface GcpSyncButtonProps {
  fileName?: string;
  bucketName?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

const GcpSyncButton = ({ 
  fileName, 
  bucketName = 'json-exports', 
  variant = "outline",
  size = "sm" 
}: GcpSyncButtonProps) => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!fileName) {
      toast({
        title: "Error",
        description: "No file specified for sync",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-to-gcp', {
        body: {
          fileName,
          bucketName
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: `File synced to GCP: ${data.gcpPath}`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync file to GCP",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={syncing || !fileName}
      variant={variant}
      size={size}
      className="gap-2"
    >
      {syncing ? (
        <Upload className="h-4 w-4 animate-spin" />
      ) : (
        <Cloud className="h-4 w-4" />
      )}
      {syncing ? 'Syncing...' : 'Sync to GCP'}
    </Button>
  );
};

export default GcpSyncButton;