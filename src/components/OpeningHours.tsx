import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface Hours {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
}

interface OpeningHoursProps {
  hours: Hours;
  onHoursChange: (hours: Hours) => void;
}

const daysOfWeek = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const OpeningHours = ({ hours, onHoursChange }: OpeningHoursProps) => {
  const updateHour = (day: keyof Hours, value: string) => {
    // Convert "Closed" to null for database storage
    const dbValue = value.toLowerCase() === 'closed' ? null : value;
    onHoursChange({
      ...hours,
      [day]: dbValue,
    });
  };

  const setAllWeekdays = (value: string) => {
    const dbValue = value.toLowerCase() === 'closed' ? null : value;
    onHoursChange({
      ...hours,
      monday: dbValue,
      tuesday: dbValue,
      wednesday: dbValue,
      thursday: dbValue,
      friday: dbValue,
    });
  };

  const setAllWeekend = (value: string) => {
    const dbValue = value.toLowerCase() === 'closed' ? null : value;
    onHoursChange({
      ...hours,
      saturday: dbValue,
      sunday: dbValue,
    });
  };

  const parseHourRange = (hourString: string | null) => {
    // Treat null or empty as closed
    if (!hourString || hourString.toLowerCase() === 'closed') {
      return { open: '', close: '', isClosed: true };
    }
    
    const parts = hourString.split('-');
    if (parts.length === 2) {
      return { open: parts[0], close: parts[1], isClosed: false };
    }
    
    return { open: '', close: '', isClosed: false };
  };

  const formatHourRange = (open: string, close: string, isClosed: boolean) => {
    if (isClosed || (!open && !close)) {
      return 'Closed';
    }
    return `${open}-${close}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Opening Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekdays('09:00-18:00')}
          >
            Weekdays 9-6
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekdays('08:00-17:00')}
          >
            Weekdays 8-5
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekend('10:00-14:00')}
          >
            Weekend 10-2
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekend('Closed')}
          >
            Close Weekends
          </Button>
        </div>

        {/* Individual day inputs */}
        <div className="grid gap-3">
          {daysOfWeek.map(({ key, label }) => {
            const { open, close, isClosed } = parseHourRange(hours[key]);
            
            return (
              <div key={key} className="grid grid-cols-4 gap-3 items-center">
                <Label className="font-medium">{label}</Label>
                
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={open}
                    onChange={(e) => {
                      const newValue = formatHourRange(e.target.value, close, false);
                      updateHour(key, newValue);
                    }}
                    disabled={isClosed}
                    className="text-sm"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={close}
                    onChange={(e) => {
                      const newValue = formatHourRange(open, e.target.value, false);
                      updateHour(key, newValue);
                    }}
                    disabled={isClosed}
                    className="text-sm"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isClosed ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newValue = isClosed ? '09:00-18:00' : 'Closed';
                      updateHour(key, newValue);
                    }}
                  >
                    {isClosed ? 'Closed' : 'Close'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Raw input for custom formats */}
        <div className="pt-4 border-t">
          <Label className="text-sm font-medium mb-2 block">
            Custom Format (Advanced)
          </Label>
          <div className="grid gap-2 text-xs">
            {daysOfWeek.map(({ key, label }) => (
              <div key={key} className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground">{label}:</span>
                <Input
                  value={hours[key] || 'Closed'}
                  onChange={(e) => updateHour(key, e.target.value)}
                  placeholder="e.g., 09:00-18:00 or Closed"
                  className="text-xs col-span-2"
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OpeningHours;