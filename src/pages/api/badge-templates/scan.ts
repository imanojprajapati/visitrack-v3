import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import BadgeTemplate, { IBadgeTemplate } from '../../../models/BadgeTemplate';
import Event, { IEvent } from '../../../models/Event';
import Visitor, { IVisitor } from '../../../models/Visitor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectToDatabase();
    const { visitorId, templateId, eventId } = req.body;

    if (!visitorId || !templateId || !eventId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Fetch template, event, and visitor data with proper typing
    const [template, event, visitor] = await Promise.all([
      BadgeTemplate.findById(templateId).lean() as Promise<IBadgeTemplate | null>,
      Event.findById(eventId).lean() as Promise<IEvent | null>,
      Visitor.findById(visitorId).lean() as Promise<IVisitor | null>,
    ]);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // Return badge details
    res.status(200).json({
      template: {
        name: template.name,
        showQRCode: template.showQRCode,
        badge: template.badge,
        qrCode: template.qrCode,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
      event: {
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
      },
      visitor: {
        name: visitor.name,
        email: visitor.email,
        phone: visitor.phone,
        age: visitor.age,
        eventName: visitor.eventName,
        eventLocation: visitor.eventLocation,
        eventStartDate: visitor.eventStartDate,
        eventEndDate: visitor.eventEndDate,
        status: visitor.status,
        checkInTime: visitor.checkInTime,
        checkOutTime: visitor.checkOutTime,
        additionalData: visitor.additionalData
      },
    });
  } catch (error: any) {
    console.error('Error handling QR code scan:', error);
    res.status(500).json({
      error: 'Error processing QR code scan',
      message: error.message,
    });
  }
} 