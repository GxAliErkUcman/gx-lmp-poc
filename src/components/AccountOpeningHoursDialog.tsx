import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import OpeningHours from './OpeningHours';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { validateSpecialHours } from '@/lib/validation';
import SpecialHours, { SpecialHourEntry, parseSpecialHoursFromSchema, formatSpecialHoursToSchema } from './SpecialHours';

interface Hours {
  monday: string | null;
  tuesday: string | null;
  wednesday: string | null;
  thursday: string | null;
  friday: string | null;
  saturday: string | null;
  sunday: string | null;
}

interface AccountOpeningHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AccountOpeningHoursDialog = ({ open, onOpenChange, onSuccess }: AccountOpeningHoursDialogProps) => {
  const [hours, setHours] = React.useState<Hours>({
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  });
  const [specialHours, setSpecialHours] = React.useState<SpecialHourEntry[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleApplyToAll = async () => {

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Convert hours to database column format
      const updateData = {
        mondayHours: hours.monday,
        tuesdayHours: hours.tuesday,
        wednesdayHours: hours.wednesday,
        thursdayHours: hours.thursday,
        fridayHours: hours.friday,
        saturdayHours: hours.saturday,
        sundayHours: hours.sunday,
        specialHours: formatSpecialHoursToSchema(specialHours) || null,
      };

      const { error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opening hours applied to all locations",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating opening hours:', error);
      toast({
        title: "Error",
        description: "Failed to update opening hours",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Account-Wide Opening Hours
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-muted-foreground">
            Set opening hours that will be applied to all your business locations. 
            This will overwrite existing hours for all locations.
          </p>

          <OpeningHours hours={hours} onHoursChange={setHours} />

          <SpecialHours 
            specialHours={specialHours}
            onSpecialHoursChange={setSpecialHours}
          />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyToAll} disabled={loading}>
              {loading ? 'Applying...' : 'Apply to All Locations'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountOpeningHoursDialog;