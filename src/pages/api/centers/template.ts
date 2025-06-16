import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="centerdb-template.csv"');

      const currentDate = new Date().toISOString();
      
      // Create CSV template with headers and sample data
      const csvContent = [
        'ID,Name,Email,Phone,Company,City,State,Country,Pincode,Created At,Updated At',
        '507f1f77bcf86cd799439011,John Doe,john.doe@example.com,+1234567890,ABC Company,New York,NY,USA,10001,' + currentDate + ',' + currentDate,
        '507f1f77bcf86cd799439012,Jane Smith,jane.smith@example.com,+1987654321,XYZ Corp,Los Angeles,CA,USA,90210,' + currentDate + ',' + currentDate,
        '507f1f77bcf86cd799439013,Sample User,sample@example.com,+1122334455,Sample Inc,Chicago,IL,USA,60601,' + currentDate + ',' + currentDate
      ].join('\n');

      res.status(200).send(csvContent);
    } catch (error) {
      console.error('Error generating template:', error);
      res.status(500).json({ 
        message: 'Failed to generate template',
        error: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
} 