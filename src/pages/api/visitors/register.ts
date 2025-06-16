import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Event, { IEvent } from '../../../models/Event';
import Registration from '../../../models/Registration';
import Form from '../../../models/Form';
import Center from '../../../models/Center';
import { generateQRCode } from '../../../lib/server-qrcode';
import { QRCodeData } from '../../../lib/qrcode';
import mongoose from 'mongoose';
import { FormField } from '../../../types/form';

interface EventDocument extends mongoose.Document, IEvent {
  _id: mongoose.Types.ObjectId;
  formId: mongoose.Types.ObjectId;
}

interface FormWithFields {
  _id: mongoose.Types.ObjectId;
  fields: FormField[];
}

interface EventWithForm extends Omit<EventDocument, 'formId'> {
  formId: {
    _id: mongoose.Types.ObjectId;
    fields: FormField[];
  };
}

interface FormDataValue {
  label: string;
  value: string;
}

interface FormData {
  [key: string]: FormDataValue;
}

// Helper function to format date to DD-MM-YYYY
const formatDate = (date: Date | string): string => {
  if (typeof date === 'string') {
    // If it's already a string in DD-MM-YYYY format, return it
    if (/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/.test(date)) {
      return date;
    }
    // Otherwise parse it as a date
    date = new Date(date);
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
};

// Helper function to convert to DD-MM-YYYY format
const convertToDDMMYYYY = (dateStr: string): string => {
  // If already in DD-MM-YYYY format, return as is
  if (/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If in DD-MM-YY format, convert to DD-MM-YYYY
  if (/^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    const fullYear = Number(year) < 50 ? '20' + year : '19' + year;
    return `${day}-${month}-${fullYear}`;
  }
  
  // If it's a Date object or other format, convert to DD-MM-YYYY
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
};

// Helper function to convert 12-hour time to 24-hour format
const convertTo24HourFormat = (time: string): string => {
  // If already in 24-hour format (HH:mm), return properly formatted
  if (/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    // Ensure hours are padded to 2 digits
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
  }

  // Parse 12-hour format (h:mm AM/PM)
  const match = time.toLowerCase().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) {
    // If no match, try to extract hours and minutes
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const [_, hours, minutes] = timeMatch;
      const paddedHours = String(parseInt(hours, 10)).padStart(2, '0');
      return `${paddedHours}:${minutes}`;
    }
    throw new Error('Invalid time format. Expected HH:mm or h:mm AM/PM');
  }

  let [_, hours, minutes, period] = match;
  let hour = parseInt(hours, 10);
  
  // Convert to 24-hour format
  if (period === 'pm' && hour !== 12) {
    hour += 12;
  } else if (period === 'am' && hour === 12) {
    hour = 0;
  }

  // Ensure both hours and minutes are padded to 2 digits
  return `${String(hour).padStart(2, '0')}:${minutes}`;
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
        .exec() as unknown as EventWithForm;

      if (!event || !event.formId) {
        throw new Error('Event not found or has no form');
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
      const additionalData = Object.entries(formData).reduce((acc: FormData, [key, value]: [string, any]) => {
        if (typeof value === 'object' && value !== null && 'label' in value && 'value' in value) {
          // For source field, always set to "Website"
          if (key === 'source') {
            acc[key] = {
              label: 'Source',
              value: 'Website'
            };
            return acc;
          }

          // Validate number fields
          const field = event.formId.fields.find((f: FormField) => f.id === key);
          
          if (field && field.type === 'number' && field.validation) {
            const numValue = Number(value.value);
            
            if (isNaN(numValue)) {
              throw new Error(`${field.label} must be a valid number`);
            }
            
            const min = field.validation.min;
            const max = field.validation.max;
            
            if (min !== undefined && numValue < min) {
              throw new Error(`${field.label} must be at least ${min}`);
            }
            
            if (max !== undefined && numValue > max) {
              throw new Error(`${field.label} must be at most ${max}`);
            }

            // Store the validated number value
            acc[key] = {
              label: value.label,
              value: String(numValue) // Convert back to string for consistent storage
            };
          } else {
            acc[key] = value;
          }
        }
        return acc;
      }, {} as FormData);

      // Ensure source field exists with default value
      if (!additionalData.source) {
        additionalData.source = {
          label: 'Source',
          value: 'Website'
        };
      }

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
      const qrCodeData = {
        visitorId: visitorId.toString(),
        eventId: event._id.toString()
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

      // Format dates to DD-MM-YYYY format for Visitor model
      const now = new Date();
      const formattedDate = convertToDDMMYYYY(now.toISOString());

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
        eventStartDate: convertToDDMMYYYY(event.startDate),
        eventEndDate: convertToDDMMYYYY(event.endDate),
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

      // Increment the event's visitors count
      const updatedEvent = await Event.findByIdAndUpdate(
        event._id,
        { $inc: { visitors: 1 } },
        { new: true, session }
      );
      if (!updatedEvent) {
        throw new Error('Failed to update event visitor count');
      }

      // Update registration with visitor ID
      await Registration.findByIdAndUpdate(
        registration[0]._id,
        { visitorId: visitor[0]._id },
        { session }
      );

      // Save/update center data in centerdb collection
      try {
        const centerData = {
          name: visitor[0].name,
          email: visitor[0].email,
          phone: visitor[0].phone,
          company: visitor[0].company,
          city: additionalData.city?.value || '',
          state: additionalData.state?.value || '',
          country: additionalData.country?.value || '',
          pincode: additionalData.pincode?.value || ''
        };

        // Check if center already exists
        const existingCenter = await Center.findOne({ email: centerData.email.toLowerCase() });
        
        if (existingCenter) {
          // Update existing center with new data
          await Center.findByIdAndUpdate(
            existingCenter._id,
            centerData,
            { session, runValidators: true }
          );
          console.log('Center data updated for email:', centerData.email);
        } else {
          // Create new center record
          await Center.create([centerData], { session });
          console.log('New center data created for email:', centerData.email);
        }
      } catch (centerError) {
        console.error('Error saving center data:', centerError);
        // Don't fail the registration if center data save fails
      }

      // Commit the transaction
      await session.commitTransaction();

      // Send registration success email
      try {
        console.log('Attempting to send registration success email for visitor:', visitor[0]._id);
        
        const emailResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/visitors/send-registration-success`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visitorId: (visitor[0]._id as any).toString()
          })
        });

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json();
          console.log('Registration success email sent successfully:', {
            visitorId: visitor[0]._id,
            visitorEmail: visitor[0].email,
            eventTitle: visitor[0].eventName,
            pdfAttached: emailResult.pdfAttached
          });
        } else {
          const errorText = await emailResponse.text();
          console.error('Failed to send registration success email:', {
            status: emailResponse.status,
            statusText: emailResponse.statusText,
            error: errorText,
            visitorId: visitor[0]._id,
            visitorEmail: visitor[0].email
          });
        }
      } catch (emailError) {
        console.error('Error sending registration success email:', {
          error: emailError,
          visitorId: visitor[0]._id,
          visitorEmail: visitor[0].email,
          eventTitle: visitor[0].eventName
        });
        // Don't fail the registration if email sending fails
      }

      // Return success response with visitor and event details
      res.status(201).json({
        message: 'Visitor registered successfully',
        visitor: {
          _id: visitor[0]._id,
          eventId: visitor[0].eventId,
          registrationId: visitor[0].registrationId,
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