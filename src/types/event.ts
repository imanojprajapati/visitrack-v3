export type EventCategory = 'Conference' | 'Workshop' | 'Seminar' | 'Meeting' | 'Other';
export type EventStatus = 'active' | 'upcoming' | 'completed' | 'cancelled';

export interface Event {
  _id?: string;
  id?: number;
  title: string;
  description: string;
  category: EventCategory;
  startDate: string;
  endDate: string;
  time: string;
  location: string;
  venue?: string;
  organizer: string;
  banner?: string;
  status: EventStatus;
  capacity: number;
  visitors?: number;
  registrationDeadline?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateEventInput {
  title: string;
  description: string;
  category: EventCategory;
  startDate: string;
  endDate: string;
  time: string;
  location: string;
  organizer: string;
  banner?: string;
  status: EventStatus;
  capacity: number;
  registrationDeadline?: string;
}