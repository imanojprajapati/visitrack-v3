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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectToDatabase();

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
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
      }

      // Convert to array of objects
      const headers = jsonData[0] as string[];
      importedData = (jsonData.slice(1) as any[][]).map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined) {
            obj[header.trim().toLowerCase()] = row[index];
          }
        });
        return obj;
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

        // Helper function to format date to DD-MM-YY
        const formatDate = (dateStr: string) => {
          if (!dateStr) {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = String(now.getFullYear() % 100).padStart(2, '0');
            return `${day}-${month}-${year}`;
          }
          const parts = dateStr.split('-');
          if (parts.length === 3 && parts[2].length === 4) {
            return `${parts[0]}-${parts[1]}-${parts[2].slice(2)}`;
          }
          return dateStr;
        };

        // Helper function to format time to HH:mm
        const formatTime = (timeStr: string) => {
          if (!timeStr) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
          }
          return timeStr;
        };

        const mainKeys = [
          'name','email','phone','company','eventName','eventDate','eventEndDate','status','registrationDate'
        ];
        const additionalData: Record<string, any> = {};
        
        // Add all fields to additionalData with label-value format
        Object.keys(v).forEach((key: string) => {
          if (v[key]) {
            additionalData[key] = {
              label: getFieldLabel(key),
              value: v[key]
            };
          }
        });

        const visitorDoc = {
          registrationId: registration._id,
          eventId: eventId,
          formId: new mongoose.Types.ObjectId(), // Create new ObjectId for formId
          name: v.name || 'N/A',
          email: v.email || 'N/A',
          phone: v.phone || 'N/A',
          company: v.company || 'N/A',
          city: v.city || 'N/A',
          state: v.state || 'N/A',
          country: v.country || 'N/A',
          pincode: v.pincode || 'N/A',
          source: v.source || 'N/A',
          location: v.location || 'N/A',
          qrCode,
          eventName: eventName,
          eventLocation: v.location || v.city || 'N/A', // Use location first, then city as fallback
          eventStartDate: formatDate(v.eventDate || ''),
          eventEndDate: formatDate(v.eventEndDate || ''),
          eventStartTime: formatTime(v.eventStartTime || ''),
          eventEndTime: formatTime(v.eventEndTime || ''),
          status: mapVisitorStatus(v.status),
          additionalData: additionalData,
          createdAt: formatDate(v.registrationDate || ''),
          updatedAt: formatDate(v.registrationDate || ''),
        };

        // Debug: Log the final visitor document
        console.log(`Row ${i + 1} - Final visitor doc:`, {
          name: visitorDoc.name,
          email: visitorDoc.email,
          phone: visitorDoc.phone,
          company: visitorDoc.company,
          eventLocation: visitorDoc.eventLocation,
          additionalData: visitorDoc.additionalData
        });

        try {
          await Visitor.create(visitorDoc);
        } catch (err) {
          console.error(`Error creating Visitor for row ${i + 1}:`, err, visitorDoc);
          errors.push(`Row ${i + 1}: Visitor not saved. ${err instanceof Error ? err.message : err}`);
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