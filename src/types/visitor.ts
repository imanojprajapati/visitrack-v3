import { Event } from './event';

export interface Visitor {
  _id: string;
  registrationId: string;
  eventId: string;
  eventName?: string;
  eventLocation?: string;
  eventStartDate?: string; // DD-MM-YYYY format
  eventEndDate?: string; // DD-MM-YYYY format
  name: string;
  email: string;
  phone?: string;
  company?: string;
  formData?: Record<string, {
    label: string;
    value: string | number | boolean | Date;
  }>;
  createdAt: string; // DD-MM-YYYY format
  updatedAt: string; // DD-MM-YYYY format
  status: 'registered' | 'checked-in' | 'checked-out';
  checkInTime?: string; // DD-MM-YYYY HH:mm format
  checkOutTime?: string; // DD-MM-YYYY HH:mm format
  source?: string;
} 