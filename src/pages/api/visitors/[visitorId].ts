import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor, { IVisitor } from '../../../models/Visitor';
import Registration, { IRegistration } from '../../../models/Registration';
import Event, { IEvent } from '../../../models/Event';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { visitorId } = req.query;

  if (!visitorId || typeof visitorId !== 'string') {
    console.error('Invalid visitor ID:', visitorId);
    return res.status(400).json({ message: 'Invalid visitor ID' });
  }

  try {
    console.log('Connecting to database...');
    const conn = await connectToDatabase();
    if (!conn) {
      throw new Error('Failed to connect to database');
    }
    console.log('Connected to database, searching for visitor:', visitorId);

    // First check if the ID is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(visitorId)) {
      console.error('Invalid MongoDB ObjectId:', visitorId);
      return res.status(400).json({ message: 'Invalid visitor ID format' });
    }

    // Try to find the visitor
    const visitor = await Visitor.findById(visitorId).lean() as IVisitor | null;
    console.log('Visitor search result:', visitor ? 'Found' : 'Not found');
    
    if (visitor) {
      console.log('Visitor details:', {
        id: visitor._id.toString(),
        name: visitor.name,
        eventName: visitor.eventName,
        status: visitor.status
      });
    }

    if (!visitor) {
      // Check if it exists in registrations
      const registration = await Registration.findById(visitorId).lean() as IRegistration | null;
      console.log('Registration search result:', registration ? 'Found' : 'Not found');
      
      if (registration) {
        console.log('Found matching registration, converting to visitor...');
        // Convert registration to visitor
        const event = await Event.findById(registration.eventId).lean() as IEvent | null;
        
        if (!event) {
          console.error('Event not found for registration:', registration.eventId);
          return res.status(404).json({ message: 'Event not found for registration' });
        }

        // Create visitor from registration
        const newVisitor = await Visitor.create({
          registrationId: registration._id,
          eventId: registration.eventId,
          formId: registration.formId,
          name: registration.formData.Name?.value || '',
          email: registration.formData['Enter a Email']?.value || '',
          phone: registration.formData['Phone No']?.value || '',
          age: Number(registration.formData.Age?.value) || 0,
          eventName: event.title,
          eventLocation: event.location,
          eventStartDate: event.startDate,
          eventEndDate: event.endDate,
          status: registration.status,
          checkInTime: registration.checkInTime,
          checkOutTime: registration.checkOutTime,
          additionalData: registration.formData
        });

        console.log('Created new visitor from registration:', newVisitor._id);
        return res.status(200).json(newVisitor);
      }

      console.error('Visitor not found:', visitorId);
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Convert MongoDB document to plain object and format dates
    const visitorData = {
      _id: visitor._id.toString(),
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
      createdAt: visitor.createdAt,
      updatedAt: visitor.updatedAt
    };

    console.log('Sending visitor data for ID:', visitorId);
    res.status(200).json(visitorData);
  } catch (err) {
    console.error('Error in visitor API:', err);
    const error = err as Error;
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 