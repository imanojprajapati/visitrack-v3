import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { visitorId } = req.query;

    if (!visitorId || typeof visitorId !== 'string') {
      return res.status(400).json({ message: 'Visitor ID is required' });
    }

    const { db } = await connectToDatabase();

    // Check if visitor already exists in qrscans collection
    const existingScan = await db.collection('qrscans')
      .findOne(
        { visitorId: visitorId },
        { 
          sort: { scanTime: -1 },
          projection: {
            _id: 1,
            visitorId: 1,
            name: 1,
            company: 1,
            eventName: 1,
            scanTime: 1,
            entryType: 1,
            status: 1
          }
        }
      );

    if (existingScan) {
      return res.status(200).json({
        exists: true,
        message: 'Visitor has already been checked in',
        scan: {
          _id: existingScan._id,
          visitorId: existingScan.visitorId,
          name: existingScan.name,
          company: existingScan.company,
          eventName: existingScan.eventName,
          scanTime: existingScan.scanTime,
          entryType: existingScan.entryType,
          status: existingScan.status
        }
      });
    }

    return res.status(200).json({
      exists: false,
      message: 'Visitor not found in scan records'
    });

  } catch (error) {
    console.error('Error checking visitor scan status:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 