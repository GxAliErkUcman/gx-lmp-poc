import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface CategoryNameChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  changedFields: string[];
}

const CategoryNameChangeDialog = ({
  open,
  onOpenChange,
  onConfirm,
  changedFields,
}: CategoryNameChangeDialogProps) => {
  const [confirmText, setConfirmText] = useState('');

  const handleConfirm = () => {
    if (confirmText === 'PROCEED') {
      onConfirm();
      setConfirmText('');
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setConfirmText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-6 w-6" />
            <DialogTitle>Warning: Critical Fields Changed</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p className="font-semibold text-foreground">
              You have changed: {changedFields.join(' and ')}
            </p>
            <p>
              Changing your Business Profile Category and Business Name can have negative 
              repercussions on Google Business Profile. It can lead to suspensions and other 
              issues with Google Support.
            </p>
            <p className="font-semibold text-destructive">
              Please contact the Support Team before making any changes!
            </p>
            <p className="text-sm">
              If you still want to go through with the change and risk GBP suspension, 
              please type <strong>PROCEED</strong> below:
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-text">Type PROCEED to confirm</Label>
          <Input
            id="confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="PROCEED"
            className="font-mono"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText !== 'PROCEED'}
          >
            Confirm Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryNameChangeDialog;
