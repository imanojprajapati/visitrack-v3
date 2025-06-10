import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import QRCode from 'qrcode';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToDatabase();
    const { visitorId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ error: 'Visitor ID is required' });
    }

    // Fetch visitor data
    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // Generate QR code for visitor ID
    const qrCodeDataUrl = await QRCode.toDataURL(visitorId, {
      width: 50,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Convert QR code to buffer
    const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

    // Create PDF with custom dimensions (200x58 points)
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: [200, 58], // Width: 200, Height: 58
      margin: 0,
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="badge-${visitorId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add padding (8 points)
    const padding = 8;
    const contentWidth = 200 - (padding * 2); // 184
    const contentHeight = 58 - (padding * 2); // 42

    // Parse event date from DD-MM-YY format
    let eventDate = 'N/A';
    try {
      if (visitor.eventStartDate) {
        const [day, month, year] = visitor.eventStartDate.split('-');
        if (day && month && year) {
          const fullYear = Number(year) < 50 ? '20' + year : '19' + year;
          const dateObj = new Date(`${fullYear}-${month}-${day}`);
          if (!isNaN(dateObj.getTime())) {
            eventDate = dateObj.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error parsing event date:', error);
    }

    // First column: QR Code (50x50)
    const qrSize = 42; // Slightly smaller than 50 to fit in content area
    const qrX = padding;
    const qrY = padding + (contentHeight - qrSize) / 2; // Center vertically

    // Add QR code
    doc.image(qrCodeBuffer, qrX, qrY, {
      width: qrSize,
      height: qrSize,
    });

    // Second column: Visitor details (remaining width)
    const detailsX = padding + qrSize + 10; // 10 points gap between columns
    const detailsWidth = contentWidth - qrSize - 10;
    const detailsY = padding;

    // Set font styles
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
    
    // Visitor name (truncate if too long)
    const visitorName = visitor.name.length > 15 ? visitor.name.substring(0, 15) + '...' : visitor.name;
    doc.text(visitorName, detailsX, detailsY, {
      width: detailsWidth,
      align: 'left'
    });

    // Event name (smaller font, truncate if too long)
    doc.font('Helvetica').fontSize(6).fillColor('#666666');
    const eventName = visitor.eventName.length > 20 ? visitor.eventName.substring(0, 20) + '...' : visitor.eventName;
    doc.text(eventName, detailsX, detailsY + 12, {
      width: detailsWidth,
      align: 'left'
    });

    // Event date
    doc.font('Helvetica').fontSize(6).fillColor('#666666');
    doc.text(eventDate, detailsX, detailsY + 20, {
      width: detailsWidth,
      align: 'left'
    });

    // Visitor ID (small, at bottom, show full ID)
    doc.font('Helvetica').fontSize(5).fillColor('#999999');
    doc.text(visitorId, detailsX, detailsY + 28, {
      width: detailsWidth,
      align: 'left'
    });

    // Finalize PDF
    doc.end();
  } catch (error: any) {
    console.error('Error generating badge PDF:', error);
    res.status(500).json({
      error: 'Error generating badge PDF',
      message: error.message,
    });
  }
} 