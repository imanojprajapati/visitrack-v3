export interface FormFieldOption {
  label: string;
  value: string;
}

export type FormFieldType = 'text' | 'email' | 'number' | 'phone' | 'date' | 'select' | 'textarea';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  description?: string;
  placeholder?: string;
  readOnly?: boolean;
  defaultValue?: string | number;
  options?: FormFieldOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface EventForm {
  id: string;
  eventId?: string;
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