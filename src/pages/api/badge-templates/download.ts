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
        const qrData = JSON.stringify({
          visitorId: visitorData.id || visitorData._id,
          templateId: template._id,
          eventId: template.eventId,
        });
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

    // 3. Third Row: User details (centered, scaled)
    if (visitorData) {
      doc.font('Helvetica-Bold').fontSize(scaled(22)).fillColor('#222');
      const details = [
        visitorData._id && `Visitor ID: ${visitorData._id}`,
        visitorData.name && `Name: ${visitorData.name}`,
        visitorData.email && `Email: ${visitorData.email}`,
        visitorData.phone && `Phone: ${visitorData.phone}`,
        visitorData.company && `Company: ${visitorData.company}`,
        visitorData.eventName && `Event: ${visitorData.eventName}`,
        visitorData.eventLocation && `Location: ${visitorData.eventLocation}`,
        visitorData.eventStartDate && `Start: ${visitorData.eventStartDate}`,
        visitorData.eventEndDate && `End: ${visitorData.eventEndDate}`,
      ].filter(Boolean);
      let detailsY = y + scaled(detailsMarginTop);
      details.forEach((line, i) => {
        doc.text(line, 0, detailsY + i * scaled(detailsLineHeight), { width: pdfWidth, align: 'center' });
      });
      y = detailsY + details.length * scaled(detailsLineHeight) + scaled(detailsMarginBottom);
    }

    // 4. Fourth Row: VISITRACK (scaled font size, centered)
    doc.font('Helvetica-Bold').fontSize(scaled(64)).fillColor('#4338CA');
    doc.text('VISITRACK', 0, y + scaled(visitrackMarginTop), {
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