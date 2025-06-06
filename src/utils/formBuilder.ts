import { Rule } from 'antd/lib/form';

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'checkbox' | 'radio' | 'textarea';
  required?: boolean;
  options?: { label: string; value: string | number }[];
  validation?: Rule[];
  placeholder?: string;
  defaultValue?: any;
  disabled?: boolean;
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  fields: FormField[];
}

export class FormBuilder {
  static createTemplate(
    name: string,
    fields: FormField[],
    description?: string
  ): FormTemplate {
    return {
      id: `form_${Date.now()}`,
      name,
      description,
      fields,
    };
  }

  static createField(
    id: string,
    label: string,
    type: FormField['type'],
    options: Partial<Omit<FormField, 'id' | 'label' | 'type'>> = {}
  ): FormField {
    return {
      id,
      label,
      type,
      ...options,
    };
  }

  static validateTemplate(template: FormTemplate): string[] {
    const errors: string[] = [];

    if (!template.name) {
      errors.push('Template name is required');
    }

    if (!template.fields || !Array.isArray(template.fields)) {
      errors.push('Template must have an array of fields');
      return errors;
    }

    template.fields.forEach((field, index) => {
      if (!field.id) {
        errors.push(`Field at index ${index} must have an id`);
      }

      if (!field.label) {
        errors.push(`Field at index ${index} must have a label`);
      }

      if (!field.type) {
        errors.push(`Field at index ${index} must have a type`);
      }

      if (field.type === 'select' || field.type === 'checkbox' || field.type === 'radio') {
        if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
          errors.push(`Field "${field.label}" must have options for type ${field.type}`);
        }
      }

      if (field.validation && !Array.isArray(field.validation)) {
        errors.push(`Field "${field.label}" validation must be an array of rules`);
      }
    });

    return errors;
  }

  static cloneTemplate(template: FormTemplate): FormTemplate {
    return JSON.parse(JSON.stringify(template));
  }

  static mergeTemplates(templates: FormTemplate[]): FormTemplate {
    if (!templates.length) {
      throw new Error('At least one template is required for merging');
    }

    const mergedFields = templates.reduce((acc, template) => {
      return [...acc, ...template.fields];
    }, [] as FormField[]);

    return {
      id: `merged_${Date.now()}`,
      name: 'Merged Template',
      description: 'Template created by merging multiple templates',
      fields: mergedFields,
    };
  }
} 