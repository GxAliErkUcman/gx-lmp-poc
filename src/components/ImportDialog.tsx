import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedData {
  [key: string]: any;
}

interface ColumnMapping {
  original: string;
  mapped: string;
  required: boolean;
}

const ImportDialog = ({ open, onOpenChange, onSuccess }: ImportDialogProps) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');

  // Field mappings aligned with database schema
  const fieldMappings: Record<string, string[]> = {
    'storeCode': ['store code', 'store id', 'storeid', 'store_code', 'storecode', 'location code', 'location id', 'branch code', 'branch id'],
    'businessName': ['name', 'business name', 'company name', 'business', 'company'],
    'primaryCategory': ['category', 'business category', 'type', 'industry'],
    'addressLine1': ['address', 'street address', 'street', 'addr1', 'address1'],
    'addressLine2': ['address2', 'addr2', 'address line 2'],
    'addressLine3': ['address3', 'addr3', 'address line 3'],
    'addressLine4': ['address4', 'addr4', 'address line 4'],
    'addressLine5': ['address5', 'addr5', 'address line 5'],
    'city': ['city', 'town'],
    'state': ['state', 'region', 'province', 'area'],
    'country': ['country'],
    'postalCode': ['zip', 'zipcode', 'postal code', 'postcode'],
    'district': ['district', 'neighborhood'],
    'primaryPhone': ['phone', 'telephone', 'tel', 'mobile', 'contact'],
    'additionalPhones': ['additional phones', 'other phones', 'secondary phone'],
    'website': ['website', 'web', 'url', 'site'],
    'fromTheBusiness': ['description', 'desc', 'about', 'summary', 'from the business'],
    'latitude': ['lat', 'latitude'],
    'longitude': ['lng', 'longitude', 'lon'],
    'additionalCategories': ['additional categories', 'secondary categories', 'other categories'],
    'mondayHours': ['monday', 'monday hours', 'mon'],
    'tuesdayHours': ['tuesday', 'tuesday hours', 'tue'],
    'wednesdayHours': ['wednesday', 'wednesday hours', 'wed'],
    'thursdayHours': ['thursday', 'thursday hours', 'thu'],
    'fridayHours': ['friday', 'friday hours', 'fri'],
    'saturdayHours': ['saturday', 'saturday hours', 'sat'],
    'sundayHours': ['sunday', 'sunday hours', 'sun'],
    'specialHours': ['special hours', 'holiday hours'],
    'temporarilyClosed': ['closed', 'temporarily closed', 'temp closed'],
    'openingDate': ['opening date', 'open date', 'established'],
    'labels': ['labels', 'tags'],
    'adwords': ['adwords', 'google ads'],
    'logoPhoto': ['logo', 'logo photo', 'logo image'],
    'coverPhoto': ['cover', 'cover photo', 'main image'],
    'otherPhotos': ['photos', 'other photos', 'images'],
    'appointmentURL': ['appointment', 'appointment url', 'booking'],
    'menuURL': ['menu', 'menu url'],
    'reservationsURL': ['reservations', 'reservation url'],
    'orderAheadURL': ['order ahead', 'order url'],
    'customServices': ['services', 'custom services'],
    'socialMediaUrls': ['social media', 'social urls'],
    'moreHours': ['more hours', 'additional hours']
  };

  const requiredFields = ['businessName'];
  
  // Essential fields for determining if a business is complete
  const essentialFields = ['businessName', 'addressLine1', 'country', 'primaryCategory'];

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setFile(acceptedFiles[0]);
        parseFile(acceptedFiles[0]);
      }
    },
  });

  const parseFile = async (file: File) => {
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (data.length === 0) {
        throw new Error('No data found in file');
      }

      const headers = data[0] as string[];
      const rows = data.slice(1);

      // Convert to objects
      const parsedRows = rows.map(row => {
        const obj: ParsedData = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });

      setParsedData(parsedRows);

      // Auto-detect column mappings with heuristics and sample-based disambiguation
      const dayMap: Record<string, string> = {
        monday: 'mondayHours',
        tuesday: 'tuesdayHours',
        wednesday: 'wednesdayHours',
        thursday: 'thursdayHours',
        friday: 'fridayHours',
        saturday: 'saturdayHours',
        sunday: 'sundayHours',
      };
      const hoursRegex = /^\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*$/i;

      const mappings: ColumnMapping[] = headers.map(header => {
        const normalizedHeader = header.toLowerCase().trim();
        const sample = String(parsedRows?.[0]?.[header] ?? '').toLowerCase().trim();

        // 1) Strong explicit rules first
        // Postal/ZIP
        if (/(postal\s*code|postcode|zip\s*code|zipcode|zip)/i.test(normalizedHeader)) {
          return { original: header, mapped: 'postalCode', required: requiredFields.includes('postalCode') };
        }
        // Day-of-week hours
        for (const [day, field] of Object.entries(dayMap)) {
          if (normalizedHeader.includes(day) || normalizedHeader.startsWith(day.slice(0, 3))) {
            if (hoursRegex.test(sample) || normalizedHeader.includes('hour')) {
              return { original: header, mapped: field, required: requiredFields.includes(field) };
            }
          }
        }

        // 2) Scoring-based fallbacks (with alias weights)
        let mappedField = '';
        let bestMatchScore = 0;
        const aliasWeight = (field: string, alias: string) => {
          if (field === 'storeCode') {
            if (alias === 'store code' || alias === 'storecode' || alias === 'store id' || alias === 'storeid' || alias === 'store_code') return 100;
            if (alias.includes('location') || alias.includes('branch')) return 85;
            if (alias === 'id' || alias === 'code') return 40; // generic, low weight
          }
          return 0;
        };

        for (const [field, aliases] of Object.entries(fieldMappings)) {
          for (const alias of aliases) {
            let score = 0;
            if (normalizedHeader === alias) score = 100;
            else if (normalizedHeader.replace(/[\s_-]/g, '') === alias.replace(/[\s_-]/g, '')) score = 90;
            else if (normalizedHeader.startsWith(alias)) score = 80;
            else if (normalizedHeader.endsWith(alias)) score = 70;
            else if (normalizedHeader.includes(' ' + alias + ' ') || normalizedHeader.startsWith(alias + ' ') || normalizedHeader.endsWith(' ' + alias)) score = 60;

            score += aliasWeight(field, alias);

            if (score > bestMatchScore) { bestMatchScore = score; mappedField = field; }
          }
        }

        // 3) Sample-based tie breakers to avoid incorrect storeCode mapping
        if (mappedField === 'storeCode') {
          if (hoursRegex.test(sample)) {
            for (const [day, field] of Object.entries(dayMap)) {
              if (normalizedHeader.includes(day) || normalizedHeader.startsWith(day.slice(0,3))) {
                mappedField = field;
                break;
              }
            }
          } else if (/(postal|post\s*code|postcode|zip|zipcode)/i.test(normalizedHeader)) {
            mappedField = 'postalCode';
          }
        }

        return { original: header, mapped: mappedField, required: requiredFields.includes(mappedField) };
      });

      setColumnMappings(mappings);
      setStep('mapping');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Error",
        description: "Failed to parse file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (index: number, newMapping: string) => {
    const newMappings = [...columnMappings];
    newMappings[index].mapped = newMapping;
    newMappings[index].required = requiredFields.includes(newMapping);
    setColumnMappings(newMappings);
  };

  const validateMappings = () => {
    const mappedFields = columnMappings.filter(m => m.mapped).map(m => m.mapped);
    const missingRequired = requiredFields.filter(field => !mappedFields.includes(field));
    
    if (missingRequired.length > 0) {
      toast({
        title: "Missing Required Fields", 
        description: `Please map at least the business name field: ${missingRequired.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const checkBusinessCompleteness = (business: any) => {
    return essentialFields.every(field => business[field] && business[field].toString().trim() !== '');
  };

  const previewImport = () => {
    if (!validateMappings()) return;
    setStep('preview');
  };

  const importData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get the user's profile to get their client_id (required for shared business model)
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // For shared business model, client_id is required
      if (!profile?.client_id) {
        toast({
          title: "Error",
          description: "You must be assigned to a client to create businesses. Please contact your administrator.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const businessesToInsert = parsedData.map(row => {
        // Determine if a store code was explicitly provided in the file for this row
        const storeCodeProvided = columnMappings.some(
          (m) => m.mapped === 'storeCode' && row[m.original] && String(row[m.original]).trim() !== ''
        );

        const business: any = {
          user_id: user.id,
          client_id: profile.client_id, // Required for shared business model
          // Let storeCode be auto-generated by DB if not provided in the file
        };

        columnMappings.forEach(mapping => {
          if (mapping.mapped && row[mapping.original] !== undefined && row[mapping.original] !== null && String(row[mapping.original]).trim() !== '') {
            const value = row[mapping.original];
            
            // Handle numeric fields
            if (mapping.mapped === 'latitude' || mapping.mapped === 'longitude') {
              const num = typeof value === 'number' ? value : parseFloat(String(value));
              business[mapping.mapped] = Number.isFinite(num) ? num : null;
            }
            // Handle date fields
            else if (mapping.mapped === 'openingDate') {
              const dateStr = String(value).trim();
              business[mapping.mapped] = dateStr ? new Date(dateStr).toISOString().split('T')[0] : null;
            }
            // Handle boolean fields
            else if (mapping.mapped === 'temporarilyClosed') {
              const v = String(value).toLowerCase().trim();
              business[mapping.mapped] = v === 'true' || v === '1' || v === 'yes';
            }
            // Handle opening hours fields (convert "Closed" to null)
            else if (mapping.mapped.includes('Hours')) {
              const hourValue = String(value).trim();
              business[mapping.mapped] = hourValue && hourValue.toLowerCase() !== 'closed' ? hourValue : null;
            }
            // Handle text fields that can be comma-separated
            else if (mapping.mapped === 'additionalCategories' || mapping.mapped === 'additionalPhones') {
              business[mapping.mapped] = typeof value === 'string' && value.includes(',') 
                ? value.split(',').map((item: string) => item.trim()).filter(Boolean).join(',')
                : value;
            }
            // Handle all other fields as strings
            else {
              business[mapping.mapped] = value;
            }
          }
        });

        // Determine status based on completeness and manual store code presence
        const isComplete = checkBusinessCompleteness(business);
        const usedAutoStoreCode = !storeCodeProvided; // DB will auto-generate if not provided
        business.status = isComplete && !usedAutoStoreCode ? 'active' : 'pending';

        return business;
      });

      const { error } = await supabase
        .from('businesses')
        .insert(businessesToInsert);

      if (error) throw error;

      const activeCount = businessesToInsert.filter(b => b.status === 'active').length;
      const pendingCount = businessesToInsert.filter(b => b.status === 'pending').length;

      toast({
        title: "Import Complete",
        description: `${activeCount} complete businesses imported, ${pendingCount} incomplete businesses need attention`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error importing data:', error);
      toast({
        title: "Import Error",
        description: error?.message ? String(error.message) : "Failed to import businesses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setParsedData([]);
    setColumnMappings([]);
    setStep('upload');
  };

  const availableFields = Object.keys(fieldMappings);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Businesses from Excel/CSV</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {isDragActive ? 'Drop the file here' : 'Drag & drop your file here'}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    Supports Excel (.xlsx, .xls) and CSV files
                  </p>
                  <Button variant="outline">Browse Files</Button>
                </div>
              </CardContent>
            </Card>

            {file && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    {loading && <div className="ml-auto">Processing...</div>}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Map Columns</h3>
              <Badge variant="outline">
                {parsedData.length} rows detected
              </Badge>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {columnMappings.map((mapping, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium">
                          {mapping.original}
                          {mapping.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Sample: {parsedData[0]?.[mapping.original] || 'N/A'}
                        </p>
                      </div>
                      <div className="flex-1">
                        <select
                          className="w-full p-2 border rounded-md"
                          value={mapping.mapped}
                          onChange={(e) => updateMapping(index, e.target.value)}
                        >
                          <option value="">-- Skip this column --</option>
                          {availableFields.map(field => (
                            <option key={field} value={field}>
                              {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-8">
                        {mapping.mapped && mapping.required && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        {mapping.mapped && !mapping.required && (
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetImport}>
                Start Over
              </Button>
              <Button onClick={previewImport}>
                Preview Import
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Preview Import</h3>
              <Badge variant="outline">
                {parsedData.length} businesses to import
              </Badge>
            </div>

            <div className="max-h-96 overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {columnMappings
                      .filter(m => m.mapped)
                      .map(mapping => (
                        <th key={mapping.mapped} className="p-2 text-left">
                          {mapping.mapped.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 5).map((row, index) => (
                    <tr key={index} className="border-t">
                      {columnMappings
                        .filter(m => m.mapped)
                        .map(mapping => (
                          <td key={mapping.mapped} className="p-2">
                            {row[mapping.original] || '-'}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 5 && (
                <div className="p-2 text-center text-muted-foreground border-t">
                  ... and {parsedData.length - 5} more rows
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <div className="flex gap-2">
                <Button onClick={importData} disabled={loading}>
                  {loading ? 'Importing...' : `Import ${parsedData.length} Businesses`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;