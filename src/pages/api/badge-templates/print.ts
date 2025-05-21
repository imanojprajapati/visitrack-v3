import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import BadgeTemplate from '../../../models/BadgeTemplate';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Readable } from 'stream';

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

    // Create PDF document
    const doc = new PDFDocument({
      size: [template.size.width, template.size.height],
      margin: 0,
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="badge-${templateId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add background if exists
    if (template.background?.cloudinaryUrl) {
      try {
        const response = await fetch(template.background.cloudinaryUrl);
        const buffer = await response.arrayBuffer();
        doc.image(Buffer.from(buffer), 0, 0, {
          width: template.size.width,
          height: template.size.height,
        });
      } catch (error) {
        console.error('Error loading background image:', error);
      }
    }

    // Add logo if enabled
    if (template.logo.enabled && template.logo.cloudinaryUrl) {
      try {
        const response = await fetch(template.logo.cloudinaryUrl);
        const buffer = await response.arrayBuffer();
        const logoWidth = template.size.width * template.logo.size.width;
        const logoHeight = template.size.height * template.logo.size.height;
        const logoX = template.size.width * template.logo.position.x - (logoWidth / 2);
        const logoY = template.size.height * template.logo.position.y - (logoHeight / 2);
        
        doc.image(Buffer.from(buffer), logoX, logoY, {
          width: logoWidth,
          height: logoHeight,
        });
      } catch (error) {
        console.error('Error loading logo:', error);
      }
    }

    // Add photo if enabled
    if (template.photo.enabled && visitorData?.photoUrl) {
      try {
        const response = await fetch(visitorData.photoUrl);
        const buffer = await response.arrayBuffer();
        const photoWidth = template.size.width * template.photo.size.width;
        const photoHeight = template.size.height * template.photo.size.height;
        const photoX = template.size.width * template.photo.position.x - (photoWidth / 2);
        const photoY = template.size.height * template.photo.position.y - (photoHeight / 2);
        
        doc.image(Buffer.from(buffer), photoX, photoY, {
          width: photoWidth,
          height: photoHeight,
        });
      } catch (error) {
        console.error('Error loading photo:', error);
      }
    }

    // Add title if enabled
    if (template.title.enabled) {
      doc.font(template.title.fontFamily)
         .fontSize(template.title.fontSize)
         .fillColor(template.title.color)
         .text(
           template.title.text,
           template.size.width * template.title.position.x,
           template.size.height * template.title.position.y,
           { align: 'center' }
         );
    }

    // Add subtitle if enabled
    if (template.subtitle.enabled) {
      doc.font(template.subtitle.fontFamily)
         .fontSize(template.subtitle.fontSize)
         .fillColor(template.subtitle.color)
         .text(
           template.subtitle.text,
           template.size.width * template.subtitle.position.x,
           template.size.height * template.subtitle.position.y,
           { align: 'center' }
         );
    }

    // Add additional info if enabled
    if (template.additionalInfo.enabled) {
      doc.font(template.additionalInfo.fontFamily)
         .fontSize(template.additionalInfo.fontSize)
         .fillColor(template.additionalInfo.color)
         .text(
           template.additionalInfo.text,
           template.size.width * template.additionalInfo.position.x,
           template.size.height * template.additionalInfo.position.y,
           { align: 'center' }
         );
    }

    // Add QR code if enabled
    if (template.qrCode.enabled && visitorData) {
      try {
        const qrData = JSON.stringify({
          visitorId: visitorData.id,
          templateId: template._id,
          eventId: template.eventId,
        });
        
        const qrCodeDataUrl = await QRCode.toDataURL(qrData);
        const qrCodeBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
        
        const qrWidth = template.size.width * template.qrCode.size.width;
        const qrHeight = template.size.height * template.qrCode.size.height;
        const qrX = template.size.width * template.qrCode.position.x - (qrWidth / 2);
        const qrY = template.size.height * template.qrCode.position.y - (qrHeight / 2);
        
        doc.image(qrCodeBuffer, qrX, qrY, {
          width: qrWidth,
          height: qrHeight,
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }

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