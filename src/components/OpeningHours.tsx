import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Clock, AlertCircle } from 'lucide-react';

interface Hours {
  monday: string | null;
  tuesday: string | null;
  wednesday: string | null;
  thursday: string | null;
  friday: string | null;
  saturday: string | null;
  sunday: string | null;
}

interface OpeningHoursProps {
  hours: Hours;
  onHoursChange: (hours: Hours) => void;
  disabled?: boolean;
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

// Validation pattern for opening hours
const dayOpeningHoursPattern = /^$|^x$|^((([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2}), ?)*(([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2})))$/;

interface ValidationError {
  day: string;
  value: string;
  message: string;
}

function validateOpeningHours(value: string | null, dayLabel: string): ValidationError | null {
  // Null or empty means closed - valid
  if (!value || value.toLowerCase() === 'closed' || value === 'x') {
    return null;
  }

  // Check against pattern
  if (!dayOpeningHoursPattern.test(value)) {
    // Provide specific error messages
    let message = 'Invalid format';
    
    // Check for common issues
    if (value.includes(';')) {
      message = 'Use comma (,) not semicolon (;) to separate multiple time ranges';
    } else if (!/^[0-9:, \-x]+$/.test(value)) {
      message = 'Contains invalid characters. Only use numbers, colons, hyphens, and commas';
    } else if (value.match(/\d{4}(?!-)/)) {
      message = 'Time must be in HH:MM format with colon (e.g., 21:00 not 2100)';
    } else if (!value.includes('-')) {
      message = 'Missing time range separator. Use format HH:MM-HH:MM';
    } else if (!value.match(/\d{1,2}:\d{2}/)) {
      message = 'Time must include colon (e.g., 09:00 not 0900)';
    }

    return {
      day: dayLabel,
      value,
      message
    };
  }

  return null;
}

const OpeningHours = ({ hours, onHoursChange, disabled = false }: OpeningHoursProps) => {
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);

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

  // Validate all hours and collect errors
  const validationErrors = useMemo(() => {
    const errors: ValidationError[] = [];
    for (const { key, label } of daysOfWeek) {
      const error = validateOpeningHours(hours[key], label);
      if (error) {
        errors.push(error);
      }
    }
    return errors;
  }, [hours]);

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
            disabled={disabled}
          >
            Weekdays 9-6
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekdays('08:00-17:00')}
            disabled={disabled}
          >
            Weekdays 8-5
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekend('10:00-14:00')}
            disabled={disabled}
          >
            Weekend 10-2
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekend('Closed')}
            disabled={disabled}
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
                    disabled={isClosed || disabled}
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
                    disabled={isClosed || disabled}
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
                    disabled={disabled}
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
            {daysOfWeek.map(({ key, label }) => {
              const hasError = validationErrors.some(e => e.day === label);
              return (
                <div key={key} className="grid grid-cols-3 gap-2 items-center">
                  <span className="text-muted-foreground">{label}:</span>
                  <Input
                    value={hours[key] || 'Closed'}
                    onChange={(e) => updateHour(key, e.target.value)}
                    placeholder="e.g., 09:00-18:00 or Closed"
                    className={`text-xs col-span-2 ${hasError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    disabled={disabled}
                  />
                </div>
              );
            })}
          </div>

          {/* Validation error banner */}
          {validationErrors.length > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setValidationDialogOpen(true)}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {validationErrors.length} Format Issue{validationErrors.length > 1 ? 's' : ''} Detected - Click to View
            </Button>
          )}
        </div>
      </CardContent>

      {/* Validation Error Dialog */}
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Opening Hours Format Errors
            </DialogTitle>
            <DialogDescription>
              Some opening hours have invalid formats. Please review and correct them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Error list */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Issues Found:</Label>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
                {validationErrors.map((error, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-medium text-destructive">{error.day}:</p>
                    <p className="text-muted-foreground ml-2">Value: <code className="bg-background px-1 rounded">{error.value}</code></p>
                    <p className="text-destructive ml-2">• {error.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Correct format guide */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Correct Format:</Label>
              <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                <p><strong>Single time range:</strong> <code className="bg-background px-1 rounded">HH:MM-HH:MM</code></p>
                <p><strong>Multiple ranges:</strong> <code className="bg-background px-1 rounded">HH:MM-HH:MM, HH:MM-HH:MM</code></p>
                <p><strong>Closed:</strong> <code className="bg-background px-1 rounded">Closed</code> or <code className="bg-background px-1 rounded">x</code></p>
              </div>
            </div>

            {/* Examples */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Examples:</Label>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1 text-sm font-mono">
                <p>09:00-18:00</p>
                <p>08:00-12:00, 14:00-18:00</p>
                <p>06:00-22:00</p>
                <p>Closed</p>
              </div>
            </div>

            {/* Important notes */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400">Common Mistakes:</p>
              <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1">
                <li>Using semicolon (;) instead of comma (,) for multiple ranges</li>
                <li>Missing colon in time (2100 instead of 21:00)</li>
                <li>Missing hyphen between start and end times</li>
                <li>Spaces in wrong places (use <code className="bg-background px-1 rounded">09:00-18:00</code> not <code className="bg-background px-1 rounded">09:00 - 18:00</code>)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setValidationDialogOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default OpeningHours;