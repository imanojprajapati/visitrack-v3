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
  // Basic phone validation - allows digits, spaces, dashes, parentheses, and plus
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const parseCSV = (file: File): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const result = Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase(),
        });

        if (result.errors.length > 0) {
          resolve({
            data: [],
            errors: result.errors.map(err => `Row ${err.row}: ${err.message}`),
            warnings: [],
            totalRows: 0,
            validRows: 0
          });
          return;
        }

        const data = result.data as ImportedVisitor[];
        const validationResult = validateImportedData(data);
        
        resolve({
          data: validationResult.validData,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          totalRows: data.length,
          validRows: validationResult.validData.length
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read CSV file'));
    reader.readAsText(file);
  });
};

export const parseExcel = (file: File): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
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
        const data: ImportedVisitor[] = (jsonData.slice(1) as any[][]).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            if (header && row[index] !== undefined) {
              obj[header.trim().toLowerCase()] = row[index];
            }
          });
          return obj;
        });

        const validationResult = validateImportedData(data);
        
        resolve({
          data: validationResult.validData,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          totalRows: data.length,
          validRows: validationResult.validData.length
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read Excel file'));
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
    if (row.phone && !validatePhone(row.phone)) {
      warnings.push(`Row ${rowNumber}: Phone number '${row.phone}' may be invalid`);
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