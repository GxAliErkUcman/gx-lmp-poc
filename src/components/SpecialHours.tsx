import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface SpecialHourEntry {
  date: Date;
  hours: string; // e.g., "09:00-17:00" or "x" for closed
}

interface SpecialHoursProps {
  specialHours: SpecialHourEntry[];
  onSpecialHoursChange: (specialHours: SpecialHourEntry[]) => void;
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

const SpecialHours = ({ specialHours, onSpecialHoursChange }: SpecialHoursProps) => {
  const addSpecialHour = () => {
    const newEntry: SpecialHourEntry = {
      date: new Date(),
      hours: 'x' // Closed by default
    };
    onSpecialHoursChange([...specialHours, newEntry]);
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
                        disabled={isClosed}
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
                        disabled={isClosed}
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
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addSpecialHour}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Special Hours
        </Button>

        {/* Preview of generated format */}
        {specialHours.length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <Label className="text-xs font-medium mb-1 block">Generated Format:</Label>
            <code className="text-xs text-muted-foreground break-all">
              {formatSpecialHoursToSchema(specialHours)}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpecialHours;