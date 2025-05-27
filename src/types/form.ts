export type FormFieldType = 'text' | 'textarea' | 'email' | 'number' | 'select' | 'date';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: FormFieldOption[]; // Updated to use FormFieldOption type
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