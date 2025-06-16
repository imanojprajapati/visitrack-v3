import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Center from '../../../models/Center';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      await connectToDatabase();
      
      // Get all centers without pagination for export
      const centers = await Center.find({})
        .sort({ createdAt: -1 })
        .lean();

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="centerdb-export-${new Date().toISOString().split('T')[0]}.csv"`);

      // Create CSV content
      const csvHeaders = [
        'ID',
        'Name',
        'Email',
        'Phone',
        'Company',
        'City',
        'State',
        'Country',
        'Pincode',
        'Created At',
        'Updated At'
      ].join(',');

      const csvRows = centers.map(center => [
        center._id,
        `"${center.name.replace(/"/g, '""')}"`,
        `"${center.email}"`,
        `"${center.phone}"`,
        `"${center.company.replace(/"/g, '""')}"`,
        `"${center.city.replace(/"/g, '""')}"`,
        `"${center.state.replace(/"/g, '""')}"`,
        `"${center.country.replace(/"/g, '""')}"`,
        `"${center.pincode}"`,
        center.createdAt,
        center.updatedAt
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.status(200).send(csvContent);
    } catch (error) {
      console.error('Error exporting centers:', error);
      res.status(500).json({ 
        message: 'Failed to export centers',
        error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
} 