import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Upload, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

interface BackupFile {
  name: string;
  created_at: string;
  updated_at: string;
  clientId: string;
  clientName: string;
  folder: 'crud' | 'weekly';
  metadata?: {
    size?: number;
  };
}

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  onImport?: () => void;
}

export const VersionHistoryDialog = ({ open, onOpenChange, clientId, onImport }: VersionHistoryDialogProps) => {
  const { user } = useAuth();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (open) {
      fetchBackups();
    }
  }, [open, clientId]);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      // Fetch accessible clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name');

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch backups for each client
      const allBackups: BackupFile[] = [];

      for (const client of clientsData || []) {
        if (clientId && client.id !== clientId) continue;

        // Fetch CRUD backups
        const { data: crudFiles, error: crudError } = await supabase.storage
          .from('json-backups')
          .list(`${client.id}/crud`, {
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (!crudError && crudFiles) {
          const filesWithClient = crudFiles.map(file => ({
            ...file,
            clientId: client.id,
            clientName: client.name,
            folder: 'crud' as const,
          }));
          allBackups.push(...filesWithClient);
        }

        // Fetch Weekly backups
        const { data: weeklyFiles, error: weeklyError } = await supabase.storage
          .from('json-backups')
          .list(`${client.id}/weekly`, {
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (!weeklyError && weeklyFiles) {
          const filesWithClient = weeklyFiles.map(file => ({
            ...file,
            clientId: client.id,
            clientName: client.name,
            folder: 'weekly' as const,
          }));
          allBackups.push(...filesWithClient);
        }
      }

      setBackups(allBackups);
    } catch (error: any) {
      console.error('Error fetching backups:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch backup files',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (backup: BackupFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('json-backups')
        .download(`${backup.clientId}/${backup.folder}/${backup.name}`);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Backup downloaded successfully',
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download backup',
        variant: 'destructive',
      });
    }
  };

  const handleImport = async (backup: BackupFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('json-backups')
        .download(`${backup.clientId}/${backup.folder}/${backup.name}`);

      if (error) throw error;

      const text = await data.text();
      const businesses = JSON.parse(text);

      // Import businesses (reusing existing import logic)
      let successCount = 0;
      let errorCount = 0;

      for (const business of businesses) {
        const { error: importError } = await supabase
          .from('businesses')
          .upsert({
            ...business,
            client_id: backup.clientId,
            user_id: user?.id,
            status: 'active',
          }, {
            onConflict: 'storeCode',
          });

        if (importError) {
          console.error('Import error:', importError);
          errorCount++;
        } else {
          successCount++;
        }
      }

      toast({
        title: 'Import Complete',
        description: `Successfully imported ${successCount} locations${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      });

      onImport?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Error',
        description: 'Failed to import backup',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (backup: BackupFile) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;

    try {
      const { error } = await supabase.storage
        .from('json-backups')
        .remove([`${backup.clientId}/${backup.folder}/${backup.name}`]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Backup deleted successfully',
      });

      fetchBackups();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete backup',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Version History - JSON Backups</DialogTitle>
        </DialogHeader>

        <div className="overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No backups found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={`${backup.clientId}-${backup.folder}-${backup.name}`}>
                    <TableCell className="font-medium">{backup.clientName}</TableCell>
                    <TableCell>
                      <Badge variant={backup.folder === 'weekly' ? 'default' : 'secondary'}>
                        {backup.folder === 'weekly' ? 'Weekly' : 'CRUD'}
                      </Badge>
                    </TableCell>
                    <TableCell>{backup.name}</TableCell>
                    <TableCell>{formatDate(backup.created_at)}</TableCell>
                    <TableCell>{formatSize(backup.metadata?.size)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(backup)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImport(backup)}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(backup)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
