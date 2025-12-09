import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Undo2, Search, Filter } from 'lucide-react';
import { useFieldHistory, FieldHistoryRecord } from '@/hooks/use-field-history';
import { rollbackField, getFieldDisplayName, getChangeSourceDisplayName } from '@/lib/fieldHistory';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BusinessHistoryViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName?: string;
  onRollback?: () => void;
}

export const BusinessHistoryView = ({
  open,
  onOpenChange,
  businessId,
  businessName,
  onRollback,
}: BusinessHistoryViewProps) => {
  const { user } = useAuth();
  const { history, loading, refetch } = useFieldHistory(businessId);
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldFilter, setFieldFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Get unique fields and sources for filters
  const uniqueFields = useMemo(() => {
    const fields = new Set(history.map(h => h.field_name));
    return Array.from(fields).sort();
  }, [history]);

  const uniqueSources = useMemo(() => {
    const sources = new Set(history.map(h => h.change_source));
    return Array.from(sources);
  }, [history]);

  // Filter history based on search and filters
  const filteredHistory = useMemo(() => {
    return history.filter(record => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesField = getFieldDisplayName(record.field_name).toLowerCase().includes(query);
        const matchesOld = record.old_value?.toLowerCase().includes(query);
        const matchesNew = record.new_value?.toLowerCase().includes(query);
        const matchesEmail = record.changed_by_email?.toLowerCase().includes(query);
        if (!matchesField && !matchesOld && !matchesNew && !matchesEmail) {
          return false;
        }
      }

      // Field filter
      if (fieldFilter !== 'all' && record.field_name !== fieldFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== 'all' && record.change_source !== sourceFilter) {
        return false;
      }

      return true;
    });
  }, [history, searchQuery, fieldFilter, sourceFilter]);

  const handleRollback = async (record: FieldHistoryRecord) => {
    if (!user) return;

    // Find the current value (most recent entry for this field)
    const currentRecord = history.find(h => h.field_name === record.field_name);
    const currentValue = currentRecord?.new_value || null;

    setRollingBack(record.id);
    try {
      const result = await rollbackField(
        businessId,
        record.field_name,
        record.old_value,
        currentValue,
        user.id
      );

      if (result.success) {
        toast({
          title: 'Rollback successful',
          description: `${getFieldDisplayName(record.field_name)} has been restored`,
        });
        await refetch();
        onRollback?.();
      } else {
        toast({
          title: 'Rollback failed',
          description: result.error || 'An error occurred',
          variant: 'destructive',
        });
      }
    } finally {
      setRollingBack(null);
    }
  };

  const formatValue = (value: string | null): string => {
    if (value === null || value === '') return '(empty)';
    if (value.length > 80) return value.substring(0, 80) + '...';
    return value;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Field History: {businessName || 'Business'}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 pb-2">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search values, fields, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              {uniqueFields.map(field => (
                <SelectItem key={field} value={field}>
                  {getFieldDisplayName(field)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {uniqueSources.map(source => (
                <SelectItem key={source} value={source}>
                  {getChangeSourceDisplayName(source)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                {history.length === 0 ? 'No history found for this business' : 'No results match your filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((record) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {getFieldDisplayName(record.field_name)}
                      </span>
                      <Badge variant={getSourceBadgeVariant(record.change_source)}>
                        {getChangeSourceDisplayName(record.change_source)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(record.changed_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRollback(record)}
                      disabled={rollingBack === record.id}
                    >
                      <Undo2 className="h-4 w-4 mr-1" />
                      {rollingBack === record.id ? 'Restoring...' : 'Restore'}
                    </Button>
                  </div>

                  {record.changed_by_email && (
                    <p className="text-xs text-muted-foreground">
                      By: {record.changed_by_email}
                    </p>
                  )}

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

        <div className="text-sm text-muted-foreground pt-2 border-t">
          Showing {filteredHistory.length} of {history.length} changes
        </div>
      </DialogContent>
    </Dialog>
  );
};
