import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Undo2 } from 'lucide-react';
import { useFieldHistoryForField, FieldHistoryRecord } from '@/hooks/use-field-history';
import { rollbackField, getFieldDisplayName, getChangeSourceDisplayName } from '@/lib/fieldHistory';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FieldHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  fieldName: string;
  currentValue: string | null;
  onRollback?: () => void;
}

export const FieldHistoryDialog = ({
  open,
  onOpenChange,
  businessId,
  fieldName,
  currentValue,
  onRollback,
}: FieldHistoryDialogProps) => {
  const { user } = useAuth();
  const { history, loading, refetch } = useFieldHistoryForField(businessId, fieldName);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const handleRollback = async (record: FieldHistoryRecord) => {
    if (!user) return;

    setRollingBack(record.id);
    try {
      const result = await rollbackField(
        businessId,
        fieldName,
        record.old_value,
        currentValue,
        user.id
      );

      if (result.success) {
        toast({
          title: 'Rollback successful',
          description: `${getFieldDisplayName(fieldName)} has been restored to its previous value`,
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
    if (value.length > 100) return value.substring(0, 100) + '...';
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
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>History: {getFieldDisplayName(fieldName)}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No history found for this field</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, index) => (
                <div
                  key={record.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSourceBadgeVariant(record.change_source)}>
                        {getChangeSourceDisplayName(record.change_source)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(record.changed_at), 'PPp')}
                      </span>
                    </div>
                    {index > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRollback(record)}
                        disabled={rollingBack === record.id}
                      >
                        <Undo2 className="h-4 w-4 mr-1" />
                        {rollingBack === record.id ? 'Restoring...' : 'Restore'}
                      </Button>
                    )}
                  </div>

                  {record.changed_by_email && (
                    <p className="text-sm text-muted-foreground">
                      Changed by: {record.changed_by_email}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">From:</p>
                      <p className="text-sm bg-destructive/10 text-destructive p-2 rounded break-words">
                        {formatValue(record.old_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">To:</p>
                      <p className="text-sm bg-primary/10 text-primary p-2 rounded break-words">
                        {formatValue(record.new_value)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
