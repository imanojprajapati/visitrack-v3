import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const { 
      eventId, 
      status,
      startDate,
      endDate,
      format = 'xlsx' // xlsx or csv
    } = req.query;

    // Build query
    const query: any = {};
    
    if (eventId && mongoose.Types.ObjectId.isValid(eventId as string)) {
      query.eventId = new mongoose.Types.ObjectId(eventId as string);
    }
    
    if (status) {
      query.status = status;
    }

    // Date range filter
    if (startDate && endDate) {
      try {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
      } catch (error) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
    }

    // Fetch visitors with all fields
    const visitors = await Visitor.find(query)
      .populate('eventId', 'title location startDate endDate registrationDeadline description')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!visitors || visitors.length === 0) {
      return res.status(404).json({ error: 'No visitors found' });
    }

    // Define comprehensive column mapping
    const columnMapping = {
      // Basic visitor information
      'name': 'Full Name',
      'email': 'Email Address',
      'phone': 'Phone Number',
      'company': 'Company/Organization',
      'age': 'Age',
      'city': 'City',
      'state': 'State/Province',
      'country': 'Country',
      'pincode': 'Pincode/ZIP Code',
      'source': 'Source',
      'location': 'Location',
      
      // Event information
      'eventName': 'Event Name',
      'eventLocation': 'Event Location',
      'eventStartDate': 'Event Start Date',
      'eventEndDate': 'Event End Date',
      'eventStartTime': 'Event Start Time',
      'eventEndTime': 'Event End Time',
      
      // Status and tracking
      'status': 'Status',
      'qrCode': 'QR Code',
      'checkInTime': 'Check-in Time',
      'checkOutTime': 'Check-out Time',
      'scanTime': 'Scan Time',
      
      // Timestamps
      'createdAt': 'Registration Date',
      'updatedAt': 'Last Updated',
      
      // IDs (for reference)
      'registrationId': 'Registration ID',
      'eventId': 'Event ID',
      'formId': 'Form ID',
      '_id': 'Visitor ID'
    };

    // Process visitors for export
    const exportData = visitors.map(visitor => {
      const row: any = {};

      // Add all basic fields with proper column names
      Object.entries(columnMapping).forEach(([field, columnName]) => {
        if (visitor[field as keyof typeof visitor] !== undefined) {
          const value = visitor[field as keyof typeof visitor];
          
          // Handle special cases
          if (field === 'eventId' && typeof value === 'object' && value !== null) {
            // Event object - extract relevant fields
            row['Event Title'] = (value as any).title || '';
            row['Event Location'] = (value as any).location || '';
            row['Event Start Date'] = (value as any).startDate || '';
            row['Event End Date'] = (value as any).endDate || '';
            row['Event Registration Deadline'] = (value as any).registrationDeadline || '';
            row['Event Description'] = (value as any).description || '';
          } else if (field === '_id') {
            row[columnName] = value?.toString() || '';
          } else if (field === 'registrationId' || field === 'formId') {
            row[columnName] = value?.toString() || '';
          } else if (field === 'scanTime' && value instanceof Date) {
            row[columnName] = value.toISOString();
          } else {
            row[columnName] = value || '';
          }
        }
      });

      // Add additional data fields with proper labeling
      if (visitor.additionalData) {
        Object.entries(visitor.additionalData).forEach(([key, fieldData]) => {
          let columnName = key;
          let value = fieldData;

          // If fieldData is an object with label and value, use the label
          if (typeof fieldData === 'object' && fieldData !== null && 'label' in fieldData && 'value' in fieldData) {
            columnName = (fieldData as any).label || key;
            value = (fieldData as any).value;
          }

          // Avoid conflicts with existing columns
          if (!row.hasOwnProperty(columnName)) {
            row[columnName] = value || '';
          } else {
            // If column name conflicts, prefix with "Additional"
            row[`Additional ${columnName}`] = value || '';
          }
        });
      }

      // Add any missing fields that might be in the schema but not in mapping
      Object.keys(visitor).forEach(key => {
        if (!columnMapping.hasOwnProperty(key) && key !== 'additionalData') {
          const value = visitor[key as keyof typeof visitor];
          if (value !== undefined) {
            row[key] = value || '';
          }
        }
      });

      return row;
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const columnWidths: { [key: string]: number } = {};
    
    // Calculate column widths
    Object.keys(exportData[0] || {}).forEach(key => {
      const maxLength = Math.max(
        key.length,
        ...exportData.map(row => String(row[key] || '').length)
      );
      columnWidths[key] = Math.min(Math.max(maxLength + 2, 10), 50); // Min 10, max 50
    });

    worksheet['!cols'] = Object.keys(columnWidths).map(key => ({
      width: columnWidths[key]
    }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitors');

    // Generate buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: format === 'csv' ? 'csv' : 'xlsx' 
    });

    // Set response headers
    const filename = `visitors_export_${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // Send the file
    res.status(200).send(buffer);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Failed to export visitors',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 