import { useEffect, useMemo, useState } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Upload, FileText, CheckCircle, AlertCircle, AlertTriangle, X, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { validateBusiness, ValidationError } from '@/lib/validation';
import { trackFieldChanges } from '@/lib/fieldHistory';
import { validateColumnForField, detectCombinedOpeningHoursColumn, ColumnValidationResult } from '@/lib/importValidation';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clientId?: string; // when provided, force imported locations to this client
  mergeMode?: boolean; // when true, only storeCode is required (for partial field updates)
}

interface ParsedData {
  [key: string]: any;
}

interface ColumnMapping {
  original: string;
  mapped: string;
  required: boolean;
  validation?: ColumnValidationResult | null;
  isCombinedHours?: boolean;
}

interface DuplicateBusiness {
  importRow: ParsedData;
  existingBusiness: any;
  storeCode: string;
}

type MergeFieldDiff = { oldValue: any; newValue: any };

const ImportDialog = ({ open, onOpenChange, onSuccess, clientId, mergeMode = false }: ImportDialogProps) => {
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
  const [mergeDiffs, setMergeDiffs] = useState<Map<number, Record<string, MergeFieldDiff>>>(new Map());
  const [selectedValidationRow, setSelectedValidationRow] = useState<{ index: number; errors: ValidationError[]; storeCode: string } | null>(null);

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
    // Social media URLs - individual fields
    'url_facebook': ['facebook url', 'facebook', 'fb url', 'fb'],
    'url_instagram': ['instagram url', 'instagram', 'ig url', 'ig'],
    'url_linkedin': ['linkedin url', 'linkedin'],
    'url_pinterest': ['pinterest url', 'pinterest'],
    'url_tiktok': ['tiktok url', 'tiktok', 'tik tok'],
    'url_twitter': ['twitter url', 'twitter', 'x url', 'x'],
    'url_youtube': ['youtube url', 'youtube', 'yt url', 'yt'],
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
    'moreHours': ['more hours', 'additional hours'],
    'goldmine': ['goldmine', 'data goldmine', 'raw data', 'unstructured data', 'extra data']
  };

  // Required fields for import - these match the validation schema
  // Lat/Long are NOT required (optional with range validation)
  const requiredFields = ['storeCode', 'businessName', 'addressLine1', 'country', 'primaryCategory'];
  
  // Essential fields for determining if a business is complete (used for status calculation)
  const essentialFields = ['businessName', 'addressLine1', 'country', 'primaryCategory'];

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
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
      
      // Handle JSON files separately
      if (file.name.toLowerCase().endsWith('.json')) {
        const text = new TextDecoder('utf-8').decode(buffer);
        const jsonData = JSON.parse(text);
        
        // Handle both array format and object with array property
        let dataArray: any[];
        if (Array.isArray(jsonData)) {
          dataArray = jsonData;
        } else if (jsonData.businesses && Array.isArray(jsonData.businesses)) {
          dataArray = jsonData.businesses;
        } else if (jsonData.locations && Array.isArray(jsonData.locations)) {
          dataArray = jsonData.locations;
        } else {
          throw new Error('JSON must contain an array of businesses');
        }
        
        if (dataArray.length === 0) {
          throw new Error('No data found in JSON file');
        }
        
        // Get all unique keys from the data
        const allKeys = new Set<string>();
        dataArray.forEach(item => {
          Object.keys(item).forEach(key => allKeys.add(key));
        });
        
        const headers = Array.from(allKeys);
        
        // Convert to ParsedData format
        const parsedRows = dataArray.map(item => {
          const obj: ParsedData = {};
          headers.forEach(header => {
            const value = item[header];
            // Handle nested objects and arrays by stringifying them
            if (value !== null && typeof value === 'object') {
              obj[header] = JSON.stringify(value);
            } else {
              obj[header] = value !== undefined && value !== null ? String(value) : '';
            }
          });
          return obj;
        });
        
        setParsedData(parsedRows);
        
        // Auto-detect column mappings for JSON
        const mappings = createColumnMappings(headers);
        setColumnMappings(mappings);
        setStep('mapping');
        return;
      }
      
      // Handle Excel/CSV files with proper encoding support
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
      
      // Auto-detect column mappings
      const mappings = createColumnMappings(headers);
      setColumnMappings(mappings);
      setStep('mapping');
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to parse file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Extract column mapping logic to reusable function
  const createColumnMappings = (headers: string[]): ColumnMapping[] => {
    return headers.map(header => {
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

      const isCombinedHours = detectCombinedOpeningHoursColumn(header);
      
      return {
        original: header,
        mapped: mappedField,
        required: requiredFields.includes(mappedField),
        isCombinedHours,
      };
    });
  };

  // Compute column validations for all mappings
  const columnValidations = useMemo(() => {
    const validations = new Map<number, ColumnValidationResult | null>();
    
    columnMappings.forEach((mapping, index) => {
      if (mapping.mapped && parsedData.length > 0) {
        // Extract column data
        const columnData = parsedData.map(row => String(row[mapping.original] || ''));
        const validation = validateColumnForField(mapping.mapped, columnData, mapping.original);
        if (validation) {
          validations.set(index, validation);
        }
      }
    });
    
    return validations;
  }, [columnMappings, parsedData]);


  const updateMapping = (index: number, newMapping: string) => {
    const newMappings = [...columnMappings];
    const mapping = newMappings[index];
    
    // Check if this is a combined hours column being mapped to a day field
    if (mapping.isCombinedHours && newMapping.endsWith('Hours') && newMapping !== 'specialHours' && newMapping !== 'moreHours') {
      toast({
        title: "Warning: Combined Hours Column",
        description: "This column appears to contain combined opening hours with day names. Each day should have its own column (Monday Hours, Tuesday Hours, etc.) for proper import.",
        variant: "destructive",
      });
    }
    
    mapping.mapped = newMapping;
    mapping.required = requiredFields.includes(newMapping);
    setColumnMappings(newMappings);
  };

  const validateMappings = () => {
    const mappedFields = columnMappings.filter(m => m.mapped).map(m => m.mapped);
    
    // In merge mode, only storeCode is required (for matching existing locations)
    if (mergeMode) {
      if (!mappedFields.includes('storeCode')) {
        toast({
          title: "Missing Store Code", 
          description: "Merge Import requires storeCode to match existing locations.",
          variant: "destructive",
        });
        return false;
      }
      return true;
    }
    
    // Standard import: all required fields must be mapped
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

      // Determine effective client_id for merge-mode isolation
      let effectiveClientId = clientId;
      if (!effectiveClientId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('user_id', user.id)
          .maybeSingle();
        effectiveClientId = profile?.client_id || undefined;
      }

      // Check which store codes already exist in the database
      // NOTE: In merge mode, we scope by client_id to avoid cross-client corruption.
      let existingQuery = supabase
        .from('businesses')
        .select('*')
        .in('storeCode', importStoreCodes);

      if (mergeMode && effectiveClientId) {
        existingQuery = existingQuery.eq('client_id', effectiveClientId);
      }

      const { data: existingBusinesses, error } = await existingQuery;

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

    // Standard import only: validate each incoming row against full schema
    if (!mergeMode) {
      const errorsMap = new Map<number, ValidationError[]>();
      parsedData.forEach((row, index) => {
        const mappedRow: any = {};
        columnMappings.forEach(mapping => {
          if (mapping.mapped) {
            // Include the field even if empty to ensure validation catches missing required fields
            const value = row[mapping.original];
            mappedRow[mapping.mapped] = value !== undefined && value !== null ? value : '';
          }
        });

        // Also ensure all essential required fields exist in the object for validation
        essentialFields.forEach(field => {
          if (!(field in mappedRow)) {
            mappedRow[field] = '';
          }
        });

        const validation = validateBusiness(mappedRow);
        if (!validation.isValid) {
          errorsMap.set(index, validation.errors);
        }
      });

      setValidationErrors(errorsMap);
      setMergeDiffs(new Map());
    } else {
      // Merge import: validation is computed AFTER we fetch existing businesses
      setValidationErrors(new Map());
      setMergeDiffs(new Map());
    }

    checkForDuplicates();
  };

  // In merge mode, compute row diffs + validate against the MERGED record (existing + changes)
  // This prevents missing-required-field errors when the import is intentionally partial.
  useEffect(() => {
    if (!mergeMode || step !== 'preview') return;

    const storeCodeMapping = columnMappings.find(m => m.mapped === 'storeCode');
    if (!storeCodeMapping) return;

    const diffsMap = new Map<number, Record<string, MergeFieldDiff>>();
    const errorsMap = new Map<number, ValidationError[]>();

    const mappedUpdatableFields = columnMappings
      .filter(m => m.mapped && m.mapped !== 'storeCode')
      .map(m => m.mapped);

    parsedData.forEach((row, rowIndex) => {
      const rowStoreCode = String(row[storeCodeMapping.original] || '').trim();
      if (!rowStoreCode) return;

      const dup = duplicateBusinesses.find(d => d.storeCode === rowStoreCode);
      const existing = dup?.existingBusiness;

      if (!existing) {
        errorsMap.set(rowIndex, [
          {
            field: 'storeCode',
            message: 'No existing location found for this store code',
            suggestion: 'Check the store code or use standard Import to create new locations.'
          }
        ]);
        return;
      }

      // Build patch: only fields that (a) have a value in the import and (b) differ from existing.
      const rowDiffs: Record<string, MergeFieldDiff> = {};
      columnMappings.forEach(mapping => {
        if (!mapping.mapped || mapping.mapped === 'storeCode') return;
        const raw = row[mapping.original];
        const hasValue = raw !== undefined && raw !== null && String(raw).trim() !== '';
        if (!hasValue) return;

        const incoming = raw;
        const prev = (existing as any)[mapping.mapped];

        // Compare as strings for most fields to avoid false negatives with type differences
        const incomingComparable = String(incoming).trim();
        const prevComparable = prev === null || prev === undefined ? '' : String(prev).trim();
        if (incomingComparable === prevComparable) return;

        rowDiffs[mapping.mapped] = { oldValue: prev, newValue: incoming };
      });

      diffsMap.set(rowIndex, rowDiffs);

      // Validate merged record but only surface errors related to changed fields.
      const merged = { ...existing };
      Object.entries(rowDiffs).forEach(([field, diff]) => {
        (merged as any)[field] = diff.newValue;
      });

      const validation = validateBusiness(merged);
      if (!validation.isValid) {
        const changedFields = new Set(Object.keys(rowDiffs));
        const relevantErrors = validation.errors.filter(e => changedFields.has(e.field) || e.field === 'storeCode');
        if (relevantErrors.length > 0) {
          errorsMap.set(rowIndex, relevantErrors);
        }
      }
    });

    setMergeDiffs(diffsMap);
    setValidationErrors(errorsMap);
  }, [mergeMode, step, parsedData, columnMappings, duplicateBusinesses]);

  const importData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get the user's profile to get their default client_id (fallback)
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const effectiveClientId = clientId || profile?.client_id;

      // client_id is required
      if (!effectiveClientId) {
        toast({
          title: "Error",
          description: "Please select a client before importing.",
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
          client_id: effectiveClientId, // Force import to selected client
          // Let storeCode be auto-generated by DB if not provided in the file
        };

        // Collect social media URLs
        const socialMediaUrls: any[] = [];
        
        // Collect unmapped columns for goldmine field (column_name: value format)
        const goldmineEntries: string[] = [];
        // Track explicitly mapped goldmine value
        let explicitGoldmine = '';

        columnMappings.forEach(mapping => {
          const value = row[mapping.original];
          const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
          
          // If column is not mapped but has a value, add to goldmine with column name
          if (!mapping.mapped && hasValue) {
            const columnName = mapping.original;
            const cleanValue = String(value).trim();
            goldmineEntries.push(`${columnName}: ${cleanValue}`);
          }
          // If column is mapped to goldmine, collect it separately (may have multiple)
          else if (mapping.mapped === 'goldmine' && hasValue) {
            const columnName = mapping.original;
            const cleanValue = String(value).trim();
            // Include the original column name in the goldmine entry
            goldmineEntries.push(`${columnName}: ${cleanValue}`);
          }
          // Handle other mapped fields
          else if (mapping.mapped && mapping.mapped !== 'goldmine' && hasValue) {
            // CRITICAL: Do NOT clone addressLine2 to addressLine1 or perform any fallback logic
            // If addressLine1 is missing, the business should be marked as incomplete (pending)
            
            // Handle social media URL fields
            if (mapping.mapped.startsWith('url_')) {
              socialMediaUrls.push({
                name: mapping.mapped,
                url: String(value).trim()
              });
            }
            // Handle numeric fields
            else if (mapping.mapped === 'latitude' || mapping.mapped === 'longitude') {
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

        // Combine all goldmine entries with semicolon separator
        if (goldmineEntries.length > 0) {
          business.goldmine = goldmineEntries.join('; ');
        }

        // Add social media URLs if any were collected
        if (socialMediaUrls.length > 0) {
          business.socialMediaUrls = socialMediaUrls;
        }

        // Determine status based on completeness and manual store code presence
        const isComplete = checkBusinessCompleteness(business);
        const usedAutoStoreCode = !storeCodeProvided; // DB will auto-generate if not provided
        business.status = isComplete && !usedAutoStoreCode ? 'active' : 'pending';

        return business;
      });

      // Separate overrides from truly new businesses
      const overriddenStoreCodes = allowOverride 
        ? duplicateBusinesses.map(d => d.storeCode) 
        : [];

      // Handle overrides via MERGE UPDATE (only update fields present in import)
      if (allowOverride && duplicateBusinesses.length > 0) {
        // Get the fields that are explicitly mapped in this import (excluding storeCode)
        const mappedFields = columnMappings
          .filter(m => m.mapped && m.mapped !== 'storeCode')
          .map(m => m.mapped);

        for (const dup of duplicateBusinesses) {
          const oldBusiness = dup.existingBusiness;
          const importedData = businessesToInsert.find(b => b.storeCode === dup.storeCode);
          
          if (importedData && oldBusiness) {
            // Build a merge payload with ONLY the fields present in the import
            const mergePayload: any = {};
            
            mappedFields.forEach(field => {
              // Only include the field if it was explicitly mapped and has a value in the import
              if (importedData[field] !== undefined && importedData[field] !== null && importedData[field] !== '') {
                mergePayload[field] = importedData[field];
              }
            });

            // Handle socialMediaUrls specially - merge with existing
            if (importedData.socialMediaUrls && importedData.socialMediaUrls.length > 0) {
              const existingSocials = Array.isArray(oldBusiness.socialMediaUrls) ? oldBusiness.socialMediaUrls : [];
              const newSocials = importedData.socialMediaUrls;
              
              // Merge: replace existing platform URLs with new ones, keep others
              const mergedSocials = [...existingSocials];
              newSocials.forEach((newSocial: any) => {
                const existingIndex = mergedSocials.findIndex((s: any) => s.name === newSocial.name);
                if (existingIndex >= 0) {
                  mergedSocials[existingIndex] = newSocial;
                } else {
                  mergedSocials.push(newSocial);
                }
              });
              mergePayload.socialMediaUrls = mergedSocials;
            }

            // IMPORTANT: Preserve status if existing location was 'active' 
            // Only set to pending if there's a reason (missing essential fields)
            const mergedBusiness = { ...oldBusiness, ...mergePayload };
            const isStillComplete = checkBusinessCompleteness(mergedBusiness);
            
            // If existing was active and still complete after merge, keep it active
            if (oldBusiness.status === 'active' && isStillComplete) {
              // Don't change status - keep it active
              delete mergePayload.status;
            } else if (!isStillComplete) {
              // Only set to pending if incomplete
              mergePayload.status = 'pending';
            }

            // Skip update if no fields to merge
            if (Object.keys(mergePayload).length === 0) {
              console.log('No fields to update for:', dup.storeCode);
              continue;
            }

            // Track the changes between old and new values BEFORE updating
            await trackFieldChanges(
              oldBusiness.id,
              oldBusiness,
              mergePayload,
              user.id,
              'import',
              undefined,
              user.email || undefined
            );

            // UPDATE only the merged fields
            const { error: updateError } = await supabase
              .from('businesses')
              .update(mergePayload)
              .eq('id', oldBusiness.id);

            if (updateError) {
              console.error('Error updating business:', oldBusiness.id, updateError);
              throw updateError;
            }
          }
        }
      }

      // Filter out overridden businesses from insert list - they were already updated
      const trulyNewBusinesses = businessesToInsert.filter(
        b => !overriddenStoreCodes.includes(b.storeCode)
      );

      // Insert only truly new businesses
      if (trulyNewBusinesses.length > 0) {
        const { data: insertedData, error } = await supabase
          .from('businesses')
          .insert(trulyNewBusinesses)
          .select('id, storeCode, businessName');

        if (error) throw error;

        // Track new locations by creating a special history record
        if (insertedData && insertedData.length > 0) {
          const newLocationRecords = insertedData.map((biz: any) => ({
            business_id: biz.id,
            field_name: 'business_created',
            old_value: null,
            new_value: 'New location added via import',
            changed_by: user.id,
            changed_by_email: user.email || null,
            change_source: 'import',
          }));

          const { error: historyError } = await supabase
            .from('business_field_history')
            .insert(newLocationRecords);

          if (historyError) {
            console.error('Error tracking new locations:', historyError);
          }
        }
      }

      const activeCount = trulyNewBusinesses.filter(b => b.status === 'active').length;
      const pendingCount = trulyNewBusinesses.filter(b => b.status === 'pending').length;
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
          <DialogTitle>
            {mergeMode ? 'Merge Import - Update Existing Locations' : 'Import Businesses from Excel/CSV'}
          </DialogTitle>
          {mergeMode && (
            <p className="text-sm text-muted-foreground">
              Only mapped fields will be updated. Existing data in other fields will be preserved.
            </p>
          )}
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
                    Supports Excel (.xlsx, .xls), CSV, and JSON files
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
              <div className="flex items-center gap-2">
                {Array.from(columnValidations.values()).filter(v => v?.severity === 'error').length > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {Array.from(columnValidations.values()).filter(v => v?.severity === 'error').length} issues
                  </Badge>
                )}
                <Badge variant="outline">
                  {parsedData.length} rows detected
                </Badge>
              </div>
            </div>

            {/* Legend explaining checkmark colors */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
              {mergeMode ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Store Code (required for matching)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span>Field to update</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span>Only mapped fields will be updated</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-red-500 font-bold">*</span>
                    <span>Required field (must be filled for active status)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span>Optional field</span>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {columnMappings.map((mapping, index) => {
                const validation = columnValidations.get(index);
                const hasError = validation?.severity === 'error';
                const hasWarning = validation?.severity === 'warning';
                const showCombinedHoursWarning = mapping.isCombinedHours && mapping.mapped?.endsWith('Hours') && mapping.mapped !== 'specialHours' && mapping.mapped !== 'moreHours';
                
                return (
                  <Card key={index} className={hasError ? 'border-destructive' : hasWarning || showCombinedHoursWarning ? 'border-yellow-500' : ''}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium truncate">
                              {mapping.original}
                              {/* In merge mode, only storeCode is required; in standard mode, show asterisk for all required fields */}
                              {mergeMode 
                                ? (mapping.mapped === 'storeCode' && <span className="text-red-500 ml-1">*</span>)
                                : (mapping.required && <span className="text-red-500 ml-1">*</span>)
                              }
                            </label>
                            {mapping.isCombinedHours && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="h-4 w-4 text-yellow-600" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>This column appears to contain combined opening hours with day names. Consider splitting into separate day columns.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            Sample: {String(parsedData[0]?.[mapping.original] || 'N/A').substring(0, 50)}{String(parsedData[0]?.[mapping.original] || '').length > 50 ? '...' : ''}
                          </p>
                        </div>
                        <div className="flex-1">
                          <select
                            className={`w-full p-2 border rounded-md ${hasError ? 'border-destructive bg-destructive/5' : hasWarning ? 'border-yellow-500 bg-yellow-50' : ''}`}
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
                        <div className="w-8 flex-shrink-0">
                          {validation ? (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <button type="button" className="cursor-help">
                                  {hasError ? (
                                    <AlertCircle className="h-5 w-5 text-destructive" />
                                  ) : (
                                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                  )}
                                </button>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-96" side="left">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    {hasError ? (
                                      <AlertCircle className="h-4 w-4 text-destructive" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    )}
                                    <h4 className={`text-sm font-semibold ${hasError ? 'text-destructive' : 'text-yellow-700'}`}>
                                      {validation.message}
                                    </h4>
                                  </div>
                                  {validation.details && (
                                    <p className="text-xs text-muted-foreground">
                                      {validation.details}
                                    </p>
                                  )}
                                  {validation.invalidSamples && validation.invalidSamples.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium mb-1">Example problematic values:</p>
                                      <ul className="text-xs text-muted-foreground space-y-1">
                                        {validation.invalidSamples.map((sample, i) => (
                                          <li key={i} className="bg-muted p-1 rounded font-mono text-[10px] break-all">
                                            "{sample}"
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {validation.invalidCount && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Affects {validation.invalidCount} of {parsedData.length} rows
                                    </p>
                                  )}
                                  {hasError && (
                                    <div className="mt-2 pt-2 border-t">
                                      <p className="text-xs text-destructive font-medium">
                                        ⚠️ These values will fail validation. Consider skipping this column or fixing the data in your source file.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            <>
                              {/* In merge mode, only storeCode is green (required for matching) */}
                              {mergeMode ? (
                                <>
                                  {mapping.mapped === 'storeCode' && (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  )}
                                  {mapping.mapped && mapping.mapped !== 'storeCode' && (
                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                  )}
                                </>
                              ) : (
                                <>
                                  {/* Green checkmark for required fields (including essentialFields for completeness) */}
                                  {mapping.mapped && (requiredFields.includes(mapping.mapped) || essentialFields.includes(mapping.mapped)) && (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  )}
                                  {/* Blue checkmark for optional fields */}
                                  {mapping.mapped && !requiredFields.includes(mapping.mapped) && !essentialFields.includes(mapping.mapped) && (
                                    <CheckCircle className="h-5 w-5 text-blue-600" />
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {/* Show validation error inline for visibility */}
                      {(validation || showCombinedHoursWarning) && (
                        <div className={`mt-2 p-2 rounded text-xs ${hasError ? 'bg-destructive/10 text-destructive' : 'bg-yellow-50 text-yellow-800'}`}>
                          <strong>{hasError ? 'Error: ' : 'Warning: '}</strong>
                          {showCombinedHoursWarning && !validation 
                            ? 'This column contains day names (e.g., "Monday - Friday"). Each day should have its own column for proper import.'
                            : validation?.message}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
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
                {/* Validation summary at top of preview */}
                {validationErrors.size > 0 && (
                  <Card className="bg-destructive/10 border-destructive/20">
                    <CardContent className="py-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">
                          {validationErrors.size} row{validationErrors.size > 1 ? 's have' : ' has'} validation issues
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          (hover over ⚠️ icons to see details)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <div className="max-h-96 overflow-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2 text-left w-8"></th>
                        {columnMappings
                          .filter(m => m.mapped)
                          .map(mapping => (
                            <th key={mapping.mapped} className="py-1.5 px-2 text-left text-xs">
                              {mapping.mapped.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {!mergeMode && requiredFields.includes(mapping.mapped) && <span className="text-red-500 ml-0.5">*</span>}
                              {mergeMode && mapping.mapped === 'storeCode' && <span className="text-red-500 ml-0.5">*</span>}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData
                        .filter(row => {
                          if (mergeMode) return true;
                          const storeCodeMapping = columnMappings.find(m => m.mapped === 'storeCode');
                          if (!storeCodeMapping) return true;
                          const rowStoreCode = String(row[storeCodeMapping.original] || '').trim();
                          return !duplicateBusinesses.some(d => d.storeCode === rowStoreCode);
                        })
                        .slice(0, 10)
                        .map((row, index) => {
                          const originalIndex = parsedData.indexOf(row);
                          const rowErrors = validationErrors.get(originalIndex);
                          const rowDiff = mergeMode ? mergeDiffs.get(originalIndex) : undefined;

                          return (
                            <tr key={index} className="border-t hover:bg-muted/30">
                              <td className="py-1 px-2">
                                {rowErrors && rowErrors.length > 0 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => setSelectedValidationRow({ index: originalIndex, errors: rowErrors, storeCode: row[columnMappings.find(m => m.mapped === 'storeCode')?.original || ''] })}
                                          className="flex items-center gap-0.5"
                                        >
                                          <AlertCircle className="h-4 w-4 text-destructive cursor-pointer hover:text-destructive/80" />
                                          <span className="text-[10px] text-destructive font-medium">{rowErrors.length}</span>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" sideOffset={4}>
                                        <span className="text-xs">{rowErrors.length} validation issue{rowErrors.length > 1 ? 's' : ''} - Click for details</span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </td>
                              {columnMappings
                                .filter(m => m.mapped)
                                .map(mapping => {
                                  if (!mergeMode) {
                                    return (
                                      <td key={mapping.mapped} className="py-1 px-2 text-xs max-w-[150px] truncate" title={String(row[mapping.original] || '')}>
                                        {row[mapping.original] || '-'}
                                      </td>
                                    );
                                  }

                                  // Merge mode: show diffs only (old value in tooltip)
                                  if (mapping.mapped === 'storeCode') {
                                    const value = row[mapping.original] || '-';
                                    return (
                                      <td key={mapping.mapped} className="py-1 px-2 text-xs max-w-[150px] truncate" title={String(value)}>
                                        {value}
                                      </td>
                                    );
                                  }

                                  const diff = rowDiff?.[mapping.mapped];
                                  if (!diff) {
                                    return (
                                      <td key={mapping.mapped} className="py-1 px-2 text-xs max-w-[150px] truncate text-muted-foreground" title="No change">
                                        —
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={mapping.mapped} className="py-1 px-2 text-xs max-w-[150px] truncate" title={`Old: ${String(diff.oldValue ?? '')}\nNew: ${String(diff.newValue ?? '')}`}>
                                      {String(diff.newValue ?? '') || '—'}
                                    </td>
                                  );
                                })}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {(!mergeMode && (parsedData.length - duplicateBusinesses.length) > 10) && (
                    <div className="py-1.5 px-2 text-center text-xs text-muted-foreground border-t bg-muted/30">
                      ... and {(parsedData.length - duplicateBusinesses.length) - 10} more new businesses
                    </div>
                  )}
                  {(mergeMode && parsedData.length > 10) && (
                    <div className="py-1.5 px-2 text-center text-xs text-muted-foreground border-t bg-muted/30">
                      ... and {parsedData.length - 10} more rows
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
                            <th className="p-2 text-left">Business Name</th>
                            {/* Dynamic columns for each field being updated (excluding storeCode) */}
                            {columnMappings
                              .filter(m => m.mapped && m.mapped !== 'storeCode')
                              .map(mapping => (
                                <th key={mapping.mapped} className="p-2 text-left text-xs">
                                  {mapping.mapped.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody>
                          {duplicateBusinesses.map((duplicate, index) => {
                            // Get fields being updated (exclude storeCode)
                            const updatedFieldMappings = columnMappings.filter(m => m.mapped && m.mapped !== 'storeCode');

                            return (
                              <tr key={index} className="border-t align-top">
                                <td className="p-2 font-medium">{duplicate.storeCode}</td>
                                <td className="p-2 text-xs text-muted-foreground">
                                  {duplicate.existingBusiness.businessName || 'N/A'}
                                </td>
                                {/* Render each field column */}
                                {updatedFieldMappings.map(mapping => {
                                  const importValue = String(duplicate.importRow[mapping.original] || '').trim();
                                  const existingValue = String(duplicate.existingBusiness[mapping.mapped] || '').trim();
                                  const hasChange = importValue && importValue !== existingValue;

                                  return (
                                    <td key={mapping.mapped} className="p-2 text-xs">
                                      {hasChange ? (
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1 text-[11px]">
                                            <span className="text-muted-foreground line-through max-w-[100px] truncate" title={existingValue || '(empty)'}>
                                              {existingValue || '(empty)'}
                                            </span>
                                            <span className="text-muted-foreground">→</span>
                                            <span className="text-green-700 font-medium max-w-[100px] truncate" title={importValue}>
                                              {importValue}
                                            </span>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground italic">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <Card className="bg-amber-50 border-amber-200">
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-amber-800">Merge/Update Existing Locations</h4>
                              <p className="text-sm text-amber-700 mt-1">
                                Only the fields present in your import file will be updated. Existing data for unmapped fields will be preserved.
                                {columnMappings.filter(m => m.mapped && m.mapped !== 'storeCode').length > 0 && (
                                  <span className="block mt-1 font-medium">
                                    Fields to update: {columnMappings.filter(m => m.mapped && m.mapped !== 'storeCode').map(m => m.mapped).join(', ')}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-amber-800">
                                Type "UPDATE" to confirm updating existing locations:
                              </label>
                              <Input
                                value={overrideConfirmation}
                                onChange={(e) => setOverrideConfirmation(e.target.value)}
                                placeholder="Type UPDATE to confirm"
                                className="mt-1"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="override-checkbox"
                                checked={allowOverride}
                                onCheckedChange={(checked) => setAllowOverride(checked as boolean)}
                                disabled={overrideConfirmation !== 'UPDATE'}
                              />
                              <label
                                htmlFor="override-checkbox"
                                className={`text-sm ${overrideConfirmation === 'UPDATE' ? 'text-amber-800' : 'text-gray-400'}`}
                              >
                                I understand {duplicateBusinesses.length} existing location{duplicateBusinesses.length > 1 ? 's' : ''} will be updated with the imported field values
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

      {/* Validation Details Dialog */}
      <Dialog open={!!selectedValidationRow} onOpenChange={() => setSelectedValidationRow(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Validation Issues
            </DialogTitle>
          </DialogHeader>
          {selectedValidationRow && (
            <div className="flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Store Code:</span>
                <span className="font-mono">{selectedValidationRow.storeCode || 'N/A'}</span>
              </div>
              <div className="overflow-y-auto flex-1 pr-2">
                <div className="space-y-3">
                  {selectedValidationRow.errors.map((error, idx) => (
                    <div key={idx} className="border rounded-md p-3 bg-destructive/5 border-destructive/20">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-sm">
                            {error.field.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                          </p>
                          <p className="text-sm text-muted-foreground">{error.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setSelectedValidationRow(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default ImportDialog;
