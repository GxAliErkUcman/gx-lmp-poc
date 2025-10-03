import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Upload, FileText, CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { validateBusiness, ValidationError } from '@/lib/validation';

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

interface DuplicateBusiness {
  importRow: ParsedData;
  existingBusiness: any;
  storeCode: string;
}

const ImportDialog = ({ open, onOpenChange, onSuccess }: ImportDialogProps) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [duplicateBusinesses, setDuplicateBusinesses] = useState<DuplicateBusiness[]>([]);
  const [overrideConfirmation, setOverrideConfirmation] = useState('');
  const [allowOverride, setAllowOverride] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'duplicates'>('review');
  const [validationErrors, setValidationErrors] = useState<Map<number, ValidationError[]>>(new Map());

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

  const checkForDuplicates = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get all store codes from the import data
      const storeCodeMapping = columnMappings.find(m => m.mapped === 'storeCode');
      if (!storeCodeMapping) {
        // No store code in import, proceed normally
        setDuplicateBusinesses([]);
        setStep('preview');
        return;
      }

      const importStoreCodes = parsedData
        .map(row => row[storeCodeMapping.original])
        .filter(code => code && String(code).trim() !== '')
        .map(code => String(code).trim());

      if (importStoreCodes.length === 0) {
        // No store codes to check
        setDuplicateBusinesses([]);
        setStep('preview');
        return;
      }

      // Check which store codes already exist in the database
      const { data: existingBusinesses, error } = await supabase
        .from('businesses')
        .select('*')
        .in('storeCode', importStoreCodes);

      if (error) throw error;

      // Find duplicates
      const duplicates: DuplicateBusiness[] = [];
      
      if (existingBusinesses && existingBusinesses.length > 0) {
        parsedData.forEach(row => {
          const rowStoreCode = String(row[storeCodeMapping.original] || '').trim();
          if (rowStoreCode) {
            const existing = existingBusinesses.find(b => b.storeCode === rowStoreCode);
            if (existing) {
              duplicates.push({
                importRow: row,
                existingBusiness: existing,
                storeCode: rowStoreCode
              });
            }
          }
        });
      }

      setDuplicateBusinesses(duplicates);
      setActiveTab(duplicates.length > 0 ? 'duplicates' : 'review');
      setStep('preview');
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      toast({
        title: "Error",
        description: "Failed to check for duplicate businesses.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const previewImport = () => {
    if (!validateMappings()) return;
    
    // Validate each business and store errors
    const errorsMap = new Map<number, ValidationError[]>();
    parsedData.forEach((row, index) => {
      const mappedRow: any = {};
      columnMappings.forEach(mapping => {
        if (mapping.mapped) {
          mappedRow[mapping.mapped] = row[mapping.original];
        }
      });
      
      const validation = validateBusiness(mappedRow);
      if (!validation.isValid) {
        errorsMap.set(index, validation.errors);
      }
    });
    
    setValidationErrors(errorsMap);
    checkForDuplicates();
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

      // Separate new businesses from duplicates
      const storeCodeMapping = columnMappings.find(m => m.mapped === 'storeCode');
      const duplicateStoreCodes = duplicateBusinesses.map(d => d.storeCode);
      
      // Filter out duplicates from the main import unless override is enabled
      let businessesToProcess = parsedData;
      if (duplicateBusinesses.length > 0 && !allowOverride) {
        businessesToProcess = parsedData.filter(row => {
          if (!storeCodeMapping) return true;
          const rowStoreCode = String(row[storeCodeMapping.original] || '').trim();
          return !duplicateStoreCodes.includes(rowStoreCode);
        });
      }

      const businessesToInsert = businessesToProcess.map(row => {
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

      // Handle overrides if enabled
      if (allowOverride && duplicateBusinesses.length > 0) {
        // Delete existing duplicates first
        const duplicateIds = duplicateBusinesses.map(d => d.existingBusiness.id);
        const { error: deleteError } = await supabase
          .from('businesses')
          .delete()
          .in('id', duplicateIds);

        if (deleteError) throw deleteError;
      }

      // Insert new businesses (including overrides if applicable)
      if (businessesToInsert.length > 0) {
        const { error } = await supabase
          .from('businesses')
          .insert(businessesToInsert);

        if (error) throw error;
      }

      const activeCount = businessesToInsert.filter(b => b.status === 'active').length;
      const pendingCount = businessesToInsert.filter(b => b.status === 'pending').length;
      const overrideCount = allowOverride ? duplicateBusinesses.length : 0;
      const skippedCount = duplicateBusinesses.length > 0 && !allowOverride ? duplicateBusinesses.length : 0;

      let description = `${activeCount} complete businesses imported, ${pendingCount} incomplete businesses need attention`;
      if (overrideCount > 0) {
        description += `, ${overrideCount} existing businesses overridden`;
      }
      if (skippedCount > 0) {
        description += `, ${skippedCount} duplicates skipped`;
      }

      toast({
        title: "Import Complete",
        description,
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
    setDuplicateBusinesses([]);
    setOverrideConfirmation('');
    setAllowOverride(false);
    setActiveTab('review');
    setStep('upload');
  };

  const availableFields = Object.keys(fieldMappings);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateMapping(index, '')}
                        className="h-8 w-8 p-0"
                        title="Skip this column"
                      >
                        <X className="h-4 w-4" />
                      </Button>
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
              <h3 className="text-lg font-medium">Review Import</h3>
              <div className="flex items-center gap-2">
                {duplicateBusinesses.length > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {duplicateBusinesses.length} Duplicates
                  </Badge>
                )}
                <Badge variant="outline">
                  {parsedData.length} businesses total
                </Badge>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'review' | 'duplicates')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="review">Review ({parsedData.length - duplicateBusinesses.length} New)</TabsTrigger>
                <TabsTrigger value="duplicates" disabled={duplicateBusinesses.length === 0}>
                  Duplicate Locations ({duplicateBusinesses.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="review" className="space-y-4">
                <div className="max-h-96 overflow-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left w-8"></th>
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
                      {parsedData
                        .filter(row => {
                          const storeCodeMapping = columnMappings.find(m => m.mapped === 'storeCode');
                          if (!storeCodeMapping) return true;
                          const rowStoreCode = String(row[storeCodeMapping.original] || '').trim();
                          return !duplicateBusinesses.some(d => d.storeCode === rowStoreCode);
                        })
                        .slice(0, 5)
                        .map((row, index) => {
                          const originalIndex = parsedData.indexOf(row);
                          const rowErrors = validationErrors.get(originalIndex);
                          return (
                            <tr key={index} className="border-t">
                              <td className="p-2">
                                {rowErrors && rowErrors.length > 0 && (
                                  <HoverCard>
                                    <HoverCardTrigger>
                                      <AlertCircle className="h-4 w-4 text-destructive cursor-help" />
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-80">
                                      <div className="space-y-2">
                                        <h4 className="text-sm font-semibold text-destructive">Validation Errors:</h4>
                                        <ul className="text-xs space-y-1">
                                          {rowErrors.map((error, errIdx) => (
                                            <li key={errIdx} className="flex items-start gap-1">
                                              <span className="font-medium">{error.field}:</span>
                                              <span>{error.message}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                              </td>
                              {columnMappings
                                .filter(m => m.mapped)
                                .map(mapping => (
                                  <td key={mapping.mapped} className="p-2">
                                    {row[mapping.original] || '-'}
                                  </td>
                                ))}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {(parsedData.length - duplicateBusinesses.length) > 5 && (
                    <div className="p-2 text-center text-muted-foreground border-t">
                      ... and {(parsedData.length - duplicateBusinesses.length) - 5} more new businesses
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="duplicates" className="space-y-4">
                {duplicateBusinesses.length > 0 && (
                  <>
                    <Card className="bg-yellow-50 border-yellow-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-800">Duplicate Store Codes Detected</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              The following businesses have store codes that already exist in your database. 
                              You can choose to override them or skip these duplicates.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="max-h-96 overflow-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Store Code</th>
                            <th className="p-2 text-left">Import Data</th>
                            <th className="p-2 text-left">Existing Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {duplicateBusinesses.map((duplicate, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 font-medium">{duplicate.storeCode}</td>
                              <td className="p-2 text-xs">
                                <div className="space-y-1">
                                  <div><strong>Name:</strong> {duplicate.importRow[columnMappings.find(m => m.mapped === 'businessName')?.original || ''] || 'N/A'}</div>
                                  <div><strong>Address:</strong> {duplicate.importRow[columnMappings.find(m => m.mapped === 'addressLine1')?.original || ''] || 'N/A'}</div>
                                </div>
                              </td>
                              <td className="p-2 text-xs">
                                <div className="space-y-1">
                                  <div><strong>Name:</strong> {duplicate.existingBusiness.businessName || 'N/A'}</div>
                                  <div><strong>Address:</strong> {duplicate.existingBusiness.addressLine1 || 'N/A'}</div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <Card className="bg-red-50 border-red-200">
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-red-800">Override Existing Locations</h4>
                              <p className="text-sm text-red-700 mt-1">
                                This will permanently delete the existing businesses and replace them with the imported data.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-red-800">
                                Type "OVERRIDE" to confirm deletion of existing businesses:
                              </label>
                              <Input
                                value={overrideConfirmation}
                                onChange={(e) => setOverrideConfirmation(e.target.value)}
                                placeholder="Type OVERRIDE to confirm"
                                className="mt-1"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="override-checkbox"
                                checked={allowOverride}
                                onCheckedChange={(checked) => setAllowOverride(checked as boolean)}
                                disabled={overrideConfirmation !== 'OVERRIDE'}
                              />
                              <label
                                htmlFor="override-checkbox"
                                className={`text-sm ${overrideConfirmation === 'OVERRIDE' ? 'text-red-800' : 'text-gray-400'}`}
                              >
                                I understand this will permanently delete {duplicateBusinesses.length} existing business{duplicateBusinesses.length > 1 ? 'es' : ''} and replace them with imported data
                              </label>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button onClick={importData} disabled={loading}>
                  {loading ? 'Importing...' : (
                    allowOverride && duplicateBusinesses.length > 0 
                      ? `Import ${parsedData.length} Businesses (Override ${duplicateBusinesses.length} Duplicates)`
                      : `Import ${parsedData.length - duplicateBusinesses.length} New Businesses`
                  )}
                </Button>
              </div>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
