import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MapPin, Download, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface ErrorEntry {
  storeCode: string;
  businessName: string;
  addressLine1: string;
  city: string;
  country: string;
  reason: string;
}

interface BulkGeocodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  onSuccess: () => void;
  /** If provided, only geocode these specific business IDs */
  specificBusinessIds?: string[];
}

type Phase = 'confirm' | 'processing' | 'complete';

const getCountryCode = (countryName: string): string => {
  const codes: Record<string, string> = {
    'Austria': 'AT', 'Germany': 'DE', 'Switzerland': 'CH', 'Turkey': 'TR',
    'United States': 'US', 'United Kingdom': 'GB', 'France': 'FR', 'Italy': 'IT',
    'Spain': 'ES', 'Netherlands': 'NL', 'Belgium': 'BE', 'Poland': 'PL',
    'Czech Republic': 'CZ', 'Hungary': 'HU', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Croatia': 'HR',
    'Romania': 'RO', 'Bulgaria': 'BG', 'Denmark': 'DK', 'Sweden': 'SE', 'Norway': 'NO',
    'Finland': 'FI', 'Portugal': 'PT', 'Greece': 'GR', 'Ireland': 'IE', 'Luxembourg': 'LU',
  };
  return codes[countryName] || '';
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const BulkGeocodeDialog = ({ open, onOpenChange, clientId, onSuccess, specificBusinessIds }: BulkGeocodeDialogProps) => {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [totalCount, setTotalCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [currentLocation, setCurrentLocation] = useState('');
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const cancelledRef = useRef(false);

  const resetState = useCallback(() => {
    setPhase('confirm');
    setTotalCount(0);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailureCount(0);
    setCurrentLocation('');
    setErrors([]);
    setLoading(false);
    cancelledRef.current = false;
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      cancelledRef.current = true;
      resetState();
    }
    onOpenChange(isOpen);
  };

  const fetchMissingLocations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('businesses')
        .select('id, storeCode, businessName, addressLine1, city, state, country, postalCode, latitude, longitude')
        .or('latitude.is.null,longitude.is.null');

      if (specificBusinessIds && specificBusinessIds.length > 0) {
        query = query.in('id', specificBusinessIds);
      } else if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch locations', variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const geocodeSingle = async (business: any): Promise<{ lat: number; lon: number } | null> => {
    const { addressLine1, city, state, country, postalCode } = business;

    // Try structured search first
    if (addressLine1 && city && country) {
      const params = new URLSearchParams({
        format: 'json',
        street: addressLine1,
        city,
        ...(state && { state }),
        country,
        ...(postalCode && { postalcode: postalCode }),
        limit: '1',
      });

      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
      const data = await res.json();
      if (data?.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return { lat, lon };
        }
      }
    }

    // Fallback to freeform
    const parts = [addressLine1, city, state, country].filter(Boolean);
    if (parts.length === 0) return null;

    const params = new URLSearchParams({
      format: 'json',
      q: parts.join(', '),
      limit: '1',
      ...(country && { countrycodes: getCountryCode(country) }),
    });

    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    const data = await res.json();
    if (data?.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
    }

    return null;
  };

  const startGeocoding = async () => {
    cancelledRef.current = false;
    const locations = await fetchMissingLocations();

    if (locations.length === 0) {
      toast({ title: 'All set', description: 'All locations already have coordinates.' });
      handleOpenChange(false);
      return;
    }

    setTotalCount(locations.length);
    setPhase('processing');

    const errorList: ErrorEntry[] = [];
    let successes = 0;
    let failures = 0;

    for (let i = 0; i < locations.length; i++) {
      if (cancelledRef.current) break;

      const biz = locations[i];
      setCurrentLocation(biz.businessName || biz.storeCode || `Location ${i + 1}`);

      if (!biz.addressLine1) {
        errorList.push({
          storeCode: biz.storeCode,
          businessName: biz.businessName || '',
          addressLine1: '',
          city: biz.city || '',
          country: biz.country || '',
          reason: 'No address (Address Line 1 is empty)',
        });
        failures++;
        setFailureCount(failures);
        setProcessedCount(i + 1);
        await sleep(200); // small delay for no-address skips
        continue;
      }

      try {
        const result = await geocodeSingle(biz);

        if (result) {
          const { error } = await supabase
            .from('businesses')
            .update({ latitude: result.lat, longitude: result.lon })
            .eq('id', biz.id);

          if (error) {
            errorList.push({
              storeCode: biz.storeCode,
              businessName: biz.businessName || '',
              addressLine1: biz.addressLine1 || '',
              city: biz.city || '',
              country: biz.country || '',
              reason: `Database update failed: ${error.message}`,
            });
            failures++;
          } else {
            successes++;
          }
        } else {
          errorList.push({
            storeCode: biz.storeCode,
            businessName: biz.businessName || '',
            addressLine1: biz.addressLine1 || '',
            city: biz.city || '',
            country: biz.country || '',
            reason: 'Address not found by geocoding service',
          });
          failures++;
        }
      } catch (err: any) {
        errorList.push({
          storeCode: biz.storeCode,
          businessName: biz.businessName || '',
          addressLine1: biz.addressLine1 || '',
          city: biz.city || '',
          country: biz.country || '',
          reason: `Request error: ${err.message || 'Unknown error'}`,
        });
        failures++;
      }

      setSuccessCount(successes);
      setFailureCount(failures);
      setProcessedCount(i + 1);

      // Rate limit: 1 request per second (Nominatim policy)
      if (i < locations.length - 1 && !cancelledRef.current) {
        await sleep(1100);
      }
    }

    setErrors(errorList);
    setPhase('complete');
    if (successes > 0) onSuccess();
  };

  const downloadErrorReport = () => {
    if (errors.length === 0) return;

    const header = 'Store Code,Business Name,Address Line 1,City,Country,Error Reason';
    const csvRows = errors.map(e =>
      [e.storeCode, e.businessName, e.addressLine1, e.city, e.country, e.reason]
        .map(v => `"${(v || '').replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geocoding-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progressPercent = totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Generate Coordinates
          </DialogTitle>
          <DialogDescription>
            {phase === 'confirm' && 'Auto-detect GPS coordinates for locations missing lat/long using their address.'}
            {phase === 'processing' && 'Geocoding in progress — please do not close this dialog.'}
            {phase === 'complete' && 'Geocoding complete.'}
          </DialogDescription>
        </DialogHeader>

        {phase === 'confirm' && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              This will find coordinates for all {specificBusinessIds ? 'selected' : 'account'} locations that are currently missing latitude/longitude values using their Address Line 1, City, and Country fields.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Rate limited to 1 request/second per Nominatim usage policy. Large accounts may take several minutes.</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={startGeocoding} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : 'Start Geocoding'}
              </Button>
            </div>
          </div>
        )}

        {phase === 'processing' && (
          <div className="space-y-4 pt-2">
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{processedCount} of {totalCount} processed</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="text-sm truncate text-muted-foreground">
              Processing: <span className="font-medium text-foreground">{currentLocation}</span>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" /> {successCount} success
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="w-4 h-4" /> {failureCount} failed
              </span>
            </div>
            <div className="flex justify-end">
              <Button variant="destructive" size="sm" onClick={() => { cancelledRef.current = true; }}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <div className="space-y-4 pt-2">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" /> {successCount} geocoded
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="w-4 h-4" /> {failureCount} failed
              </span>
              {cancelledRef.current && (
                <span className="flex items-center gap-1 text-amber-500">
                  <AlertTriangle className="w-4 h-4" /> Cancelled
                </span>
              )}
            </div>

            {errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Error Report ({errors.length})</h4>
                  <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                    <Download className="w-4 h-4 mr-2" /> Download CSV
                  </Button>
                </div>
                <ScrollArea className="h-[200px] border rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Store Code</th>
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((e, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-mono">{e.storeCode}</td>
                          <td className="p-2 truncate max-w-[150px]">{e.businessName}</td>
                          <td className="p-2 text-destructive">{e.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkGeocodeDialog;
