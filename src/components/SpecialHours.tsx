import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CalendarIcon, Plus, Trash2, Clock, CalendarRange, AlertCircle } from 'lucide-react';
import { format, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { validateSpecialHours } from '@/lib/validation';

export interface SpecialHourEntry {
  date: Date;
  hours: string; // e.g., "09:00-17:00" or "x" for closed
}

interface SpecialHoursProps {
  specialHours: SpecialHourEntry[];
  onSpecialHoursChange: (specialHours: SpecialHourEntry[]) => void;
  disabled?: boolean;
}

// Convert from schema format "2025-12-25: x, 2025-01-01: 10:00-15:00" to UI format
export function parseSpecialHoursFromSchema(schemaString: string | null): SpecialHourEntry[] {
  if (!schemaString || schemaString.trim() === '') {
    return [];
  }

  const entries = schemaString.split(',').map(entry => entry.trim());
  const result: SpecialHourEntry[] = [];

  for (const entry of entries) {
    const colonIndex = entry.indexOf(':');
    if (colonIndex === -1) continue;

    const dateStr = entry.substring(0, colonIndex).trim();
    const hoursStr = entry.substring(colonIndex + 1).trim();

    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        result.push({
          date,
          hours: hoursStr
        });
      }
    } catch (error) {
      console.warn('Failed to parse special hours entry:', entry);
    }
  }

  return result;
}

// Convert from UI format to schema format
export function formatSpecialHoursToSchema(specialHours: SpecialHourEntry[]): string {
  if (specialHours.length === 0) {
    return '';
  }

  return specialHours
    .map(entry => `${format(entry.date, 'yyyy-MM-dd')}: ${entry.hours}`)
    .join(', ');
}

const SpecialHours = ({ specialHours, onSpecialHoursChange, disabled = false }: SpecialHoursProps) => {
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [rangeHours, setRangeHours] = useState({ open: '09:00', close: '17:00', isClosed: true });
  const [validationErrorDialogOpen, setValidationErrorDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const addSpecialHour = () => {
    const newEntry: SpecialHourEntry = {
      date: new Date(),
      hours: 'x' // Closed by default
    };
    onSpecialHoursChange([...specialHours, newEntry]);
  };

  const openDateRangeDialog = () => {
    setDateRange(undefined);
    setRangeHours({ open: '09:00', close: '17:00', isClosed: true });
    setDateRangeDialogOpen(true);
  };

  const applyDateRange = () => {
    if (!dateRange?.from || !dateRange?.to) return;

    // Generate all dates in the range
    const datesInRange = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to
    });

    // Create special hour entries for each date
    const newEntries: SpecialHourEntry[] = datesInRange.map(date => ({
      date,
      hours: rangeHours.isClosed ? 'x' : `${rangeHours.open}-${rangeHours.close}`
    }));

    // Add to existing special hours
    onSpecialHoursChange([...specialHours, ...newEntries]);
    setDateRangeDialogOpen(false);
  };

  const removeSpecialHour = (index: number) => {
    const updated = specialHours.filter((_, i) => i !== index);
    onSpecialHoursChange(updated);
  };

  const updateSpecialHour = (index: number, field: keyof SpecialHourEntry, value: any) => {
    const updated = specialHours.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    );
    onSpecialHoursChange(updated);
  };

  const parseHourRange = (hourString: string) => {
    if (hourString === 'x' || hourString.toLowerCase() === 'closed') {
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
      return 'x';
    }
    return `${open}-${close}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Special Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Set special hours for holidays and other exceptions. These override regular opening hours.
        </p>

        {specialHours.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No special hours added yet</p>
            <p className="text-xs">Click "Add Special Hours" to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {specialHours.map((entry, index) => {
              const { open, close, isClosed } = parseHourRange(entry.hours);
              
              return (
                <div key={index} className="flex items-center gap-3 p-4 border rounded-lg">
                  {/* Date Picker */}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !entry.date && "text-muted-foreground"
                          )}
                          disabled={disabled}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {entry.date ? format(entry.date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={entry.date}
                          onSelect={(date) => date && updateSpecialHour(index, 'date', date)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Hours Input */}
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Hours</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={open}
                        onChange={(e) => {
                          const newValue = formatHourRange(e.target.value, close, false);
                          updateSpecialHour(index, 'hours', newValue);
                        }}
                        disabled={isClosed || disabled}
                        className="text-sm"
                        placeholder="Open"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={close}
                        onChange={(e) => {
                          const newValue = formatHourRange(open, e.target.value, false);
                          updateSpecialHour(index, 'hours', newValue);
                        }}
                        disabled={isClosed || disabled}
                        className="text-sm"
                        placeholder="Close"
                      />
                    </div>
                  </div>

                  {/* Closed Toggle */}
                  <div className="flex flex-col items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Button
                      type="button"
                      variant={isClosed ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newValue = isClosed ? '09:00-17:00' : 'x';
                        updateSpecialHour(index, 'hours', newValue);
                      }}
                      disabled={disabled}
                    >
                      {isClosed ? 'Closed' : 'Open'}
                    </Button>
                  </div>

                  {/* Remove Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSpecialHour(index)}
                    className="text-destructive hover:text-destructive"
                    disabled={disabled}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={addSpecialHour}
            className="flex-1"
            disabled={disabled}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Single Date
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={openDateRangeDialog}
            className="flex-1"
            disabled={disabled}
          >
            <CalendarRange className="w-4 h-4 mr-2" />
            Add Date Range
          </Button>
        </div>

        {/* Preview of generated format with validation */}
        {specialHours.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <Label className="text-xs font-medium mb-1 block">Generated Format:</Label>
            <code className="text-xs text-muted-foreground break-all">
              {formatSpecialHoursToSchema(specialHours)}
            </code>
            {(() => {
              const schemaValue = formatSpecialHoursToSchema(specialHours);
              const validation = validateSpecialHours(schemaValue);
              if (!validation.isValid) {
                return (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => {
                      setValidationErrors(validation.errors);
                      setValidationErrorDialogOpen(true);
                    }}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Format Issues Detected - Click to View
                  </Button>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Date Range Dialog */}
        <Dialog open={dateRangeDialogOpen} onOpenChange={setDateRangeDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5" />
                Add Special Hours for Date Range
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Select Date Range</Label>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  className="p-3 pointer-events-auto border rounded-lg"
                />
                {dateRange?.from && dateRange?.to && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")} 
                    ({eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).length} days)
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Hours for All Selected Days</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="time"
                      value={rangeHours.open}
                      onChange={(e) => setRangeHours({ ...rangeHours, open: e.target.value, isClosed: false })}
                      disabled={rangeHours.isClosed}
                      className="text-sm"
                      placeholder="Open"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={rangeHours.close}
                      onChange={(e) => setRangeHours({ ...rangeHours, close: e.target.value, isClosed: false })}
                      disabled={rangeHours.isClosed}
                      className="text-sm"
                      placeholder="Close"
                    />
                  </div>
                  <Button
                    type="button"
                    variant={rangeHours.isClosed ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRangeHours({ ...rangeHours, isClosed: !rangeHours.isClosed })}
                  >
                    {rangeHours.isClosed ? 'Closed' : 'Open'}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDateRangeDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={applyDateRange}
                disabled={!dateRange?.from || !dateRange?.to}
              >
                Apply to All Dates
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Validation Error Dialog */}
        <Dialog open={validationErrorDialogOpen} onOpenChange={setValidationErrorDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Special Hours Format Error
              </DialogTitle>
              <DialogDescription>
                The special hours format is invalid. Please review the issues below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Error list */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Issues Found:</Label>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                  {validationErrors.map((error, idx) => (
                    <p key={idx} className="text-sm text-destructive">• {error}</p>
                  ))}
                </div>
              </div>

              {/* Correct format guide */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Correct Format:</Label>
                <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                  <p><strong>Pattern:</strong> <code className="bg-background px-1 rounded">YYYY-MM-DD: HH:MM-HH:MM</code></p>
                  <p><strong>For closed days:</strong> <code className="bg-background px-1 rounded">YYYY-MM-DD: x</code></p>
                  <p><strong>Multiple entries:</strong> Separate with commas</p>
                </div>
              </div>

              {/* Examples */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Examples:</Label>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1 text-sm font-mono">
                  <p>2025-12-25: x</p>
                  <p>2025-01-01: 10:00-15:00</p>
                  <p>2025-12-31: 09:00-13:00, 2026-01-01: x</p>
                </div>
              </div>

              {/* Important notes */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">Important Notes:</p>
                <ul className="list-disc list-inside mt-1 text-muted-foreground space-y-1">
                  <li>Use lowercase <code className="bg-background px-1 rounded">x</code> for closed (not "y" or uppercase)</li>
                  <li>Date must be in YYYY-MM-DD format (e.g., 2025-12-25)</li>
                  <li>Time must be in 24-hour format (e.g., 09:00-17:00)</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setValidationErrorDialogOpen(false)}>
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SpecialHours;