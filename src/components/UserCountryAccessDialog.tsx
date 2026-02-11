import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatCountryDisplay } from '@/components/CountrySelect';
import { Loader2 } from 'lucide-react';

interface UserCountryAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  clientId?: string;
  onUpdated: () => void;
}

export default function UserCountryAccessDialog({
  open,
  onOpenChange,
  userId,
  userName,
  clientId,
  onUpdated,
}: UserCountryAccessDialogProps) {
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, userId, clientId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch distinct countries from this user's client businesses
      let targetClientId = clientId;
      
      if (!targetClientId) {
        // Get user's client_id from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', userId)
          .maybeSingle();
        targetClientId = profile?.client_id || undefined;
      }

      if (targetClientId) {
        const { data: businesses } = await supabase
          .from('businesses')
          .select('country')
          .eq('client_id', targetClientId)
          .not('country', 'is', null);

        const uniqueCountries = [...new Set((businesses || []).map(b => b.country).filter(Boolean))] as string[];
        uniqueCountries.sort((a, b) => formatCountryDisplay(a).localeCompare(formatCountryDisplay(b)));
        setAvailableCountries(uniqueCountries);
      }

      // Fetch existing country access for this user
      const { data: access } = await supabase
        .from('user_country_access')
        .select('country_code')
        .eq('user_id', userId);

      setSelectedCountries((access || []).map(a => a.country_code));
    } catch (error) {
      console.error('Error fetching country access data:', error);
      toast({ title: 'Error', description: 'Failed to load country access data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCountry = (code: string) => {
    setSelectedCountries(prev => (prev.includes(code) ? prev : [...prev, code]));
  };

  const handleRemoveCountry = (code: string) => {
    setSelectedCountries(prev => prev.filter(c => c !== code));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete all existing country access for this user
      const { error: deleteError } = await supabase
        .from('user_country_access')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Insert new country access entries
      if (selectedCountries.length > 0) {
        const rows = selectedCountries.map(country_code => ({
          user_id: userId,
          country_code,
        }));

        const { error: insertError } = await supabase
          .from('user_country_access')
          .insert(rows);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: selectedCountries.length > 0
          ? `Country access updated: ${selectedCountries.length} ${selectedCountries.length === 1 ? 'country' : 'countries'} selected`
          : 'Country restrictions removed — user can access all countries',
      });
      onUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving country access:', error);
      toast({ title: 'Error', description: 'Failed to save country access', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Country Access — {userName}</DialogTitle>
          <DialogDescription>
            Select which countries this user can access. If none are selected, the user can access all countries.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {selectedCountries.length === 0
                ? 'No restrictions — user sees all countries'
                : `${selectedCountries.length} ${selectedCountries.length === 1 ? 'country' : 'countries'} selected`}
            </div>

            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-2">
                {availableCountries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No countries found in client locations
                  </div>
                ) : (
                  availableCountries.map(code => (
                    <div key={code} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                      <Checkbox
                        id={`country-${code}`}
                        checked={selectedCountries.includes(code)}
                        onCheckedChange={() => handleToggleCountry(code)}
                      />
                      <Label htmlFor={`country-${code}`} className="text-sm cursor-pointer flex-1">
                        {formatCountryDisplay(code)}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || loading}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
