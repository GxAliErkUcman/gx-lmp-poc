import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean;
}

interface ManageColumnsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

const ManageColumnsDialog = ({ 
  open, 
  onOpenChange, 
  columns, 
  onColumnsChange 
}: ManageColumnsDialogProps) => {
  const [tempColumns, setTempColumns] = useState<ColumnConfig[]>(columns);

  const handleColumnToggle = (key: string, visible: boolean) => {
    setTempColumns(prev => 
      prev.map(col => 
        col.key === key ? { ...col, visible } : col
      )
    );
  };

  const handleSave = () => {
    onColumnsChange(tempColumns);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempColumns(columns);
    onOpenChange(false);
  };

  const handleReset = () => {
    const resetColumns = tempColumns.map(col => ({
      ...col,
      visible: col.required || ['storeCode', 'businessName', 'primaryCategory', 'city', 'country'].includes(col.key)
    }));
    setTempColumns(resetColumns);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Manage Table Columns
          </DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Column Visibility</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select which columns to display in the table view.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {tempColumns.map((column) => (
              <div key={column.key} className="flex items-center space-x-3">
                <Checkbox
                  id={column.key}
                  checked={column.visible}
                  onCheckedChange={(checked) => 
                    handleColumnToggle(column.key, checked as boolean)
                  }
                  disabled={column.required}
                />
                <label
                  htmlFor={column.key}
                  className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                    column.required ? 'text-muted-foreground' : ''
                  }`}
                >
                  {column.label}
                  {column.required && ' (Required)'}
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Apply Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageColumnsDialog;