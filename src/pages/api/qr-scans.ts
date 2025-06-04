import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../lib/mongodb';
import QRScan from '../../models/QRScan';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Connect to database
    await connectToDatabase();

    // Get all QR scans, sorted by scanTime in descending order (most recent first)
    const scans = await QRScan.find({})
      .sort({ scanTime: -1 })
      .limit(100) // Limit to last 100 scans for performance
      .lean();

    // Return the scans
    return res.status(200).json({
      message: 'QR scans retrieved successfully',
      scans: scans
    });
  } catch (error) {
    console.error('Error fetching QR scans:', error);
    return res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to fetch QR scans'
    });
  }
} 