import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Clock, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

const getDaysOfWeek = (t: (key: string) => string) => [
  { key: 'monday', label: t('days:monday') },
  { key: 'tuesday', label: t('days:tuesday') },
  { key: 'wednesday', label: t('days:wednesday') },
  { key: 'thursday', label: t('days:thursday') },
  { key: 'friday', label: t('days:friday') },
  { key: 'saturday', label: t('days:saturday') },
  { key: 'sunday', label: t('days:sunday') },
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
  const { t } = useTranslation();
  const daysOfWeek = getDaysOfWeek(t);
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

  // Parse a day's hours string into multiple time periods
  const parseTimePeriods = (hourString: string | null): { open: string; close: string }[] => {
    if (!hourString || hourString.toLowerCase() === 'closed' || hourString === 'x') {
      return [];
    }
    const ranges = hourString.split(',').map(r => r.trim());
    return ranges.map(range => {
      const parts = range.split('-');
      return { open: parts[0]?.trim() || '', close: parts[1]?.trim() || '' };
    }).filter(p => p.open || p.close);
  };

  // Format periods array back to validated string
  const formatPeriods = (periods: { open: string; close: string }[]): string => {
    if (periods.length === 0) return 'Closed';
    const valid = periods.filter(p => p.open && p.close);
    if (valid.length === 0) return 'Closed';
    return valid.map(p => `${p.open}-${p.close}`).join(', ');
  };

  const isDayClosed = (hourString: string | null): boolean => {
    return !hourString || hourString.toLowerCase() === 'closed' || hourString === 'x';
  };

  const addPeriod = (day: keyof Hours) => {
    const periods = parseTimePeriods(hours[day]);
    periods.push({ open: '', close: '' });
    // Don't format yet - keep empty so user can fill
    const currentPeriods = periods.filter(p => p.open && p.close);
    if (currentPeriods.length === periods.length) {
      updateHour(day, formatPeriods(periods));
    } else {
      // Store with placeholder
      const parts = periods.map(p => {
        if (p.open && p.close) return `${p.open}-${p.close}`;
        return `${p.open || '00:00'}-${p.close || '00:00'}`;
      });
      updateHour(day, parts.join(', '));
    }
  };

  const removePeriod = (day: keyof Hours, index: number) => {
    const periods = parseTimePeriods(hours[day]);
    periods.splice(index, 1);
    updateHour(day, formatPeriods(periods));
  };

  const updatePeriod = (day: keyof Hours, index: number, field: 'open' | 'close', value: string) => {
    const periods = parseTimePeriods(hours[day]);
    if (!periods[index]) {
      periods[index] = { open: '', close: '' };
    }
    periods[index][field] = value;
    updateHour(day, formatPeriods(periods));
  };

  const toggleClosed = (day: keyof Hours) => {
    if (isDayClosed(hours[day])) {
      updateHour(day, '09:00-18:00');
    } else {
      updateHour(day, 'Closed');
    }
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
          {t('sections.openingHours')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekdays('09:00-18:00')}
            disabled={disabled}
          >
            {t('openingHours.weekdays9to6')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekdays('08:00-17:00')}
            disabled={disabled}
          >
            {t('openingHours.weekdays8to5')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekend('10:00-14:00')}
            disabled={disabled}
          >
            {t('openingHours.weekend10to2')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllWeekend('Closed')}
            disabled={disabled}
          >
            {t('openingHours.closeWeekends')}
          </Button>
        </div>

        {/* Google-style day rows with multiple time periods */}
        <div className="space-y-3">
          {daysOfWeek.map(({ key, label }) => {
            const closed = isDayClosed(hours[key]);
            const periods = closed ? [] : parseTimePeriods(hours[key]);
            const hasError = validationErrors.some(e => e.day === label);

            return (
              <div key={key} className={`rounded-lg border p-3 space-y-2 ${hasError ? 'border-destructive' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Label className="font-medium w-24">{label}</Label>
                    <Button
                      type="button"
                      variant={closed ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleClosed(key)}
                      disabled={disabled}
                      className="text-xs h-7"
                    >
                      {closed ? t('actions.closed') : t('actions.close')}
                    </Button>
                  </div>
                  {!closed && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addPeriod(key)}
                      disabled={disabled}
                      className="text-xs h-7 gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add period
                    </Button>
                  )}
                </div>

                {!closed && periods.length > 0 && (
                  <div className="space-y-2 ml-0 sm:ml-[108px]">
                    {periods.map((period, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <Label className="absolute -top-2 left-2 bg-background px-1 text-[10px] text-muted-foreground z-10">
                              Opens at
                            </Label>
                            <Input
                              type="time"
                              value={period.open}
                              onChange={(e) => updatePeriod(key, idx, 'open', e.target.value)}
                              disabled={disabled}
                              className="text-sm h-10 w-[120px]"
                            />
                          </div>
                          <span className="text-muted-foreground">–</span>
                          <div className="relative">
                            <Label className="absolute -top-2 left-2 bg-background px-1 text-[10px] text-muted-foreground z-10">
                              Closes at
                            </Label>
                            <Input
                              type="time"
                              value={period.close}
                              onChange={(e) => updatePeriod(key, idx, 'close', e.target.value)}
                              disabled={disabled}
                              className="text-sm h-10 w-[120px]"
                            />
                          </div>
                        </div>
                        {periods.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePeriod(key, idx)}
                            disabled={disabled}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {closed && (
                  <p className="text-sm text-muted-foreground ml-0 sm:ml-[108px]">No hours set</p>
                )}
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
            className="w-full"
            onClick={() => setValidationDialogOpen(true)}
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            {validationErrors.length} Format Issue{validationErrors.length > 1 ? 's' : ''} Detected - Click to View
          </Button>
        )}
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

            <div className="space-y-2">
              <Label className="text-sm font-medium">Correct Format:</Label>
              <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                <p><strong>Single time range:</strong> <code className="bg-background px-1 rounded">HH:MM-HH:MM</code></p>
                <p><strong>Multiple ranges:</strong> <code className="bg-background px-1 rounded">HH:MM-HH:MM, HH:MM-HH:MM</code></p>
                <p><strong>Closed:</strong> <code className="bg-background px-1 rounded">Closed</code> or <code className="bg-background px-1 rounded">x</code></p>
              </div>
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