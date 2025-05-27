import { Event } from './event';

export interface Visitor {
  _id: string;
  registrationId: string;
  eventId: string;
  formId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  designation?: string;
  age?: number;
  eventName: string;
  eventLocation: string;
  eventStartDate: Date;
  eventEndDate: Date;
  status: 'registered' | 'checked_in' | 'checked_out' | 'cancelled';
  checkInTime?: Date;
  checkOutTime?: Date;
  qrCode: string;
  additionalData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
} 