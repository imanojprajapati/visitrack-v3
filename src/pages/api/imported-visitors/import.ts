import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
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

    let importedData: any[] = [];

    // Parse file based on extension
    if (fileName.endsWith('.csv')) {
      const csvText = fileBuffer.toString('utf-8');
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });
      if (result.errors.length > 0) {
        return res.status(400).json({ error: 'CSV parsing failed', details: result.errors });
      }
      importedData = result.data;
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length < 2) {
        return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
      }
      const headers = jsonData[0] as string[];
      importedData = (jsonData.slice(1) as any[][]).map(row => {
        const obj: any = {};
        headers.forEach((header, index) => {
          if (header && row[index] !== undefined) {
            obj[header.trim()] = row[index];
          }
        });
        return obj;
      });
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload CSV or Excel files.' });
    }

    // Helper to format date to DD-MM-YY
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
        // Convert YYYY to YY
        return `${parts[0]}-${parts[1]}-${parts[2].slice(2)}`;
      }
      return dateStr;
    };
    // Helper to format time to HH:mm
    const formatTime = (timeStr: string) => {
      if (!timeStr) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      return timeStr;
    };
    // Map fields from file to Visitor model
    const mapped = [];
    const errors = [];
    for (let i = 0; i < importedData.length; i++) {
      // Normalize keys to lowercase and trim
      const row: Record<string, any> = {};
      Object.entries(importedData[i]).forEach(([k, v]) => {
        row[k.toLowerCase().trim()] = v;
      });
      // Debug: print normalized row
      console.log('Normalized row:', row);
      try {
        // Use exact keys from the user's file (all lowercase, with spaces)
        const mainMap: Record<string, string> = {
          name: 'name',
          email: 'email',
          phone: 'phone number',
          company: 'company',
          eventName: 'event',
          eventLocation: 'location',
          eventStartDate: 'event date',
          eventEndDate: 'event end date',
          status: 'status',
          createdAt: 'registration date',
        };
        const doc: any = {};
        Object.entries(mainMap).forEach(([modelKey, fileKey]) => {
          let value = row[fileKey] || '';
          if ([
            'eventStartDate',
            'eventEndDate',
            'createdAt',
            'updatedAt',
          ].includes(modelKey)) {
            value = formatDate(value);
          } else if ([
            'eventStartTime',
            'eventEndTime',
          ].includes(modelKey)) {
            value = formatTime(value);
          } else if (!value) {
            value = 'N/A';
          }
          doc[modelKey] = value;
        });
        // Time fields
        doc.eventStartTime = formatTime(row['event start time']);
        doc.eventEndTime = formatTime(row['event end time']);
        // Collect additionalData
        const additionalData: Record<string, any> = {};
        Object.keys(row).forEach(key => {
          if (!Object.values(mainMap).includes(key)) {
            additionalData[key] = row[key];
          }
        });
        doc.additionalData = additionalData;
        // Fill required Visitor fields with dummy ObjectIds
        doc.registrationId = new mongoose.Types.ObjectId();
        doc.eventId = new mongoose.Types.ObjectId();
        doc.formId = new mongoose.Types.ObjectId();
        doc.qrCode = `QR-${Math.random().toString(36).substring(2, 10)}`;
        doc.phone = doc.phone || 'N/A';
        doc.company = doc.company || 'N/A';
        doc.eventLocation = doc.eventLocation || 'N/A';
        doc.eventStartDate = doc.eventStartDate || formatDate('');
        doc.eventEndDate = doc.eventEndDate || formatDate('');
        doc.status = doc.status || 'registered';
        doc.createdAt = doc.createdAt || formatDate('');
        doc.updatedAt = doc.createdAt;
        // Log the doc for debugging
        console.log('Prepared visitor doc:', doc);
        mapped.push(doc);
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Save all mapped docs
    let created = 0;
    for (const doc of mapped) {
      try {
        await Visitor.create(doc);
        created++;
      } catch (err) {
        console.error('Error saving visitor:', err, doc);
        errors.push(`Save error: ${err instanceof Error ? err.message : err}`);
      }
    }

    fs.unlinkSync(file.filepath);
    return res.status(200).json({
      success: true,
      message: `Import completed. ${created} visitors created successfully.`,
      created,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process import', message: error instanceof Error ? error.message : 'Unknown error' });
  }
} 