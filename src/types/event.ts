import { EventForm } from './form';

export type EventCategory = 'Conference' | 'Workshop' | 'Seminar' | 'Meeting' | 'General' | 'Other';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'upcoming';

export interface Event {
  _id?: string;
  title: string;
  description: string;
  category?: EventCategory;
  startDate: string | Date;
  endDate: string | Date;
  time: string;
  endTime: string;
  location: string;
  venue?: string;
  organizer?: string;
  banner?: string;
  status: EventStatus;
  capacity: number;
  visitors?: number;
  registrationDeadline?: string | Date;
  formId?: string;
  form?: EventForm;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  category?: EventCategory;
  startDate: string | Date;
  endDate: string | Date;
  time: string;
  endTime: string;
  location: string;
  venue?: string;
  organizer?: string;
  banner?: string;
  status?: EventStatus;
  capacity?: number;
  registrationDeadline?: string | Date;
  formId?: string;
}