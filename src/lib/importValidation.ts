/**
 * Import-time validation helpers that check column data before mapping.
 * These help users identify problematic data at the mapping stage.
 */

// Validation patterns (same as in validation.ts)
const dayOpeningHoursPattern = /^$|x|^((([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2}), ?)*(([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2})))$/;
const singleUrlPattern = /^$|^(https?:\/\/)?(www\.)?[-A-ÿ0-9ZŠĐČĆŽzšđčćž@:%._\+~#=]{1,256}\.[A-ÿ0-9ZŠĐČĆŽzšđčćž()]{1,6}\b(?:[-A-ÿ0-9ZŠĐČĆŽzšđčćž()@:%_\+.~#?&\/=]*(\s)*)$/;
const phonePattern = /^\(?[+]?[0-9a-zA-Z  ()./–-]*$/;
const specialHoursPattern = /^(([0-9]{4}-[0-9]{2}-[0-9]{2}: ?(([0-9]{1,2}:[0-9]{2} ?- ?[0-9]{1,2}:[0-9]{2})|x), ?)*([0-9]{4}-[0-9]{2}-[0-9]{2}: ?(([0-9]{1,2}:[0-9]{2} ?- ?[0-9]{1,2}:[0-9]{2})|x))|x|)$/;

export interface ColumnValidationResult {
  isValid: boolean;
  severity: 'error' | 'warning';
  message: string;
  details?: string;
  invalidSamples?: string[];
  invalidCount?: number;
}

/**
 * Validates column data for a specific field before mapping.
 * Returns validation issues to display at the mapping stage.
 */
export function validateColumnForField(
  fieldName: string,
  columnData: string[],
  columnHeader: string
): ColumnValidationResult | null {
  // Skip empty columns
  const nonEmptyData = columnData.filter(v => v && String(v).trim() !== '');
  if (nonEmptyData.length === 0) return null;

  switch (fieldName) {
    case 'mondayHours':
    case 'tuesdayHours':
    case 'wednesdayHours':
    case 'thursdayHours':
    case 'fridayHours':
    case 'saturdayHours':
    case 'sundayHours':
      return validateOpeningHoursColumn(nonEmptyData, fieldName);
    
    case 'latitude':
    case 'longitude':
      return validateCoordinateColumn(nonEmptyData, fieldName);
    
    case 'website':
    case 'logoPhoto':
    case 'coverPhoto':
    case 'menuURL':
      return validateUrlColumn(nonEmptyData, fieldName);
    
    case 'primaryPhone':
      return validatePhoneColumn(nonEmptyData);
    
    case 'specialHours':
      return validateSpecialHoursColumn(nonEmptyData);
    
    case 'labels':
      return validateLabelsColumn(nonEmptyData);
    
    case 'additionalCategories':
      return validateAdditionalCategoriesColumn(nonEmptyData);
    
    case 'openingDate':
      return validateDateColumn(nonEmptyData);
    
    default:
      return null;
  }
}

function validateOpeningHoursColumn(data: string[], fieldName: string): ColumnValidationResult | null {
  const invalidEntries: string[] = [];
  const dayName = fieldName.replace('Hours', '');
  
  for (const value of data) {
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    
    // Check for common issues
    if (trimmed.toLowerCase() === 'closed') continue; // This is handled by import
    
    // Check for combined day format (e.g., "Monday - Friday: 09:00-17:00")
    if (/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(trimmed)) {
      return {
        isValid: false,
        severity: 'error',
        message: `Column contains day names (e.g., "${trimmed.substring(0, 50)}...")`,
        details: `This appears to be a combined "Opening hours" column with day names included. You need separate columns for each day (Monday Hours, Tuesday Hours, etc.) OR use the correct format without day names: "09:00-17:00" or "09:00-12:00, 14:00-18:00" or "x" for closed.`,
        invalidSamples: [trimmed.substring(0, 80)],
        invalidCount: data.length
      };
    }
    
    // Check for wrong dash character (en-dash, em-dash)
    if (trimmed.includes('–') || trimmed.includes('—')) {
      return {
        isValid: false,
        severity: 'error',
        message: `Uses wrong dash character`,
        details: `Hours contain "–" (en-dash) or "—" (em-dash) instead of "-" (hyphen). Use regular hyphen: "09:00-17:00"`,
        invalidSamples: [trimmed.substring(0, 80)],
        invalidCount: data.filter(v => String(v).includes('–') || String(v).includes('—')).length
      };
    }
    
    // Check for "and" instead of comma
    if (/\band\b/i.test(trimmed)) {
      return {
        isValid: false,
        severity: 'error',
        message: `Uses "and" instead of comma`,
        details: `For multiple time periods, use comma separator: "09:00-12:00, 14:00-18:00" instead of "09:00-12:00 and 14:00-18:00"`,
        invalidSamples: [trimmed.substring(0, 80)],
        invalidCount: data.filter(v => /\band\b/i.test(String(v))).length
      };
    }
    
    // Standard pattern validation
    if (!dayOpeningHoursPattern.test(trimmed)) {
      invalidEntries.push(trimmed);
    }
  }
  
  if (invalidEntries.length > 0) {
    return {
      isValid: false,
      severity: 'error',
      message: `${invalidEntries.length} of ${data.length} values have invalid format`,
      details: `Expected format: "09:00-17:00" or "09:00-12:00, 14:00-18:00" or "x" for closed`,
      invalidSamples: invalidEntries.slice(0, 3).map(v => v.substring(0, 60)),
      invalidCount: invalidEntries.length
    };
  }
  
  return null;
}

function validateCoordinateColumn(data: string[], fieldName: string): ColumnValidationResult | null {
  const invalidEntries: string[] = [];
  const isLat = fieldName === 'latitude';
  const min = isLat ? -90 : -180;
  const max = isLat ? 90 : 180;
  
  // DMS pattern: detects formats like 5°17'18.3"N, 12°21'47.1"N, 4°23'21.1"S
  const dmsPattern = /[°'"′″]|[NSEW]$/i;
  
  for (const value of data) {
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    
    // Check for DMS (Degrees Minutes Seconds) format first - this is a common issue
    if (dmsPattern.test(trimmed)) {
      const dmsCount = data.filter(v => dmsPattern.test(String(v).trim())).length;
      return {
        isValid: false,
        severity: 'error',
        message: `Uses DMS format (degrees/minutes/seconds)`,
        details: `Coordinates like "${trimmed}" are in DMS (Degrees Minutes Seconds) format. Required format is decimal degrees. Example: "5°17'18.3"N" should be "5.288417" and "3°58'56.6"W" should be "-3.982389". Please convert your coordinates to decimal format before importing.`,
        invalidSamples: data.filter(v => dmsPattern.test(String(v).trim())).slice(0, 3),
        invalidCount: dmsCount
      };
    }
    
    // Check for European number format with commas (e.g., "52,385983" or thousands separators)
    if (trimmed.includes(',')) {
      // Check if it's a decimal comma vs thousands separator
      const commaCount = (trimmed.match(/,/g) || []).length;
      if (commaCount > 1) {
        return {
          isValid: false,
          severity: 'error',
          message: `Contains multiple commas (likely thousand separators)`,
          details: `Values like "${trimmed}" appear to use commas as thousand separators. Coordinates should be decimal numbers like "52.385983" (use period as decimal separator, no thousand separators).`,
          invalidSamples: [trimmed],
          invalidCount: data.filter(v => (String(v).match(/,/g) || []).length > 1).length
        };
      }
      
      // Single comma might be decimal separator
      return {
        isValid: false,
        severity: 'warning',
        message: `Uses comma as decimal separator`,
        details: `Value "${trimmed}" uses comma. Please use period as decimal separator: "${trimmed.replace(',', '.')}"`,
        invalidSamples: [trimmed],
        invalidCount: data.filter(v => String(v).includes(',')).length
      };
    }
    
    // Check for non-numeric characters (except minus and period)
    const cleanedForCheck = trimmed.replace(/^-/, ''); // Remove leading minus
    if (/[^0-9.]/.test(cleanedForCheck)) {
      return {
        isValid: false,
        severity: 'error',
        message: `Contains non-numeric characters`,
        details: `Value "${trimmed}" contains invalid characters. Coordinates must be decimal numbers like "52.385983" or "-3.982389" (negative for South/West).`,
        invalidSamples: [trimmed],
        invalidCount: data.filter(v => {
          const cleaned = String(v).trim().replace(/^-/, '');
          return /[^0-9.]/.test(cleaned);
        }).length
      };
    }
    
    const num = parseFloat(trimmed);
    if (isNaN(num)) {
      invalidEntries.push(trimmed);
      continue;
    }
    
    // Check range
    if (num < min || num > max) {
      return {
        isValid: false,
        severity: 'error',
        message: `Values out of valid range`,
        details: `${isLat ? 'Latitude must be between -90 and 90' : 'Longitude must be between -180 and 180'}. Found "${trimmed}" which is outside the valid range.`,
        invalidSamples: data.filter(v => {
          const n = parseFloat(String(v).trim());
          return !isNaN(n) && (n < min || n > max);
        }).slice(0, 3),
        invalidCount: data.filter(v => {
          const n = parseFloat(String(v).trim());
          return !isNaN(n) && (n < min || n > max);
        }).length
      };
    }
  }
  
  if (invalidEntries.length > 0) {
    return {
      isValid: false,
      severity: 'error',
      message: `${invalidEntries.length} invalid ${fieldName} values`,
      details: `Coordinates must be decimal numbers like "52.385983" or "-3.982389". Found: "${invalidEntries[0]}"`,
      invalidSamples: invalidEntries.slice(0, 3),
      invalidCount: invalidEntries.length
    };
  }
  
  return null;
}

function validateUrlColumn(data: string[], fieldName: string): ColumnValidationResult | null {
  const invalidEntries: string[] = [];
  
  for (const value of data) {
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    
    // Check for markdown-style URLs like <https://...>
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return {
        isValid: false,
        severity: 'warning',
        message: `URLs wrapped in angle brackets`,
        details: `URLs like "${trimmed}" have extra < > characters. These will be cleaned during import, but best to fix in source: "${trimmed.slice(1, -1)}"`,
        invalidSamples: [trimmed],
        invalidCount: data.filter(v => String(v).startsWith('<')).length
      };
    }
    
    // Clean and validate
    const cleanUrl = trimmed.replace(/^<|>$/g, '');
    if (!singleUrlPattern.test(cleanUrl)) {
      invalidEntries.push(trimmed);
    }
  }
  
  if (invalidEntries.length > 0) {
    return {
      isValid: false,
      severity: 'warning',
      message: `${invalidEntries.length} potentially invalid URLs`,
      details: `Some URLs may have formatting issues. Sample: "${invalidEntries[0].substring(0, 60)}"`,
      invalidSamples: invalidEntries.slice(0, 3),
      invalidCount: invalidEntries.length
    };
  }
  
  return null;
}

function validatePhoneColumn(data: string[]): ColumnValidationResult | null {
  const invalidEntries: string[] = [];
  
  for (const value of data) {
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    
    if (!phonePattern.test(trimmed)) {
      invalidEntries.push(trimmed);
    }
  }
  
  if (invalidEntries.length > 0) {
    return {
      isValid: false,
      severity: 'warning',
      message: `${invalidEntries.length} phone numbers with unusual characters`,
      details: `Expected format: "+49 123 456789" or "(01onal) 123-456". Found: "${invalidEntries[0]}"`,
      invalidSamples: invalidEntries.slice(0, 3),
      invalidCount: invalidEntries.length
    };
  }
  
  return null;
}

function validateSpecialHoursColumn(data: string[]): ColumnValidationResult | null {
  const invalidEntries: string[] = [];
  
  for (const value of data) {
    const trimmed = String(value).trim();
    if (!trimmed || trimmed.toLowerCase() === 'x') continue;
    
    if (!specialHoursPattern.test(trimmed)) {
      invalidEntries.push(trimmed);
    }
  }
  
  if (invalidEntries.length > 0) {
    return {
      isValid: false,
      severity: 'error',
      message: `${invalidEntries.length} invalid special hours entries`,
      details: `Expected format: "2025-12-25: x" (closed) or "2025-12-25: 10:00-15:00". Found: "${invalidEntries[0].substring(0, 50)}"`,
      invalidSamples: invalidEntries.slice(0, 3),
      invalidCount: invalidEntries.length
    };
  }
  
  return null;
}

function validateLabelsColumn(data: string[]): ColumnValidationResult | null {
  for (const value of data) {
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    
    // Check for example/placeholder text
    if (/^e\.g\.|^example|^sample|^placeholder/i.test(trimmed)) {
      return {
        isValid: false,
        severity: 'warning',
        message: `Contains example/placeholder text`,
        details: `Value "${trimmed.substring(0, 50)}..." appears to be placeholder text, not actual labels. Remove or replace with real values.`,
        invalidSamples: [trimmed.substring(0, 60)],
        invalidCount: data.filter(v => /^e\.g\.|^example|^sample/i.test(String(v))).length
      };
    }
    
    // Check format (max 10 labels, 50 chars each)
    const labels = trimmed.split(',');
    if (labels.length > 10) {
      return {
        isValid: false,
        severity: 'error',
        message: `Too many labels (max 10)`,
        details: `Found ${labels.length} labels. Maximum allowed is 10 labels separated by commas.`,
        invalidSamples: [trimmed.substring(0, 60)],
        invalidCount: data.filter(v => String(v).split(',').length > 10).length
      };
    }
    
    const longLabels = labels.filter(l => l.trim().length > 50);
    if (longLabels.length > 0) {
      return {
        isValid: false,
        severity: 'error',
        message: `Labels exceed 50 character limit`,
        details: `Each label must be 50 characters or less. Found: "${longLabels[0].substring(0, 55)}..."`,
        invalidSamples: longLabels.slice(0, 2),
        invalidCount: data.filter(v => String(v).split(',').some(l => l.trim().length > 50)).length
      };
    }
  }
  
  return null;
}

function validateAdditionalCategoriesColumn(data: string[]): ColumnValidationResult | null {
  for (const value of data) {
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    
    // Check for HTML line breaks
    if (/<br\s*\/?>/i.test(trimmed)) {
      return {
        isValid: false,
        severity: 'error',
        message: `Contains HTML line breaks (<br/>)`,
        details: `Categories should be separated by commas, not <br/> tags. Found: "${trimmed.substring(0, 60)}..."`,
        invalidSamples: [trimmed.substring(0, 80)],
        invalidCount: data.filter(v => /<br\s*\/?>/i.test(String(v))).length
      };
    }
    
    // Check category count
    const categories = trimmed.split(',').map(c => c.trim()).filter(Boolean);
    if (categories.length > 10) {
      return {
        isValid: false,
        severity: 'error',
        message: `Too many categories (max 10)`,
        details: `Found ${categories.length} additional categories. Maximum allowed is 10.`,
        invalidSamples: [trimmed.substring(0, 60)],
        invalidCount: data.filter(v => String(v).split(',').length > 10).length
      };
    }
  }
  
  return null;
}

function validateDateColumn(data: string[]): ColumnValidationResult | null {
  const datePattern = /^([0-9]{4})-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/;
  const invalidEntries: string[] = [];
  
  for (const value of data) {
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    
    if (!datePattern.test(trimmed)) {
      invalidEntries.push(trimmed);
    }
  }
  
  if (invalidEntries.length > 0) {
    return {
      isValid: false,
      severity: 'warning',
      message: `${invalidEntries.length} dates not in YYYY-MM-DD format`,
      details: `Expected format: "2025-03-15". Found: "${invalidEntries[0]}". Dates will be converted during import.`,
      invalidSamples: invalidEntries.slice(0, 3),
      invalidCount: invalidEntries.length
    };
  }
  
  return null;
}

/**
 * Check if a column header suggests it's a combined opening hours column
 * that shouldn't be mapped to individual day fields.
 */
export function detectCombinedOpeningHoursColumn(header: string): boolean {
  const normalizedHeader = header.toLowerCase().trim();
  return (
    normalizedHeader === 'opening hours' ||
    normalizedHeader === 'openinghours' ||
    normalizedHeader === 'business hours' ||
    normalizedHeader === 'hours of operation' ||
    normalizedHeader === 'store hours' ||
    normalizedHeader === 'operating hours'
  );
}
