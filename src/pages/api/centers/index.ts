import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Center, { ICenter } from '../../../models/Center';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Get all centers with pagination
    try {
      await connectToDatabase();
      
      const { page = '1', limit = '50', search = '' } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      let query = {};
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { company: { $regex: search, $options: 'i' } },
            { city: { $regex: search, $options: 'i' } },
            { state: { $regex: search, $options: 'i' } },
            { country: { $regex: search, $options: 'i' } }
          ]
        };
      }

      const centers = await Center.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await Center.countDocuments(query);

      res.status(200).json({
        centers,
        pagination: {
          current: pageNum,
          total: Math.ceil(total / limitNum),
          totalRecords: total,
          hasNext: pageNum * limitNum < total,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      console.error('Error fetching centers:', error);
      res.status(500).json({ 
        message: 'Failed to fetch centers',
        error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      });
    }
  } else if (req.method === 'POST') {
    // Create or update center
    try {
      await connectToDatabase();
      
      const { email, name, phone, company, city, state, country, pincode } = req.body;

      if (!email || !name || !phone || !company || !city || !state || !country || !pincode) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Check if center already exists
      const existingCenter = await Center.findOne({ email: email.toLowerCase() });
      
      if (existingCenter) {
        // Update existing center
        const updatedCenter = await Center.findByIdAndUpdate(
          existingCenter._id,
          {
            name,
            phone,
            company,
            city,
            state,
            country,
            pincode,
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        );

        res.status(200).json({
          message: 'Center updated successfully',
          center: updatedCenter,
          isNew: false
        });
      } else {
        // Create new center
        const newCenter = await Center.create({
          email,
          name,
          phone,
          company,
          city,
          state,
          country,
          pincode
        });

        res.status(201).json({
          message: 'Center created successfully',
          center: newCenter,
          isNew: true
        });
      }
    } catch (error) {
      console.error('Error creating/updating center:', error);
      
      if (error instanceof Error && error.message.includes('duplicate key')) {
        res.status(400).json({ message: 'A center with this email already exists' });
      } else {
        res.status(500).json({ 
          message: 'Failed to create/update center',
          error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
        });
      }
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
} 