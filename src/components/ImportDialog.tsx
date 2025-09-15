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

  // Field mappings aligned with database schema - ordered by specificity
  const fieldMappings: Record<string, string[]> = {
    'storeCode': ['store code', 'storecode', 'code', 'store_code'],
    'businessName': ['business name', 'name', 'company name', 'business', 'company'],
    'primaryCategory': ['primary category', 'category', 'business category', 'type', 'industry'],
    // Address fields - most specific first
    'addressLine5': ['address line 5', 'address5', 'addr5', 'al5'],
    'addressLine4': ['address line 4', 'address4', 'addr4', 'al4'],
    'addressLine3': ['address line 3', 'address3', 'addr3', 'al3'],
    'addressLine2': ['address line 2', 'address2', 'addr2', 'al2'],
    'addressLine1': ['address line 1', 'address1', 'addr1', 'al1', 'street address', 'street', 'address'],
    'postalCode': ['postal code', 'postcode', 'zip code', 'zipcode', 'zip'],
    'city': ['city', 'town'],
    'state': ['state', 'region', 'province', 'area'],
    'country': ['country'],
    'district': ['district', 'neighborhood'],
    // Phone fields
    'primaryPhone': ['primary phone', 'phone', 'telephone', 'tel', 'mobile', 'contact'],
    'additionalPhones': ['additional phones', 'other phones', 'secondary phone'],
    // URL fields - most specific first to prevent website collision
    'appointmentURL': ['appointment url', 'appointment', 'booking url', 'booking'],
    'menuURL': ['menu url', 'menu'],
    'reservationsURL': ['reservation url', 'reservations url', 'reservations'],
    'orderAheadURL': ['order ahead url', 'order url', 'order ahead'],
    'website': ['website', 'web', 'site url', 'site'],
    // Other fields
    'fromTheBusiness': ['from the business', 'description', 'desc', 'about', 'summary'],
    'latitude': ['latitude', 'lat'],
    'longitude': ['longitude', 'lng', 'lon'],
    'additionalCategories': ['additional categories', 'secondary categories', 'other categories'],
    'mondayHours': ['monday hours', 'monday', 'mon hours', 'mon'],
    'tuesdayHours': ['tuesday hours', 'tuesday', 'tue hours', 'tue'],
    'wednesdayHours': ['wednesday hours', 'wednesday', 'wed hours', 'wed'],
    'thursdayHours': ['thursday hours', 'thursday', 'thu hours', 'thu'],
    'fridayHours': ['friday hours', 'friday', 'fri hours', 'fri'],
    'saturdayHours': ['saturday hours', 'saturday', 'sat hours', 'sat'],
    'sundayHours': ['sunday hours', 'sunday', 'sun hours', 'sun'],
    'specialHours': ['special hours', 'holiday hours'],
    'temporarilyClosed': ['temporarily closed', 'temp closed', 'closed'],
    'openingDate': ['opening date', 'open date', 'established'],
    'labels': ['labels', 'tags'],
    'adwords': ['adwords', 'google ads'],
    'logoPhoto': ['logo photo', 'logo image', 'logo'],
    'coverPhoto': ['cover photo', 'main image', 'cover'],
    'otherPhotos': ['other photos', 'photos', 'images'],
    'customServices': ['custom services', 'services'],
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
      
      // Handle different file types with proper encoding support
      let workbook: XLSX.WorkBook;
      if (file.name.toLowerCase().endsWith('.csv')) {
        // For CSV files, read as text with UTF-8 encoding first
        const text = new TextDecoder('utf-8').decode(buffer);
        workbook = XLSX.read(text, { 
          type: 'string',
          raw: false,
          codepage: 65001 // UTF-8 codepage
        });
      } else {
        // For Excel files, use buffer with UTF-8 support
        workbook = XLSX.read(buffer, { 
          type: 'buffer',
          raw: false,
          codepage: 65001 // UTF-8 codepage
        });
      }
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false, // Don't use raw values, format them as strings
        defval: '' // Default value for empty cells
      }) as any[][];

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

      // Auto-detect column mappings with improved precision and compact matching
      const mappings: ColumnMapping[] = headers.map(header => {
        const normalizedHeader = String(header).toLowerCase().trim();
        const compactHeader = normalizedHeader.replace(/[\s_\-]/g, '');
        
        // Find matching field - use exact match (normal or compact), then partial
        let mappedField = '';

        // 0) Direct field-name equality (handles headers like "fromTheBusiness", "additionalPhones")
        const fieldNameKeys = Object.keys(fieldMappings);
        for (const key of fieldNameKeys) {
          const keyCompact = key.toLowerCase().replace(/[\s_\-]/g, '');
          if (compactHeader === keyCompact) {
            mappedField = key;
            break;
          }
        }

        const matchAlias = (field: string, alias: string) => {
          const aliasLower = alias.toLowerCase();
          const aliasCompact = aliasLower.replace(/[\s_\-]/g, '');
          return (
            normalizedHeader === aliasLower ||
            compactHeader === aliasCompact ||
            normalizedHeader.includes(aliasLower) ||
            compactHeader.includes(aliasCompact)
          );
        };

        // Address line disambiguation helper on COMPACT header
        const resolveAddressLine = () => {
          // Try to extract a number after address/addr/al/addressline
          const m = compactHeader.match(/^(?:addressline|address|addr|al)(\d)$/);
          if (m) {
            const n = m[1];
            return `addressLine${n}`;
          }
          // If it's a generic address without number, prefer addressLine1
          if (compactHeader === 'address' || compactHeader === 'streetaddress' || compactHeader === 'addressline') {
            return 'addressLine1';
          }
          return '';
        };

        // First pass: explicit address-line number detection
        if (compactHeader.startsWith('address') || compactHeader.startsWith('addr') || compactHeader.startsWith('al')) {
          const addressField = resolveAddressLine();
          if (addressField) mappedField = addressField;
        }

        // Second pass: specific field disambiguation for common conflicts
        if (!mappedField) {
          // Handle phone field conflicts - check for additional/secondary first
          if (compactHeader.includes('phone') || compactHeader.includes('telephone') || compactHeader.includes('tel')) {
            const isAdditional = (
              compactHeader.includes('additional') ||
              compactHeader.includes('other') ||
              compactHeader.includes('secondary') ||
              compactHeader.includes('alternate') ||
              compactHeader.includes('alt') ||
              /phone\d+/.test(compactHeader) && !/phone1\b/.test(compactHeader)
            );
            if (isAdditional) {
              mappedField = 'additionalPhones';
            } else if (compactHeader.includes('primary') || compactHeader === 'phone' || compactHeader === 'telephone' || compactHeader === 'tel' || compactHeader === 'mobile' || compactHeader === 'contact') {
              mappedField = 'primaryPhone';
            }
          }
          
          // Handle business name vs from business conflicts
          if (compactHeader.includes('business') && !mappedField) {
            if (compactHeader.includes('from') || compactHeader.includes('description') || compactHeader.includes('about')) {
              mappedField = 'fromTheBusiness';
            } else if (compactHeader.includes('name') || compactHeader === 'business' || compactHeader === 'businessname' || compactHeader === 'companyname') {
              mappedField = 'businessName';
            }
          }
        }

        // Third pass: standard alias matching if still not mapped
        if (!mappedField) {
          for (const [field, aliases] of Object.entries(fieldMappings)) {
            for (const alias of aliases) {
              if (matchAlias(field, alias)) {
                // Additional guards for storeCode false positives
                if (field === 'storeCode') {
                  if (compactHeader.includes('postal') || compactHeader.includes('postcode') || compactHeader.includes('zip')) {
                    continue;
                  }
                  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
                  if (days.some(day => compactHeader.includes(day)) && compactHeader.includes('hour')) {
                    continue;
                  }
                }
                
                // Prevent generic 'address' mapping over numbered lines
                if (field === 'addressLine1') {
                  if (/(addressline|address|addr|al)[2345]/.test(compactHeader)) {
                    continue;
                  }
                }

                // Skip phone conflicts that should have been handled above
                if ((field === 'primaryPhone' && (compactHeader.includes('additional') || compactHeader.includes('other') || compactHeader.includes('secondary') || compactHeader.includes('alternate') || compactHeader.includes('alt') || /phone\d+/.test(compactHeader))) ||
                    (field === 'additionalPhones' && !(compactHeader.includes('additional') || compactHeader.includes('other') || compactHeader.includes('secondary') || compactHeader.includes('alternate') || compactHeader.includes('alt') || (/phone\d+/.test(compactHeader) && !/phone1\b/.test(compactHeader))))) {
                  continue;
                }

                // Skip business conflicts that should have been handled above  
                if ((field === 'businessName' && (compactHeader.includes('from') || compactHeader.includes('description') || compactHeader.includes('about') || compactHeader.includes('summary'))) ||
                    (field === 'fromTheBusiness' && compactHeader.includes('name') && !compactHeader.includes('from'))) {
                  continue;
                }

                mappedField = field;
                break;
              }
            }
            if (mappedField) break;
          }
        }

        return {
          original: header,
          mapped: mappedField,
          required: requiredFields.includes(mappedField),
        };
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