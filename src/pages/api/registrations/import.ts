import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Registration from '../../../models/Registration';
import Event from '../../../models/Event';
import formidable from 'formidable';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import Visitor from '../../../models/Visitor';
import mongoose from 'mongoose';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface ImportedVisitor {
  name: string;
  email: string;
  phone: string;
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  source?: string;
  location?: string;
  eventId?: string;
  eventName?: string;
  status?: string;
}

// Helper function to convert Excel serial number to DD-MM-YYYY format
const convertExcelDateToDDMMYYYY = (excelDate: number | string): string => {
  if (typeof excelDate === 'string') {
    // If it's already a string, try to parse it as a date
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear());
      return `${day}-${month}-${year}`;
    }
    return excelDate; // Return as is if not a valid date
  }
  
  if (typeof excelDate === 'number') {
    // Excel serial number (days since 1900-01-01)
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}-${month}-${year}`;
  }
  
  return String(excelDate);
};

// Helper function to detect and convert date fields
const convertDateFields = (obj: any): any => {
  const dateFields = ['eventdate', 'event end date', 'registration date', 'eventenddate', 'registrationdate'];
  const converted = { ...obj };
  
  Object.keys(converted).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (dateFields.includes(lowerKey) && converted[key] !== undefined && converted[key] !== null) {
      converted[key] = convertExcelDateToDDMMYYYY(converted[key]);
    }
  });
  
  return converted;
};

// Helper function to format date to DD-MM-YYYY
const formatDate = (dateStr: any) => {
  if (!dateStr) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    return `${day}-${month}-${year}`;
  }
  
  // Convert to string if it's not already
  const dateString = String(dateStr);
  
  // Handle DD-MM-YYYY format and return as is
  if (typeof dateString === 'string' && dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? (Number(parts[2]) < 50 ? '20' + parts[2] : '19' + parts[2]) : parts[2];
      return `${day}-${month}-${year}`;
    }
  }
  
  // If it's already in DD-MM-YYYY format, return as is
  if (typeof dateString === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
    return dateString;
  }
  
  // Try to parse as a JavaScript Date object
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}-${month}-${year}`;
  }
  
  // Default fallback
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  return `${day}-${month}-${year}`;
};

// Helper function to format time to HH:mm
const formatTime = (timeStr: string) => {
  if (!timeStr) {
    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return timeStr;
};

// Helper function to handle missing string values
const handleMissingString = (value: any): string => {
  if (!value || value === '' || value === null || value === undefined) {
    return '-';
  }
  return String(value);
};

// Helper function to handle missing status values
const handleMissingStatus = (value: any): string => {
  if (!value || value === '' || value === null || value === undefined) {
    return 'Visited';
  }
  return String(value);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectToDatabase();

  // Test MongoDB connection
  try {
    console.log('Testing MongoDB connection...');
    const db = mongoose.connection;
    if (db.readyState !== 1) {
      throw new Error(`Database not connected. Ready state: ${db.readyState}`);
    }
    console.log('MongoDB connection test passed');
  } catch (error) {
    console.error('MongoDB connection test failed:', error);
    return res.status(500).json({ 
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Test Visitor model connection
  try {
    console.log('Testing Visitor model connection...');
    const testVisitor = new Visitor({
      registrationId: new mongoose.Types.ObjectId(),
      eventId: new mongoose.Types.ObjectId(),
      formId: new mongoose.Types.ObjectId(),
      name: 'Test Visitor',
      email: 'test@example.com',
      phone: '1234567890',
      company: 'Test Company',
      qrCode: 'QR-TEST',
      eventName: 'Test Event',
      eventLocation: 'Test Location',
      eventStartDate: '15-01-24',
      eventEndDate: '15-01-24',
      eventStartTime: '09:00',
      eventEndTime: '17:00',
      status: 'registered',
      additionalData: {},
      createdAt: '15-01-24',
      updatedAt: '15-01-24'
    });
    
    // Validate the test visitor (don't save it)
    await testVisitor.validate();
    console.log('Visitor model validation test passed');
  } catch (error) {
    console.error('Visitor model validation test failed:', error);
    return res.status(500).json({ 
      error: 'Visitor model validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filter: (part) => {
        return part.mimetype ? 
          (part.mimetype.includes('csv') || 
           part.mimetype.includes('excel') || 
           part.mimetype.includes('spreadsheet') ||
           part.mimetype.includes('vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
           part.mimetype.includes('vnd.ms-excel')) : false;
      },
    });

    const [fields, files]: [formidable.Fields, formidable.Files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('File parsing error:', err);
          reject(err);
          return;
        }
        resolve([fields, files]);
      });
    });

    // Get the uploaded file
    const fileArray = files.file;
    if (!fileArray || !Array.isArray(fileArray) || fileArray.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = fileArray[0];
    if (!file.originalFilename || !file.filepath) {
      return res.status(400).json({ error: 'Invalid file upload' });
    }

    const fs = require('fs');
    const fileBuffer = fs.readFileSync(file.filepath);
    const fileName = file.originalFilename.toLowerCase();

    let importedData: ImportedVisitor[] = [];

    // Parse file based on extension
    if (fileName.endsWith('.csv')) {
      // Parse CSV
      const csvText = fileBuffer.toString('utf-8');
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
      });

      if (result.errors.length > 0) {
        console.error('CSV parsing errors:', result.errors);
        return res.status(400).json({ 
          error: 'CSV parsing failed', 
          details: result.errors 
        });
      }

      importedData = result.data as ImportedVisitor[];
      // Convert date fields in CSV data as well
      importedData = importedData.map(row => convertDateFields(row));
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel with date handling
      const workbook = XLSX.read(fileBuffer, { 
        type: 'buffer',
        cellDates: true, // Parse dates as Date objects
        cellNF: false,
        cellText: false
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
      }

      // Convert to array of objects with date conversion
      const headers = jsonData[0] as string[];
      importedData = (jsonData.slice(1) as any[][]).map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined) {
            obj[header.trim().toLowerCase()] = row[index];
          }
        });
        // Convert date fields in each row
        return convertDateFields(obj);
      });
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload CSV or Excel files.' });
    }

    // Map possible column names to internal field names
    const columnMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      'phone number': 'phone',
      phone: 'phone',
      company: 'company',
      city: 'city',
      state: 'state',
      country: 'country',
      pincode: 'pincode',
      source: 'source',
      location: 'location',
      event: 'eventName',
      eventname: 'eventName',
      'event date': 'eventDate',
      status: 'status',
      'registration date': 'registrationDate',
      'event end date': 'eventEndDate',
    };

    // Normalize importedData keys
    importedData = importedData.map((row: any) => {
      const normalized: any = {};
      Object.entries(row).forEach(([key, value]) => {
        const mappedKey = columnMap[key.trim().toLowerCase()] || key.trim();
        normalized[mappedKey] = value;
      });
      return normalized;
    });

    // Validate required fields
    const requiredFields = ['name', 'email'];
    const validationErrors: string[] = [];

    importedData.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field as keyof ImportedVisitor] || String(row[field as keyof ImportedVisitor]).trim() === '') {
          validationErrors.push(`Row ${index + 1}: Missing required field '${field}'`);
        }
      });
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    // Get events for mapping
    const rawEvents = await Event.find({}, '_id title').lean();
    const events = rawEvents.map((e: any) => ({ _id: e._id?.toString?.() || String(e._id), title: String(e.title) }));
    const eventMap = new Map(events.map(event => [event.title.toLowerCase(), event._id]));

    // Process and create registrations
    const createdRegistrations = [];
    const errors = [];

    for (let i = 0; i < importedData.length; i++) {
      const visitor = importedData[i];
      try {
        // Create new ObjectId if eventId is missing
        const eventId = visitor.eventId ? new mongoose.Types.ObjectId(visitor.eventId) : new mongoose.Types.ObjectId();
        const eventName = visitor.eventName || 'N/A';

        // Helper function to map status values to valid enum values for Registration
        const mapRegistrationStatus = (status: string | undefined): 'registered' | 'checked_in' | 'checked_out' | 'cancelled' => {
          if (!status) return 'registered';
          const statusLower = status.toLowerCase();
          if (statusLower === 'visited' || statusLower === 'checked_in') return 'checked_in';
          if (statusLower === 'checked_out') return 'checked_out';
          if (statusLower === 'cancelled') return 'cancelled';
          return 'registered';
        };

        // Helper function to map status values to valid enum values for Visitor
        const mapVisitorStatus = (status: string | undefined): 'registered' | 'checked_in' | 'checked_out' | 'Visited' => {
          if (!status) return 'registered';
          const statusLower = status.toLowerCase();
          if (statusLower === 'visited') return 'Visited';
          if (statusLower === 'checked_in') return 'checked_in';
          if (statusLower === 'checked_out') return 'checked_out';
          return 'registered';
        };

        // Create form data structure
        const formData: Record<string, { label: string; value: any }> = {};
        const fieldMappings = {
          name: 'Full Name',
          email: 'Email',
          phone: 'Phone Number',
          company: 'Company',
          city: 'City',
          state: 'State',
          country: 'Country',
          pincode: 'Pincode',
          source: 'Source',
          location: 'Location',
          eventName: 'Event',
          eventDate: 'Event Date',
          eventEndDate: 'Event End Date',
          status: 'Status',
          registrationDate: 'Registration Date',
        };
        Object.entries(fieldMappings).forEach(([key, label]) => {
          if (visitor[key as keyof ImportedVisitor]) {
            formData[key] = {
              label,
              value: visitor[key as keyof ImportedVisitor]
            };
          }
        });

        // Create registration
        const registration = new Registration({
          eventId,
          formId: new mongoose.Types.ObjectId(), // Create new ObjectId for formId
          formData,
          status: mapRegistrationStatus(visitor.status) || 'Imported',
          submittedAt: new Date(),
          source: visitor.source || 'Imported'
        });
        await registration.save();
        createdRegistrations.push({
          name: visitor.name,
          email: visitor.email,
          eventId
        });

        // --- Create Visitor ---
        const qrCode = `QR-${registration._id}`;
        const v: any = visitor;
        
        // Debug: Log the visitor data to see what we have
        console.log(`Row ${i + 1} - Visitor data:`, {
          name: v.name,
          email: v.email,
          phone: v.phone,
          company: v.company,
          city: v.city,
          state: v.state,
          country: v.country,
          pincode: v.pincode,
          source: v.source,
          location: v.location
        });

        // Helper function to get field labels
        const getFieldLabel = (fieldName: string): string => {
          const labelMap: Record<string, string> = {
            name: 'Full Name',
            email: 'Email',
            phone: 'Phone Number',
            company: 'Company',
            city: 'City',
            state: 'State',
            country: 'Country',
            pincode: 'Pincode',
            source: 'Source',
            location: 'Location',
            eventName: 'Event',
            eventDate: 'Event Date',
            eventEndDate: 'Event End Date',
            status: 'Status',
            registrationDate: 'Registration Date'
          };
          return labelMap[fieldName] || fieldName;
        };

        const mainKeys = [
          'name','email','phone','company','eventName','eventDate','eventEndDate','status','registrationDate'
        ];
        const additionalData: Record<string, any> = {};
        
        // Add all fields to additionalData with label-value format
        Object.keys(v).forEach((key: string) => {
          if (v[key] && v[key] !== 'N/A' && v[key] !== '') {
            additionalData[key] = {
              label: getFieldLabel(key),
              value: v[key]
            };
          }
        });

        // Also add the main fields to additionalData for consistency
        const mainFields = {
          name: { label: 'Full Name', value: v.name },
          email: { label: 'Email', value: v.email },
          phone: { label: 'Phone Number', value: v.phone },
          company: { label: 'Company', value: v.company },
          city: { label: 'City', value: v.city },
          state: { label: 'State', value: v.state },
          country: { label: 'Country', value: v.country },
          pincode: { label: 'Pincode', value: v.pincode },
          source: { label: 'Source', value: v.source },
          location: { label: 'Location', value: v.location },
          eventName: { label: 'Event', value: v.eventName },
          eventDate: { label: 'Event Date', value: v.eventDate },
          eventEndDate: { label: 'Event End Date', value: v.eventEndDate },
          status: { label: 'Status', value: v.status },
          registrationDate: { label: 'Registration Date', value: v.registrationDate }
        };

        // Add main fields to additionalData if they have values
        Object.entries(mainFields).forEach(([key, fieldData]) => {
          if (fieldData.value && fieldData.value !== 'N/A' && fieldData.value !== '') {
            additionalData[key] = fieldData;
          }
        });

        const visitorDoc = {
          registrationId: registration._id,
          eventId: eventId,
          formId: new mongoose.Types.ObjectId(), // Create new ObjectId for formId
          name: handleMissingString(v.name),
          email: handleMissingString(v.email),
          phone: handleMissingString(v.phone),
          company: handleMissingString(v.company),
          city: handleMissingString(v.city),
          state: handleMissingString(v.state),
          country: handleMissingString(v.country),
          pincode: handleMissingString(v.pincode),
          source: handleMissingString(v.source),
          location: handleMissingString(v.location),
          qrCode,
          eventName: eventName,
          eventLocation: handleMissingString(v.location || v.city), // Use location first, then city as fallback
          eventStartDate: formatDate(v.eventDate || '') || formatDate(''), // Ensure we have a valid date
          eventEndDate: formatDate(v.eventEndDate || v.eventDate || '') || formatDate(''), // Ensure we have a valid date
          eventStartTime: formatTime(v.eventStartTime || '09:00'), // Default to 9 AM if not provided
          eventEndTime: formatTime(v.eventEndTime || '17:00'), // Default to 5 PM if not provided
          status: handleMissingStatus(v.status),
          additionalData: additionalData,
          createdAt: formatDate(v.registrationDate || '') || formatDate(''), // Ensure we have a valid date
          updatedAt: formatDate(v.registrationDate || '') || formatDate(''), // Ensure we have a valid date
        };

        // Debug: Log the final visitor document
        console.log(`Row ${i + 1} - Final visitor doc:`, {
          name: visitorDoc.name,
          email: visitorDoc.email,
          phone: visitorDoc.phone,
          company: visitorDoc.company,
          eventLocation: visitorDoc.eventLocation,
          eventStartDate: visitorDoc.eventStartDate,
          eventEndDate: visitorDoc.eventEndDate,
          eventStartTime: visitorDoc.eventStartTime,
          eventEndTime: visitorDoc.eventEndTime,
          additionalData: visitorDoc.additionalData
        });

        // Validate required fields before saving
        const requiredFields = ['name', 'email', 'phone', 'company', 'eventStartDate', 'eventEndDate', 'eventStartTime', 'eventEndTime'];
        const missingFields = requiredFields.filter(field => {
          const value = visitorDoc[field as keyof typeof visitorDoc];
          return !value || value === '-' || value === 'N/A';
        });
        
        if (missingFields.length > 0) {
          console.error(`Row ${i + 1} - Missing required fields:`, missingFields);
          errors.push(`Row ${i + 1}: Missing required fields - ${missingFields.join(', ')}`);
          continue; // Skip this row
        }

        try {
          console.log(`Row ${i + 1} - Attempting to create visitor with data:`, {
            name: visitorDoc.name,
            email: visitorDoc.email,
            phone: visitorDoc.phone,
            company: visitorDoc.company,
            eventStartDate: visitorDoc.eventStartDate,
            eventEndDate: visitorDoc.eventEndDate,
            eventStartTime: visitorDoc.eventStartTime,
            eventEndTime: visitorDoc.eventEndTime,
            eventLocation: visitorDoc.eventLocation,
            status: visitorDoc.status
          });
          
          const savedVisitor = await Visitor.create(visitorDoc);
          console.log(`Row ${i + 1} - Visitor created successfully:`, savedVisitor._id);
        } catch (err) {
          console.error(`Error creating Visitor for row ${i + 1}:`, err);
          console.error(`Visitor document that failed:`, JSON.stringify(visitorDoc, null, 2));
          
          // Check if it's a validation error
          if (err instanceof Error && err.name === 'ValidationError') {
            const validationError = err as any;
            const validationMessages = Object.keys(validationError.errors).map(key => 
              `${key}: ${validationError.errors[key].message}`
            );
            errors.push(`Row ${i + 1}: Validation failed - ${validationMessages.join(', ')}`);
          } else {
            errors.push(`Row ${i + 1}: Visitor not saved. ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        // --- End Visitor ---
      } catch (error) {
        console.error(`Error processing row ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      success: true,
      message: `Import completed. ${createdRegistrations.length} registrations created successfully.`,
      created: createdRegistrations.length,
      errors: errors.length,
      errorDetails: errors,
      createdRegistrations
    });

  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ 
      error: 'Failed to process import',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}