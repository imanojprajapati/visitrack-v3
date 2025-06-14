import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Registration from '../../../models/Registration';
import Event from '../../../models/Event';
import { Types } from 'mongoose';

interface FormField {
  label: string;
  value: string | number | boolean;
}

interface FormData {
  [key: string]: FormField;
}

// Helper function to format date to DD-MM-YYYY
const formatDateToDDMMYYYY = (date: Date | string): string => {
  if (!date) return '';
  
  let dateObj: Date;
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = String(dateObj.getFullYear());
  return `${day}-${month}-${year}`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const {
      name,
      email,
      phone,
      company,
      city,
      state,
      country,
      pincode,
      source,
      eventId,
      startDate,
      endDate,
    } = req.query;

    // Build the query
    const query: any = {};

    // Add filters if they exist
    if (eventId) query.eventId = eventId;
    if (startDate && endDate) {
      query.submittedAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    // Fetch registrations with event details
    const registrations = await Registration.find(query)
      .populate('eventId', 'title location startDate endDate')
      .lean();

    // Filter the results based on form data
    const filteredRegistrations = registrations.filter(registration => {
      const formData = (registration.formData || {}) as FormData;
      
      // Helper function to check if a field matches the filter
      const matchesFilter = (fieldName: string, filterValue: string) => {
        if (!filterValue) return true;
        const field = Object.values(formData).find((f: FormField) => 
          f.label.toLowerCase().includes(fieldName.toLowerCase())
        );
        return field && String(field.value).toLowerCase().includes(String(filterValue).toLowerCase());
      };

      // Check all filters
      return (
        matchesFilter('name', name as string) &&
        matchesFilter('email', email as string) &&
        matchesFilter('phone', phone as string) &&
        matchesFilter('company', company as string) &&
        matchesFilter('city', city as string) &&
        matchesFilter('state', state as string) &&
        matchesFilter('country', country as string) &&
        matchesFilter('pincode', pincode as string) &&
        matchesFilter('source', source as string)
      );
    });

    // Format the response
    const formattedRegistrations = filteredRegistrations.map(registration => {
      const formData = (registration.formData || {}) as FormData;
      const event = registration.eventId as any;

      // Helper function to get field value
      const getFieldValue = (fieldName: string) => {
        const field = Object.values(formData).find((f: FormField) => 
          f.label.toLowerCase().includes(fieldName.toLowerCase())
        );
        return field ? String(field.value) : '';
      };

      return {
        _id: registration._id,
        name: getFieldValue('name'),
        email: getFieldValue('email'),
        phone: getFieldValue('phone'),
        company: getFieldValue('company'),
        city: getFieldValue('city'),
        state: getFieldValue('state'),
        country: getFieldValue('country'),
        pincode: getFieldValue('pincode'),
        source: getFieldValue('source') || 'Website',
        eventName: event?.title || 'Unknown Event',
        eventLocation: event?.location || 'Unknown Location',
        eventStartDate: event?.startDate ? formatDateToDDMMYYYY(event.startDate) : '',
        eventEndDate: event?.endDate ? formatDateToDDMMYYYY(event.endDate) : '',
        status: registration.status,
        submittedAt: registration.submittedAt,
      };
    });

    res.status(200).json(formattedRegistrations);
  } catch (error) {
    console.error('Error fetching registration report:', error);
    res.status(500).json({ error: 'Failed to fetch registration report' });
  }
} 