import { useEffect } from 'react';
import { Form, Input, InputNumber, DatePicker, Select } from 'antd';
import type { Rule } from 'antd/es/form';
import { FormField, FormFieldOption } from '../types/form';

interface DynamicFormProps {
  fields: FormField[];
  form: any;
}

export default function DynamicForm({ fields, form }: DynamicFormProps) {
  useEffect(() => {
    // Set default values for fields, especially for source field
    fields.forEach(field => {
      if (field.id === 'source' || ((field.readOnly && field.placeholder) || field.defaultValue !== undefined)) {
        form.setFieldValue(field.id, field.defaultValue || field.placeholder);
      }
    });
  }, [fields, form]);

  const renderField = (field: FormField) => {
    const rules: Rule[] = [
      { required: field.required, message: `Please enter ${field.label.toLowerCase()}` }
    ];

    // Add validation rules based on field type
    if (field.type === 'email') {
      rules.push({ type: 'email', message: 'Please enter a valid email' });
    } else if (field.type === 'tel') {
      rules.push({ pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit phone number' });
    }

    // Add custom validation rules if specified
    if (field.validation) {
      if (field.validation.min !== undefined) {
        rules.push({ min: field.validation.min, message: `Minimum value is ${field.validation.min}` });
      }
      if (field.validation.max !== undefined) {
        rules.push({ max: field.validation.max, message: `Maximum value is ${field.validation.max}` });
      }
      if (field.validation.pattern) {
        rules.push({ pattern: new RegExp(field.validation.pattern), message: 'Invalid format' });
      }
    }

    // Set default value for read-only fields or fields with defaultValue
    if ((field.readOnly && field.placeholder) || field.defaultValue !== undefined) {
      form.setFieldValue(field.id, field.defaultValue || field.placeholder);
    }

    const commonProps = {
      key: field.id,
      name: field.id,
      label: field.label,
      rules: rules,
      disabled: field.readOnly,
      initialValue: field.defaultValue || (field.readOnly ? field.placeholder : undefined)
    };

    switch (field.type) {
      case 'text':
        return (
          <Form.Item {...commonProps}>
            <Input 
              placeholder={field.placeholder} 
              defaultValue={field.defaultValue || (field.readOnly ? field.placeholder : undefined)}
              readOnly={field.readOnly}
              style={field.readOnly ? { backgroundColor: '#f5f5f5' } : undefined}
            />
          </Form.Item>
        );

      case 'email':
        return (
          <Form.Item {...commonProps}>
            <Input 
              type="email" 
              placeholder={field.placeholder}
              defaultValue={field.defaultValue || (field.readOnly ? field.placeholder : undefined)}
            />
          </Form.Item>
        );

      case 'number':
        return (
          <Form.Item {...commonProps}>
            <InputNumber
              style={{ width: '100%' }}
              placeholder={field.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
              defaultValue={field.defaultValue || (field.readOnly && field.placeholder ? Number(field.placeholder) : undefined)}
              formatter={value => `${value}`}
              parser={value => {
                const num = value ? Number(value) : 0;
                if (isNaN(num)) return 0;
                if (field.validation?.min !== undefined && num < field.validation.min) {
                  return field.validation.min;
                }
                if (field.validation?.max !== undefined && num > field.validation.max) {
                  return field.validation.max;
                }
                return num;
              }}
            />
          </Form.Item>
        );

      case 'tel':
        return (
          <Form.Item {...commonProps}>
            <Input 
              type="tel" 
              placeholder={field.placeholder}
              defaultValue={field.defaultValue || (field.readOnly ? field.placeholder : undefined)}
            />
          </Form.Item>
        );

      case 'date':
        return (
          <Form.Item {...commonProps}>
            <DatePicker 
              style={{ width: '100%' }}
              disabled={field.readOnly}
            />
          </Form.Item>
        );

      case 'select':
        return (
          <Form.Item {...commonProps}>
            <Select 
              placeholder={field.placeholder}
              disabled={field.readOnly}
              defaultValue={field.defaultValue || (field.readOnly ? field.placeholder : undefined)}
            >
              {field.options?.map((option: FormFieldOption) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {fields.map(field => renderField(field))}
    </div>
  );
} 