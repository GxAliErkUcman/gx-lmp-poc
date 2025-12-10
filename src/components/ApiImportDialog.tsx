import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Cloud, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ApiImportDialogProps {
  clientId: string;
  clientName: string;
  onSyncComplete?: () => void;
}

interface ImportLog {
  id: string;
  run_at: string;
  status: string;
  locations_fetched: number | null;
  locations_created: number | null;
  locations_updated: number | null;
  error_message: string | null;
  source: string;
}

// Only show for Energie 360° client
const ENERGIE_360_CLIENT_ID = 'e77c44c5-0585-4225-a5ea-59a38edb85fb';

export const ApiImportDialog = ({ clientId, clientName, onSyncComplete }: ApiImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);

  // Only render for Energie 360° client
  if (clientId !== ENERGIE_360_CLIENT_ID) {
    return null;
  }

  const fetchImportLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_import_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('run_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setImportLogs(data || []);
    } catch (error) {
      console.error('Error fetching import logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchImportLogs();
    }
  }, [isOpen, clientId]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('import-eco-movement', {
        body: { manual: true }
      });

      if (error) throw error;

      toast({
        title: 'API Import Complete',
        description: `Fetched ${data.locationsFetched || 0} locations. Created: ${data.locationsCreated || 0}, Updated: ${data.locationsUpdated || 0}`,
      });

      fetchImportLogs();
      onSyncComplete?.();
    } catch (error) {
      console.error('API sync error:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import from Eco-Movement API',
        variant: 'destructive',
      });
      fetchImportLogs();
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'running':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Running</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const lastImport = importLogs[0];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-auto py-1.5 px-2 flex flex-col items-center gap-0.5 min-w-[60px]"
        >
          <Cloud className="w-3.5 h-3.5" />
          <span className="text-[10px] leading-none">API Import</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Eco-Movement API Import - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Last Import Status Card */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">Last Import Status</h3>
            {lastImport ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">{getStatusBadge(lastImport.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <div className="mt-1 font-medium">
                    {new Date(lastImport.run_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Locations Fetched:</span>
                  <div className="mt-1 font-medium">{lastImport.locations_fetched ?? 0}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Created / Updated:</span>
                  <div className="mt-1 font-medium">
                    {lastImport.locations_created ?? 0} / {lastImport.locations_updated ?? 0}
                  </div>
                </div>
                {lastImport.error_message && (
                  <div className="col-span-full">
                    <span className="text-muted-foreground">Error:</span>
                    <div className="mt-1 text-destructive text-xs bg-destructive/10 p-2 rounded">
                      {lastImport.error_message}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No imports yet</p>
            )}
          </div>

          {/* Manual Import Button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Manual Import</p>
              <p className="text-xs text-muted-foreground">Trigger an immediate sync with Eco-Movement API</p>
            </div>
            <Button onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Importing...' : 'Run Import Now'}
            </Button>
          </div>

          {/* Import History */}
          <div>
            <h3 className="font-medium text-sm mb-3">Import History</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : importLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No import history</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Fetched</TableHead>
                    <TableHead className="text-center">Created</TableHead>
                    <TableHead className="text-center">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.run_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-center">{log.locations_fetched ?? 0}</TableCell>
                      <TableCell className="text-center">{log.locations_created ?? 0}</TableCell>
                      <TableCell className="text-center">{log.locations_updated ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
