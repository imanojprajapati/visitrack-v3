import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import BadgeTemplate from '../../../models/BadgeTemplate';
import PDFDocument from 'pdfkit';
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
    const { templateId, visitorData } = req.body;

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await BadgeTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Use standard A4 size
    const pdfWidth = 595.28; // A4 width in points
    const pdfHeight = 841.89; // A4 height in points
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="badge-${templateId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // --- Calculate total required height ---
    const badgeHeight = 180;
    const qrMarginTop = 20;
    const qrSize = 200;
    const detailsMarginTop = 20;
    const detailsLineHeight = 28;
    const detailsMarginBottom = 10;
    const visitrackMarginTop = 40;
    const visitrackFontSize = 64;
    let detailsCount = 0;
    if (visitorData) {
      detailsCount = [
        visitorData.name,
        visitorData.email,
        visitorData.phone,
        visitorData.company,
        visitorData.eventName,
        visitorData.eventLocation,
        visitorData.eventStartDate,
        visitorData.eventEndDate,
      ].filter(Boolean).length;
    }
    let totalHeight = badgeHeight + qrMarginTop + qrSize + detailsMarginTop + (detailsCount * detailsLineHeight) + detailsMarginBottom + visitrackMarginTop + visitrackFontSize;

    // If totalHeight > pdfHeight, scale down paddings and font sizes
    let scale = 1;
    if (totalHeight > pdfHeight) {
      scale = pdfHeight / totalHeight;
    }

    // Apply scaling
    const scaled = (v: number) => Math.floor(v * scale);
    let y = 0;

    // 1. First Row: Badge image (100% width, scaled height)
    if (template.badge?.cloudinaryUrl) {
      try {
        const response = await fetch(template.badge.cloudinaryUrl);
        const buffer = await response.arrayBuffer();
        doc.image(Buffer.from(buffer), 0, y, {
          width: pdfWidth,
          height: scaled(badgeHeight),
        });
      } catch (error) {
        console.error('Error loading badge image:', error);
      }
    }
    y += scaled(badgeHeight);

    // 2. Second Row: QR code (scaled size, centered)
    if (visitorData) {
      try {
        // Only use visitor ID for QR code
        const qrData = visitorData._id || visitorData.id || '';
        const qrCodeDataUrl = await QRCode.toDataURL(qrData);
        const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
        const qrScaled = scaled(qrSize);
        const qrX = (pdfWidth - qrScaled) / 2;
        doc.image(qrCodeBuffer, qrX, y + scaled(qrMarginTop), {
          width: qrScaled,
          height: qrScaled,
        });
        y += scaled(qrMarginTop) + qrScaled;
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }

    // 3. Third Row: User details (div-like section with background, similar to web page)
    if (visitorData) {
      const detailsY = y + scaled(detailsMarginTop);
      const detailsBoxWidth = 400;
      const detailsBoxHeight = 120;
      const detailsBoxX = (pdfWidth - detailsBoxWidth) / 2;
      
      // Draw background rectangle for details section (like a div)
      doc.rect(detailsBoxX, detailsY, detailsBoxWidth, detailsBoxHeight)
         .fill('#f8f9fa')
         .stroke('#e9ecef');
      
      // Section title
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1f2937');
      doc.text('Registration Details', detailsBoxX + 20, detailsY + 15, { align: 'left' });
      
      // Details in two columns for better layout
      doc.font('Helvetica').fontSize(10).fillColor('#374151');
      const leftColumn = [
        visitorData.name && `Name: ${visitorData.name}`,
        visitorData.email && `Email: ${visitorData.email}`,
        visitorData.phone && `Phone: ${visitorData.phone}`,
        visitorData.company && `Company: ${visitorData.company}`,
      ].filter(Boolean);
      
      const rightColumn = [
        visitorData.eventName && `Event: ${visitorData.eventName}`,
        visitorData.eventLocation && `Location: ${visitorData.eventLocation}`,
        visitorData.eventStartDate && visitorData.eventEndDate && `Date: ${visitorData.eventStartDate} - ${visitorData.eventEndDate}`,
        visitorData.eventStartDate && !visitorData.eventEndDate && `Date: ${visitorData.eventStartDate}`,
        visitorData._id && `ID: ${visitorData._id}`,
      ].filter(Boolean);
      
      // Left column
      leftColumn.forEach((line, i) => {
        doc.text(line, detailsBoxX + 20, detailsY + 40 + (i * 15), { align: 'left' });
      });
      
      // Right column
      rightColumn.forEach((line, i) => {
        doc.text(line, detailsBoxX + 220, detailsY + 40 + (i * 15), { align: 'left' });
      });
      
      y = detailsY + detailsBoxHeight + scaled(detailsMarginBottom);
    }

    // 4. Fourth Row: VISITOR (at the very bottom of the page)
    const visitorFontSize = scaled(64);
    const visitorY = pdfHeight - visitorFontSize - 20; // 20 points from bottom
    doc.font('Helvetica-Bold').fontSize(visitorFontSize).fillColor('#4338CA');
    doc.text('VISITOR', 0, visitorY, {
      width: pdfWidth,
      align: 'center',
    });

    // Finalize PDF
    doc.end();
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      error: 'Error generating PDF',
      message: error.message,
    });
  }
} 