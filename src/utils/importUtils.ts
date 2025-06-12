import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ImportedVisitor {
  name: string;
  email: string;
  phone: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  source?: string;
  eventId?: string;
  eventName?: string;
}

export interface ImportResult {
  data: ImportedVisitor[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  validRows: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  // Convert to string first in case it's a number from Excel
  const phoneStr = String(phone || '');
  
  // Basic phone validation - allows digits, spaces, dashes, parentheses, and plus
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  return phoneRegex.test(phoneStr.replace(/\s/g, ''));
};

// Helper to normalize column names
const columnMap: Record<string, string> = {
  // Event date variations
  'event date': 'eventDate',
  'event start date': 'eventDate',
  'eventstartdate': 'eventDate',
  'event_date': 'eventDate',
  'start date': 'eventDate',
  'startdate': 'eventDate',
  'event start': 'eventDate',
  'eventstart': 'eventDate',
  'start': 'eventDate',
  
  // Event end date variations
  'event end date': 'eventEndDate',
  'eventenddate': 'eventEndDate',
  'eventend date': 'eventEndDate',
  'end date': 'eventEndDate',
  'enddate': 'eventEndDate',
  'event end': 'eventEndDate',
  'eventend': 'eventEndDate',
  'end': 'eventEndDate',
  
  // Registration date variations
  'registration date': 'registrationDate',
  'registrationdate': 'registrationDate',
  'registration': 'registrationDate',
  'reg date': 'registrationDate',
  'regdate': 'registrationDate',
  
  // Other common variations
  'eventname': 'eventName',
  'phone number': 'phone',
  'phonenumber': 'phone',
  // add more mappings as needed
};

function normalizeRowKeys(row: any): any {
  console.log('=== NORMALIZE ROW KEYS DEBUG ===');
  console.log('Original row:', row);
  
  const normalized: any = {};
  Object.entries(row).forEach(([key, value]) => {
    if (key && key.trim()) { // Only process non-empty keys
      const lowerKey = key.trim().toLowerCase();
      const mappedKey = columnMap[lowerKey] || key.trim();
      
      // Check if this is a date field
      const dateFields = ['eventdate', 'eventenddate', 'registrationdate', 'event_date', 'start_date', 'end_date', 'registration_date'];
      const isDateField = dateFields.some(dateField => 
        lowerKey.includes(dateField) || dateField.includes(lowerKey)
      );
      
      // Convert date fields to DD-MM-YYYY format
      if (isDateField && value) {
        normalized[mappedKey] = convertToDDMMYYYY(value);
        console.log(`Date field "${key}" converted:`, value, '->', normalized[mappedKey]);
      } else {
        // Ensure value is properly handled (convert null/undefined to empty string)
        normalized[mappedKey] = value !== null && value !== undefined ? value : '';
      }
      
      console.log(`Key mapping: "${key}" -> "${lowerKey}" -> "${mappedKey}" =`, normalized[mappedKey]);
    }
  });
  
  console.log('Normalized row:', normalized);
  console.log('=== END NORMALIZE ROW KEYS DEBUG ===');
  return normalized;
}

export const parseCSV = (file: File): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log('CSV parsing started for file:', file.name);
        const csvText = e.target?.result as string;
        
        if (!csvText || csvText.trim() === '') {
          console.error('CSV file is empty');
          resolve({
            data: [],
            errors: ['CSV file is empty'],
            warnings: [],
            totalRows: 0,
            validRows: 0
          });
          return;
        }

        console.log('CSV content length:', csvText.length);
        
        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
        });

        console.log('Papa Parse result:', {
          data: result.data.length,
          errors: result.errors.length,
          fields: result.meta?.fields
        });

        if (result.errors.length > 0) {
          console.error('CSV parsing errors:', result.errors);
          resolve({
            data: [],
            errors: result.errors.map(err => `Row ${err.row}: ${err.message}`),
            warnings: [],
            totalRows: 0,
            validRows: 0
          });
          return;
        }

        if (!result.data || result.data.length === 0) {
          console.error('No data found in CSV');
          resolve({
            data: [],
            errors: ['No data found in CSV file'],
            warnings: [],
            totalRows: 0,
            validRows: 0
          });
          return;
        }

        const data = (result.data as ImportedVisitor[]).map(normalizeRowKeys);
        console.log('Normalized data sample:', data.slice(0, 2));
        
        const validationResult = validateImportedData(data);
        
        resolve({
          data: validationResult.validData,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          totalRows: data.length,
          validRows: validationResult.validData.length
        });
      } catch (error) {
        console.error('CSV parsing exception:', error);
        reject(error);
      }
    };

    reader.onerror = () => {
      console.error('FileReader error occurred');
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
};

export const parseExcel = (file: File): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log('Excel parsing started for file:', file.name);
        const buffer = e.target?.result as ArrayBuffer;
        
        if (!buffer || buffer.byteLength === 0) {
          console.error('Excel file is empty');
          resolve({
            data: [],
            errors: ['Excel file is empty'],
            warnings: [],
            totalRows: 0,
            validRows: 0
          });
          return;
        }

        console.log('Excel file size:', buffer.byteLength, 'bytes');
        
        const workbook = XLSX.read(buffer, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
          dateNF: 'dd-mm-yyyy' // Specify date format
        });
        
        console.log('Workbook sheets:', workbook.SheetNames);
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          console.error('No sheets found in Excel file');
          resolve({
            data: [],
            errors: ['No sheets found in Excel file'],
            warnings: [],
            totalRows: 0,
            validRows: 0
          });
          return;
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        if (!worksheet) {
          console.error('Worksheet is null');
          resolve({
            data: [],
            errors: ['Worksheet is empty or corrupted'],
            warnings: [],
            totalRows: 0,
            validRows: 0
          });
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('Excel JSON data length:', jsonData.length);

        if (jsonData.length < 2) {
          console.error('Excel file has insufficient data rows');
          resolve({
            data: [],
            errors: ['Excel file is empty or has no data rows'],
            warnings: [],
            totalRows: 0,
            validRows: 0
          });
          return;
        }

        // Convert to array of objects
        const headers = jsonData[0] as string[];
        console.log('Excel headers:', headers);
        
        const data: ImportedVisitor[] = (jsonData.slice(1) as any[][]).map((row, index) => {
          const obj: any = {};
          headers.forEach((header, headerIndex) => {
            if (header && row[headerIndex] !== undefined) {
              obj[header.trim().toLowerCase()] = row[headerIndex];
            }
          });
          console.log(`Row ${index + 1}:`, obj);
          return normalizeRowKeys(obj);
        });

        console.log('Processed Excel data sample:', data.slice(0, 2));
        
        const validationResult = validateImportedData(data);
        
        resolve({
          data: validationResult.validData,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          totalRows: data.length,
          validRows: validationResult.validData.length
        });
      } catch (error) {
        console.error('Excel parsing exception:', error);
        reject(error);
      }
    };

    reader.onerror = () => {
      console.error('FileReader error occurred');
      reject(new Error('Failed to read Excel file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export const validateImportedData = (data: ImportedVisitor[]): {
  validData: ImportedVisitor[];
  errors: string[];
  warnings: string[];
} => {
  const validData: ImportedVisitor[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 1;
    let isValid = true;

    // Check required fields
    if (!row.name || String(row.name).trim() === '') {
      errors.push(`Row ${rowNumber}: Missing required field 'name'`);
      isValid = false;
    }

    if (!row.email || String(row.email).trim() === '') {
      errors.push(`Row ${rowNumber}: Missing required field 'email'`);
      isValid = false;
    } else if (!validateEmail(row.email)) {
      errors.push(`Row ${rowNumber}: Invalid email format '${row.email}'`);
      isValid = false;
    }

    // Check phone number if provided
    if (row.phone && row.phone !== '') {
      const phoneStr = String(row.phone);
      if (!validatePhone(phoneStr)) {
        warnings.push(`Row ${rowNumber}: Phone number '${phoneStr}' may be invalid`);
      }
    }

    // Check for duplicate emails in the same import
    const duplicateEmail = validData.find(existing => 
      existing.email.toLowerCase() === row.email.toLowerCase()
    );
    if (duplicateEmail) {
      errors.push(`Row ${rowNumber}: Duplicate email '${row.email}' found in import file`);
      isValid = false;
    }

    if (isValid) {
      validData.push({
        ...row,
        name: String(row.name).trim(),
        email: String(row.email).trim().toLowerCase(),
        phone: row.phone ? String(row.phone).trim() : '',
        company: row.company ? String(row.company).trim() : '',
        city: row.city ? String(row.city).trim() : '',
        state: row.state ? String(row.state).trim() : '',
        country: row.country ? String(row.country).trim() : '',
        pincode: row.pincode ? String(row.pincode).trim() : '',
        source: row.source ? String(row.source).trim() : 'import',
        eventName: row.eventName ? String(row.eventName).trim() : ''
      });
    }
  });

  return { validData, errors, warnings };
};

export const generateSampleCSV = (): string => {
  const headers = [
    'name',
    'email', 
    'phone',
    'company',
    'city',
    'state',
    'country',
    'pincode',
    'source',
    'eventName'
  ];

  const sampleData = [
    [
      'John Doe',
      'john.doe@example.com',
      '+1-555-123-4567',
      'Acme Corp',
      'New York',
      'NY',
      'USA',
      '10001',
      'website',
      'Tech Conference 2024'
    ],
    [
      'Jane Smith',
      'jane.smith@example.com',
      '555-987-6543',
      'Tech Solutions',
      'Los Angeles',
      'CA',
      'USA',
      '90210',
      'manual',
      'Tech Conference 2024'
    ]
  ];

  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    )
  ].join('\n');

  return csvContent;
};

export const downloadSampleCSV = (): void => {
  const csvContent = generateSampleCSV();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'sample-registrations.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper to convert various date formats to DD-MM-YYYY
function convertToDDMMYYYY(value: any): string {
  if (!value) return '';
  
  // If it's already a string in DD-MM-YYYY format
  if (typeof value === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return value;
  }
  
  // If it's a JavaScript Date object
  if (value instanceof Date) {
    const day = String(value.getUTCDate()).padStart(2, '0');
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const year = value.getUTCFullYear();
    return `${day}-${month}-${year}`;
  }
  
  // If it's an Excel serial number
  if (typeof value === 'number' && value > 30000 && value < 60000) {
    const utc_days = Math.floor(value - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const day = String(date_info.getUTCDate()).padStart(2, '0');
    const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const year = date_info.getUTCFullYear();
    return `${day}-${month}-${year}`;
  }
  
  // If it's an ISO date string
  if (typeof value === 'string' && value.includes('T')) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const year = date.getUTCFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch (error) {
      console.log('Failed to parse ISO date string:', value);
    }
  }
  
  // Return as string if no conversion possible
  return String(value);
} 