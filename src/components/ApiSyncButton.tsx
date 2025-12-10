import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ApiSyncButtonProps {
  clientId: string;
  onSyncComplete?: () => void;
}

// Only show for Energie 360° client
const ENERGIE_360_CLIENT_ID = 'e77c44c5-0585-4225-a5ea-59a38edb85fb';

export const ApiSyncButton = ({ clientId, onSyncComplete }: ApiSyncButtonProps) => {
  const [isSyncing, setIsSyncing] = useState(false);

  // Only render for Energie 360° client
  if (clientId !== ENERGIE_360_CLIENT_ID) {
    return null;
  }

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-eco-movement', {
        body: { manual: true }
      });

      if (error) throw error;

      toast({
        title: 'API Sync Complete',
        description: `Fetched ${data.locationsFetched || 0} locations. Created: ${data.locationsCreated || 0}, Updated: ${data.locationsUpdated || 0}`,
      });

      onSyncComplete?.();
    } catch (error) {
      console.error('API sync error:', error);
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync with Eco-Movement API',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleSync}
      disabled={isSyncing}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? 'Syncing...' : 'API Sync'}
    </Button>
  );
};
