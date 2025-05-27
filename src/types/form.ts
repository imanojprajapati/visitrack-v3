export interface FormFieldOption {
  label: string;
  value: string;
}

export type FormFieldType = 'text' | 'email' | 'number' | 'tel' | 'date' | 'select' | 'textarea';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  description?: string;
  placeholder?: string;
  readOnly?: boolean;
  options?: FormFieldOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface EventForm {
  id: string;
  title: string;
  fields: FormField[];
}

export interface FormSubmission {
  _id?: string;
  formId: string;
  eventId: string;
  data: Record<string, any>;
  submittedAt: Date;
} 