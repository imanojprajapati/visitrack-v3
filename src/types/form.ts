export type FormFieldType = 'text' | 'email' | 'number' | 'tel' | 'date' | 'select' | 'textarea';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface EventForm {
  _id: string;
  eventId: string;
  title: string;
  fields: FormField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FormSubmission {
  _id?: string;
  formId: string;
  eventId: string;
  data: Record<string, any>;
  submittedAt: Date;
} 