import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, Trash2, Eye, History, Search, PlusCircle, MinusCircle, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { getFieldDisplayName, getChangeSourceDisplayName } from '@/lib/fieldHistory';
import { BusinessHistoryView } from '@/components/BusinessHistoryView';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

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

interface FieldHistoryRecord {
  id: string;
  business_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  change_source: string;
  changed_by_email: string | null;
}

interface BusinessWithChanges {
  id: string;
  businessName: string;
  storeCode: string;
  changeCount: number;
  lastChange: string;
}

interface NewLocationRecord {
  id: string;
  storeCode: string;
  businessName: string;
  addedAt: string;
  addedBy: string | null;
  source: string;
}

interface DeletedLocationRecord {
  id: string;
  storeCode: string;
  businessName: string;
  deletedAt: string;
  deletedBy: string | null;
  source: string;
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
  const [activeTab, setActiveTab] = useState<'backups' | 'locations' | 'all'>('backups');
  
  // Field history states
  const [fieldHistory, setFieldHistory] = useState<FieldHistoryRecord[]>([]);
  const [businessesWithChanges, setBusinessesWithChanges] = useState<BusinessWithChanges[]>([]);
  const [businessLookup, setBusinessLookup] = useState<Map<string, { storeCode: string; businessName: string }>>(new Map());
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // All Changes tab filters
  const [allChangesSearch, setAllChangesSearch] = useState('');
  const [allChangesBusinessFilter, setAllChangesBusinessFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  // Business history view state
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedBusinessName, setSelectedBusinessName] = useState<string>('');
  
  // New and deleted locations tracking
  const [newLocations, setNewLocations] = useState<NewLocationRecord[]>([]);
  const [deletedLocations, setDeletedLocations] = useState<DeletedLocationRecord[]>([]);
  const [showNewLocationsDialog, setShowNewLocationsDialog] = useState(false);
  const [showDeletedLocationsDialog, setShowDeletedLocationsDialog] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBackups();
      if (activeTab === 'locations' || activeTab === 'all') {
        fetchFieldHistory();
      }
    }
  }, [open, clientId, activeTab]);

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

  const fetchFieldHistory = async () => {
    setHistoryLoading(true);
    try {
      // First get all businesses for this client to filter history
      let clientBusinessIds: string[] = [];
      if (clientId) {
        const { data: clientBusinesses, error: cbError } = await supabase
          .from('businesses')
          .select('id, businessName, storeCode, created_at, user_id')
          .eq('client_id', clientId);
        
        if (cbError) throw cbError;
        
        clientBusinessIds = (clientBusinesses || []).map((b: any) => b.id);
        
        // Track new locations via field_name = 'business_created'
        const { data: newLocationHistory } = await supabase
          .from('business_field_history')
          .select('*')
          .eq('field_name', 'business_created')
          .in('business_id', clientBusinessIds)
          .order('changed_at', { ascending: false });
        
        if (newLocationHistory && newLocationHistory.length > 0) {
          const newLocs: NewLocationRecord[] = newLocationHistory.map((h: any) => {
            const biz = (clientBusinesses || []).find((b: any) => b.id === h.business_id);
            // Parse new_value to get storeCode and businessName for created records
            let storeCode = biz?.storeCode || '';
            let businessName = biz?.businessName || 'Unnamed';
            try {
              const parsed = JSON.parse(h.new_value || '{}');
              storeCode = parsed.storeCode || storeCode;
              businessName = parsed.businessName || businessName;
            } catch {}
            return {
              id: h.business_id,
              storeCode,
              businessName,
              addedAt: h.changed_at,
              addedBy: h.changed_by_email,
              source: h.change_source || 'crud',
            };
          });
          setNewLocations(newLocs);
        } else {
          setNewLocations([]);
        }

        // Track deleted locations via field_name = 'business_deleted'
        // These may reference business_ids that no longer exist
        const { data: deletedLocationHistory } = await supabase
          .from('business_field_history')
          .select('*')
          .eq('field_name', 'business_deleted')
          .order('changed_at', { ascending: false });
        
        if (deletedLocationHistory && deletedLocationHistory.length > 0) {
          // Filter to only show deletions for this client's businesses (using old_value which contains storeCode/businessName)
          const deletedLocs: DeletedLocationRecord[] = deletedLocationHistory
            .filter((h: any) => {
              // Check if the business_id was one of this client's businesses
              return clientBusinessIds.includes(h.business_id);
            })
            .map((h: any) => {
              // Parse old_value to get storeCode and businessName
              let storeCode = '';
              let businessName = 'Deleted Location';
              try {
                const parsed = JSON.parse(h.old_value || '{}');
                storeCode = parsed.storeCode || '';
                businessName = parsed.businessName || 'Deleted Location';
              } catch {}
              return {
                id: h.business_id,
                storeCode,
                businessName,
                deletedAt: h.changed_at,
                deletedBy: h.changed_by_email,
                source: h.change_source || 'crud',
              };
            });
          setDeletedLocations(deletedLocs);
        } else {
          setDeletedLocations([]);
        }
      }

      // Build query for field history - filter by client businesses
      let historyQuery = supabase
        .from('business_field_history')
        .select('*')
        .neq('field_name', 'business_created') // Exclude new location markers from changes list
        .neq('field_name', 'business_deleted') // Exclude deleted location markers from changes list
        .order('changed_at', { ascending: false })
        .limit(500);

      // Filter by client businesses if clientId provided
      if (clientId && clientBusinessIds.length > 0) {
        historyQuery = historyQuery.in('business_id', clientBusinessIds);
      } else if (clientId && clientBusinessIds.length === 0) {
        // Client has no businesses
        setFieldHistory([]);
        setBusinessesWithChanges([]);
        setHistoryLoading(false);
        return;
      }

      const { data: historyData, error: historyError } = await historyQuery;

      if (historyError) throw historyError;

      setFieldHistory((historyData || []) as FieldHistoryRecord[]);

      // Get businesses with changes
      const businessIds = [...new Set((historyData || []).map((h: any) => h.business_id))];
      
      if (businessIds.length > 0) {
        const { data: businessesData, error: businessesError } = await supabase
          .from('businesses')
          .select('id, businessName, storeCode')
          .in('id', businessIds);

        if (!businessesError && businessesData) {
          // Create lookup map for business info
          const lookup = new Map<string, { storeCode: string; businessName: string }>();
          businessesData.forEach((b: any) => {
            lookup.set(b.id, {
              storeCode: b.storeCode || '',
              businessName: b.businessName || 'Unnamed',
            });
          });
          setBusinessLookup(lookup);

          // Calculate change counts per business
          const changeCounts = new Map<string, { count: number; lastChange: string }>();
          (historyData || []).forEach((h: any) => {
            const existing = changeCounts.get(h.business_id);
            if (!existing) {
              changeCounts.set(h.business_id, { count: 1, lastChange: h.changed_at });
            } else {
              changeCounts.set(h.business_id, { 
                count: existing.count + 1, 
                lastChange: h.changed_at > existing.lastChange ? h.changed_at : existing.lastChange 
              });
            }
          });

          const businessesWithChanges: BusinessWithChanges[] = businessesData.map((b: any) => ({
            id: b.id,
            businessName: b.businessName || 'Unnamed',
            storeCode: b.storeCode,
            changeCount: changeCounts.get(b.id)?.count || 0,
            lastChange: changeCounts.get(b.id)?.lastChange || '',
          })).sort((a, b) => new Date(b.lastChange).getTime() - new Date(a.lastChange).getTime());

          setBusinessesWithChanges(businessesWithChanges);
        }
      } else {
        setBusinessesWithChanges([]);
        setBusinessLookup(new Map());
      }
    } catch (error: any) {
      console.error('Error fetching field history:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch field history',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
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

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'import':
        return 'secondary';
      case 'multi_edit':
        return 'outline';
      case 'rollback':
        return 'default';
      default:
        return 'outline';
    }
  };

  const formatValue = (value: string | null): string => {
    if (value === null || value === '') return '(empty)';
    if (value.length > 50) return value.substring(0, 50) + '...';
    return value;
  };

  const handleViewBusinessHistory = (businessId: string, businessName: string) => {
    setSelectedBusinessId(businessId);
    setSelectedBusinessName(businessName);
  };

  // Filtered field history for All Changes tab
  const filteredFieldHistory = useMemo(() => {
    return fieldHistory.filter(record => {
      // Business filter
      if (allChangesBusinessFilter !== 'all' && record.business_id !== allChangesBusinessFilter) {
        return false;
      }
      
      // Date filter
      const recordDate = new Date(record.changed_at);
      if (dateFrom && isBefore(recordDate, startOfDay(dateFrom))) {
        return false;
      }
      if (dateTo && isAfter(recordDate, endOfDay(dateTo))) {
        return false;
      }
      
      // Search filter
      if (allChangesSearch) {
        const searchLower = allChangesSearch.toLowerCase();
        const businessInfo = businessLookup.get(record.business_id);
        const storeCode = businessInfo?.storeCode?.toLowerCase() || '';
        const businessName = businessInfo?.businessName?.toLowerCase() || '';
        const fieldName = getFieldDisplayName(record.field_name).toLowerCase();
        const oldValue = record.old_value?.toLowerCase() || '';
        const newValue = record.new_value?.toLowerCase() || '';
        const email = record.changed_by_email?.toLowerCase() || '';
        
        return (
          storeCode.includes(searchLower) ||
          businessName.includes(searchLower) ||
          fieldName.includes(searchLower) ||
          oldValue.includes(searchLower) ||
          newValue.includes(searchLower) ||
          email.includes(searchLower)
        );
      }
      
      return true;
    });
  }, [fieldHistory, allChangesBusinessFilter, allChangesSearch, businessLookup, dateFrom, dateTo]);

  // Filter businesses with changes based on date
  const filteredBusinessesWithChanges = useMemo(() => {
    if (!dateFrom && !dateTo) return businessesWithChanges;
    
    // Filter based on field history dates
    const businessIdsInRange = new Set(filteredFieldHistory.map(r => r.business_id));
    return businessesWithChanges.filter(b => businessIdsInRange.has(b.id));
  }, [businessesWithChanges, filteredFieldHistory, dateFrom, dateTo]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="backups">JSON Backups</TabsTrigger>
              <TabsTrigger value="locations">Location Updates</TabsTrigger>
              <TabsTrigger value="all">All Changes</TabsTrigger>
            </TabsList>

            {/* JSON Backups Tab */}
            <TabsContent value="backups">
              <ScrollArea className="max-h-[60vh]">
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
              </ScrollArea>
            </TabsContent>

            {/* Location Updates Tab */}
            <TabsContent value="locations">
              {/* Date Filter */}
              <div className="flex flex-wrap gap-3 mb-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[160px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[160px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {(dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                    Clear
                  </Button>
                )}
              </div>

              {/* New Locations Banner */}
              {newLocations.length > 0 && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <PlusCircle className="h-5 w-5 text-primary" />
                          <span className="font-medium">{newLocations.length} new locations added</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-1 text-xs max-h-[200px] overflow-y-auto">
                          {newLocations.slice(0, 10).map((loc) => (
                            <div key={loc.id} className="flex gap-2">
                              <span className="font-mono">{loc.storeCode}</span>
                              <span className="truncate">{loc.businessName}</span>
                            </div>
                          ))}
                          {newLocations.length > 10 && (
                            <div className="text-muted-foreground">+{newLocations.length - 10} more...</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="outline" size="sm" onClick={() => setShowNewLocationsDialog(true)}>
                    View All
                  </Button>
                </div>
              )}

              {/* Deleted Locations Banner */}
              {deletedLocations.length > 0 && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <MinusCircle className="h-5 w-5 text-destructive" />
                          <span className="font-medium">{deletedLocations.length} locations removed</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-1 text-xs max-h-[200px] overflow-y-auto">
                          {deletedLocations.slice(0, 10).map((loc, idx) => (
                            <div key={`${loc.id}-${idx}`} className="flex gap-2">
                              <span className="font-mono">{loc.storeCode}</span>
                              <span className="truncate">{loc.businessName}</span>
                            </div>
                          ))}
                          {deletedLocations.length > 10 && (
                            <div className="text-muted-foreground">+{deletedLocations.length - 10} more...</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="outline" size="sm" onClick={() => setShowDeletedLocationsDialog(true)}>
                    View All
                  </Button>
                </div>
              )}
              
              <ScrollArea className="max-h-[50vh]">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Loading location updates...</p>
                  </div>
                ) : filteredBusinessesWithChanges.length === 0 && newLocations.length === 0 && deletedLocations.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">No location updates found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Store Code</TableHead>
                        <TableHead>Business Name</TableHead>
                        <TableHead>Changes</TableHead>
                        <TableHead>Last Update</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBusinessesWithChanges.map((business) => (
                        <TableRow key={business.id}>
                          <TableCell className="font-mono text-sm">{business.storeCode}</TableCell>
                          <TableCell className="font-medium">{business.businessName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{business.changeCount} changes</Badge>
                          </TableCell>
                          <TableCell>
                            {business.lastChange ? format(new Date(business.lastChange), 'MMM d, yyyy h:mm a') : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewBusinessHistory(business.id, business.businessName)}
                            >
                              <History className="h-4 w-4 mr-1" />
                              View History
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </TabsContent>

            {/* All Changes Tab */}
            <TabsContent value="all">
              {/* New Locations Banner */}
              {newLocations.length > 0 && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <PlusCircle className="h-5 w-5 text-primary" />
                          <span className="font-medium">{newLocations.length} new locations added</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <div className="space-y-1 text-xs max-h-[200px] overflow-y-auto">
                          {newLocations.slice(0, 10).map((loc) => (
                            <div key={loc.id} className="flex gap-2">
                              <span className="font-mono">{loc.storeCode}</span>
                              <span className="truncate">{loc.businessName}</span>
                            </div>
                          ))}
                          {newLocations.length > 10 && (
                            <div className="text-muted-foreground">+{newLocations.length - 10} more...</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button variant="outline" size="sm" onClick={() => setShowNewLocationsDialog(true)}>
                    View All
                  </Button>
                </div>
              )}
              
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by store code, name, field..."
                    value={allChangesSearch}
                    onChange={(e) => setAllChangesSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={allChangesBusinessFilter} onValueChange={setAllChangesBusinessFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by business" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Businesses</SelectItem>
                    {businessesWithChanges.map((business) => (
                      <SelectItem key={business.id} value={business.id}>
                        {business.storeCode} - {business.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM d") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM d") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {(dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                    Clear
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[45vh]">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">Loading changes...</p>
                  </div>
                ) : filteredFieldHistory.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">
                      {fieldHistory.length === 0 ? 'No changes found' : 'No changes match your filters'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pr-4">
                    {filteredFieldHistory.map((record) => (
                      <div
                        key={record.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                            {businessLookup.get(record.business_id)?.storeCode || 'Unknown'}
                          </span>
                          <span className="font-medium text-sm">
                            {businessLookup.get(record.business_id)?.businessName || 'Unknown Business'}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-medium">
                            {getFieldDisplayName(record.field_name)}
                          </span>
                          <Badge variant={getSourceBadgeVariant(record.change_source)}>
                            {getChangeSourceDisplayName(record.change_source)}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(record.changed_at), 'MMM d, yyyy h:mm a')}</span>
                          {record.changed_by_email && (
                            <span>by {record.changed_by_email}</span>
                          )}
                        </div>

                        <div className="flex gap-2 text-sm">
                          <span className="text-destructive bg-destructive/10 px-2 py-1 rounded">
                            {formatValue(record.old_value)}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-primary bg-primary/10 px-2 py-1 rounded">
                            {formatValue(record.new_value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Business History View Dialog */}
      {selectedBusinessId && (
        <BusinessHistoryView
          open={!!selectedBusinessId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedBusinessId(null);
              setSelectedBusinessName('');
            }
          }}
          businessId={selectedBusinessId}
          businessName={selectedBusinessName}
          onRollback={() => {
            fetchFieldHistory();
            onImport?.();
          }}
        />
      )}

      {/* New Locations Dialog */}
      <Dialog open={showNewLocationsDialog} onOpenChange={setShowNewLocationsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                New Locations Added ({newLocations.length})
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Code</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Added At</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newLocations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell className="font-mono text-sm">{loc.storeCode}</TableCell>
                    <TableCell className="font-medium">{loc.businessName}</TableCell>
                    <TableCell>
                      {format(new Date(loc.addedAt), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={loc.source === 'import' ? 'default' : 'secondary'}>
                        {loc.source === 'import' ? 'Import' : 'CRUD'}
                      </Badge>
                    </TableCell>
                    <TableCell>{loc.addedBy || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Deleted Locations Dialog */}
      <Dialog open={showDeletedLocationsDialog} onOpenChange={setShowDeletedLocationsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2">
                <MinusCircle className="h-5 w-5 text-destructive" />
                Locations Removed ({deletedLocations.length})
              </div>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Code</TableHead>
                  <TableHead>Business Name</TableHead>
                  <TableHead>Deleted At</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Deleted By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedLocations.map((loc, idx) => (
                  <TableRow key={`${loc.id}-${idx}`}>
                    <TableCell className="font-mono text-sm">{loc.storeCode}</TableCell>
                    <TableCell className="font-medium">{loc.businessName}</TableCell>
                    <TableCell>
                      {format(new Date(loc.deletedAt), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={loc.source === 'import' ? 'default' : 'destructive'}>
                        {loc.source === 'import' ? 'Import' : 'CRUD'}
                      </Badge>
                    </TableCell>
                    <TableCell>{loc.deletedBy || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
