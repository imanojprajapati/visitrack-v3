import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Event, { IEvent } from '../../../models/Event';
import Registration from '../../../models/Registration';
import Form from '../../../models/Form';
import { generateQRCode } from '../../../lib/server-qrcode';
import { QRCodeData } from '../../../lib/qrcode';
import mongoose from 'mongoose';

interface EventDocument extends mongoose.Document, IEvent {
  _id: mongoose.Types.ObjectId;
}

interface FormDataValue {
  label: string;
  value: any;
}

type FormData = Record<string, FormDataValue>;

// Helper function to format date to DD-MM-YY
const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    // If it's already a string in DD-MM-YY format, return it
    if (/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2}$/.test(date)) {
      return date;
    }
    // Otherwise parse it as a date
    date = new Date(date);
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear() % 100).padStart(2, '0');
  return `${day}-${month}-${year}`;
};

// Helper function to convert 12-hour time to 24-hour format
const convertTo24HourFormat = (time: string): string => {
  // If already in 24-hour format (HH:mm), return as is
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return time;
  }

  // Parse 12-hour format (h:mm AM/PM)
  const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) {
    throw new Error('Invalid time format');
  }

  let [_, hours, minutes, period] = match;
  hours = parseInt(hours, 10);
  
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { eventId, name, email, phone, formData } = req.body as {
      eventId: string;
      name: string;
      email: string;
      phone: string;
      formData: FormData;
    };

    if (!eventId || !name || !email || !formData) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Connect to database
    await connectToDatabase();

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get event with form details
      const event = await Event.findById(eventId)
        .populate('formId')
        .exec() as EventDocument | null;

      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.formId) {
        throw new Error('Event has no registration form');
      }

      // Validate required event fields
      if (!event.title || !event.location || !event.startDate || !event.endDate) {
        throw new Error('Event is missing required fields');
      }

      // Check if event is at capacity
      const registeredCount = await Visitor.countDocuments({ eventId }).session(session);
      if (event.capacity && registeredCount >= event.capacity) {
        throw new Error('Event is at full capacity');
      }

      // Extract additional data from formData and add source
      const additionalData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (typeof value === 'object' && value !== null && 'label' in value && 'value' in value) {
          acc[key] = value as FormDataValue;
        }
        return acc;
      }, {} as FormData);

      // Add source field with default value "Website"
      additionalData.source = {
        label: 'Source',
        value: 'Website'
      };

      // Create registration record first
      const registration = await Registration.create([{
        eventId: event._id,
        formId: event.formId,
        formData: additionalData,
        status: 'registered',
        createdAt: new Date()
      }], { session });

      if (!registration[0]) {
        throw new Error('Failed to create registration record');
      }

      // Generate QR code
      const visitorId = new mongoose.Types.ObjectId();
      const qrCodeData: QRCodeData = {
        visitorId: visitorId.toString(),
        eventId: event._id.toString(),
        registrationId: registration[0]._id.toString()
      };

      let qrCode: string;
      try {
        qrCode = await generateQRCode(qrCodeData);
        if (!qrCode) {
          throw new Error('QR code generation returned empty result');
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
        throw new Error('Failed to generate QR code for visitor');
      }

      // Format dates to DD-MM-YY
      const now = new Date();
      const formattedDate = formatDate(now);

      // Create visitor record with all required event details
      const visitor = await Visitor.create([{
        _id: visitorId,
        registrationId: registration[0]._id,
        eventId: event._id,
        formId: event.formId,
        name: name || additionalData.name?.value || '',
        email: email || additionalData.email?.value || '',
        phone: phone || additionalData.phone?.value || '',
        company: additionalData.company?.value || '',
        qrCode,
        eventName: event.title,
        eventLocation: event.location,
        eventStartDate: formatDate(event.startDate),
        eventEndDate: formatDate(event.endDate),
        eventStartTime: convertTo24HourFormat(event.time),
        eventEndTime: event.endTime ? convertTo24HourFormat(event.endTime) : convertTo24HourFormat(event.time), // Use start time as fallback
        status: 'registered',
        createdAt: formattedDate,
        updatedAt: formattedDate,
        additionalData
      }], { 
        session,
        validateBeforeSave: true,
        runValidators: true
      });

      if (!visitor[0]) {
        throw new Error('Failed to create visitor record');
      }

      // Update registration with visitor ID
      await Registration.findByIdAndUpdate(
        registration[0]._id,
        { visitorId: visitor[0]._id },
        { session }
      );

      // Commit the transaction
      await session.commitTransaction();

      // Return success response with visitor and event details
      res.status(201).json({
        message: 'Visitor registered successfully',
        visitor: {
          _id: visitor[0]._id,
          name: visitor[0].name,
          email: visitor[0].email,
          phone: visitor[0].phone,
          company: visitor[0].company,
          eventName: visitor[0].eventName,
          eventLocation: visitor[0].eventLocation,
          eventStartDate: visitor[0].eventStartDate,
          eventEndDate: visitor[0].eventEndDate,
          status: visitor[0].status,
          qrCode: visitor[0].qrCode,
          createdAt: visitor[0].createdAt,
          additionalData: visitor[0].additionalData
        }
      });
    } catch (error) {
      // If an error occurred, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      session.endSession();
    }
  } catch (error) {
    console.error('Error registering visitor:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to register visitor'
    });
  }
} 