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

    // Fetch visitors
    const visitors = await Visitor.find(query)
      .populate('eventId', 'title location startDate endDate')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    if (!visitors || visitors.length === 0) {
      return res.status(404).json({ error: 'No visitors found' });
    }

    // Define main table columns (these will be the primary columns)
    const mainColumns = [
      'name', 'email', 'phone', 'company', 'city', 'state', 'country', 
      'pincode', 'source', 'location', 'eventName', 'eventLocation', 
      'eventStartDate', 'eventEndDate', 'eventStartTime', 'eventEndTime', 
      'status', 'checkInTime', 'checkOutTime', 'createdAt', 'updatedAt'
    ];

    // Process visitors for export
    const exportData = visitors.map(visitor => {
      const row: any = {};

      // Add main table columns first
      row.name = visitor.name || '';
      row.email = visitor.email || '';
      row.phone = visitor.phone || '';
      row.company = visitor.company || '';
      row.city = visitor.city || '';
      row.state = visitor.state || '';
      row.country = visitor.country || '';
      row.pincode = visitor.pincode || '';
      row.source = visitor.source || '';
      row.location = visitor.location || '';
      row.eventName = visitor.eventName || '';
      row.eventLocation = visitor.eventLocation || '';
      row.eventStartDate = visitor.eventStartDate || '';
      row.eventEndDate = visitor.eventEndDate || '';
      row.eventStartTime = visitor.eventStartTime || '';
      row.eventEndTime = visitor.eventEndTime || '';
      row.status = visitor.status || '';
      row.checkInTime = visitor.checkInTime || '';
      row.checkOutTime = visitor.checkOutTime || '';
      row.createdAt = visitor.createdAt || '';
      row.updatedAt = visitor.updatedAt || '';
      row.registrationId = visitor.registrationId || '';
      row.formId = visitor.formId || '';
      row.qrCode = visitor.qrCode || '';

      // Add additional data fields (only if they're not already in main columns)
      if (visitor.additionalData) {
        Object.entries(visitor.additionalData).forEach(([key, fieldData]) => {
          // Skip if this field is already in main columns to avoid duplication
          if (!mainColumns.includes(key)) {
            // If fieldData is an object with label and value, extract the value
            if (typeof fieldData === 'object' && fieldData !== null && 'value' in fieldData) {
              row[`additional_${key}`] = fieldData.value || '';
            } else {
              row[`additional_${key}`] = fieldData || '';
            }
          }
        });
      }

      return row;
    });

    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const maxWidth = Object.keys(exportData[0] || {}).reduce((max, key) => {
      const length = Math.max(key.length, ...exportData.map(row => String(row[key] || '').length));
      return Math.max(max, Math.min(length, 50)); // Cap at 50 characters
    }, 10);

    worksheet['!cols'] = [{ width: maxWidth }];

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