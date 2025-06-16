import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Center from '../../../models/Center';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      await connectToDatabase();
      
      const { data } = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: 'Invalid data format. Expected non-empty array.' });
      }

      const results = {
        total: data.length,
        created: 0,
        updated: 0,
        errors: [] as Array<{ row: number; error: string; data: any }>
      };

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        try {
          // Validate required fields
          if (!row.email || !row.name || !row.phone || !row.company || !row.city || !row.state || !row.country || !row.pincode) {
            results.errors.push({
              row: i + 1,
              error: 'Missing required fields',
              data: row
            });
            continue;
          }

          // Prepare center data with proper handling of missing fields
          const centerData = {
            name: row.name,
            email: row.email.toLowerCase(),
            phone: row.phone,
            company: row.company,
            city: row.city,
            state: row.state,
            country: row.country,
            pincode: row.pincode,
            // Use current timestamp for missing dates
            createdAt: row.createdat || row.created_at || new Date(),
            updatedAt: new Date()
          };

          // Check if center already exists
          const existingCenter = await Center.findOne({ email: centerData.email });
          
          if (existingCenter) {
            // Update existing center
            await Center.findByIdAndUpdate(
              existingCenter._id,
              {
                name: centerData.name,
                phone: centerData.phone,
                company: centerData.company,
                city: centerData.city,
                state: centerData.state,
                country: centerData.country,
                pincode: centerData.pincode,
                updatedAt: centerData.updatedAt
              },
              { new: true, runValidators: true }
            );
            results.updated++;
          } else {
            // Create new center with generated ID and proper timestamps
            const newCenter = await Center.create({
              ...centerData,
              // MongoDB will automatically generate _id if not provided
              _id: row.id || row._id || undefined
            });
            results.created++;
          }
        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
            data: row
          });
        }
      }

      res.status(200).json({
        message: 'Import completed',
        results
      });
    } catch (error) {
      console.error('Error importing centers:', error);
      res.status(500).json({ 
        message: 'Failed to import centers',
        error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
} 