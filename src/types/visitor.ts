import { Event } from './event';

export interface Visitor {
  _id: string;
  registrationId: string;
  eventId: string;
  eventName?: string;
  eventLocation?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  formData?: Record<string, {
    label: string;
    value: string | number | boolean | Date;
  }>;
  createdAt: string;
  updatedAt: string;
  status: 'registered' | 'checked-in' | 'checked-out';
  checkInTime?: string;
  checkOutTime?: string;
  source?: string;
} 