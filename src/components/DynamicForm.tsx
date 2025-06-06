import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, DatePicker } from 'antd';
import type { Rule } from 'antd/lib/form';
import { FormField, FormTemplate } from '../utils/formBuilder';

interface DynamicFormProps {
  template: FormTemplate;
  form?: any; // Add form prop to allow external form control
  onFinish?: (values: any) => void;
  initialValues?: Record<string, any>;
  disabled?: boolean;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
};

const getFieldRules = (field: FormField): Rule[] => {
  const rules: Rule[] = [];

  if (field.required) {
    rules.push({
      required: true,
      message: `${field.label} is required`,
      validateTrigger: ['onBlur', 'onChange', 'onSubmit']
    });
  }

  switch (field.type) {
    case 'email':
      rules.push({
        validator: async (_, value) => {
          if (!value) return; // Skip validation if empty (required rule will handle it)
          if (!validateEmail(value)) {
            throw new Error('Please enter a valid email address');
          }
        },
        validateTrigger: ['onBlur', 'onChange', 'onSubmit']
      });
      break;

    case 'phone':
      rules.push({
        validator: async (_, value) => {
          if (!value) return; // Skip validation if empty (required rule will handle it)
          if (!validatePhone(value)) {
            throw new Error('Please enter a valid phone number');
          }
        },
        validateTrigger: ['onBlur', 'onChange', 'onSubmit']
      });
      break;

    case 'number':
      rules.push({
        type: 'number',
        message: 'Please enter a valid number',
        validateTrigger: ['onBlur', 'onChange', 'onSubmit']
      });
      break;
  }

  if (field.validation) {
    rules.push(...field.validation.map(rule => ({
      ...rule,
      validateTrigger: ['onBlur', 'onChange', 'onSubmit']
    })));
  }

  console.log(`Field rules for ${field.id}:`, rules);
  return rules;
};

const renderField = (field: FormField, disabled?: boolean): React.ReactNode => {
  switch (field.type) {
    case 'text':
      return <Input placeholder={field.placeholder} disabled={disabled} />;
    case 'textarea':
      return <Input.TextArea rows={4} placeholder={field.placeholder} disabled={disabled} />;
    case 'number':
      return <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} disabled={disabled} />;
    case 'email':
      return <Input type="email" placeholder={field.placeholder || 'Enter email'} disabled={disabled} />;
    case 'phone':
      return <Input placeholder={field.placeholder || 'Enter phone number'} disabled={disabled} />;
    case 'select':
      return (
        <Select placeholder={field.placeholder} disabled={disabled}>
          {field.options?.map((option) => (
            <Select.Option key={option.value} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      );
    case 'date':
      return <DatePicker style={{ width: '100%' }} disabled={disabled} />;
    default:
      return <Input placeholder={field.placeholder} disabled={disabled} />;
  }
};

const DynamicForm: React.FC<DynamicFormProps> = ({
  template,
  form: externalForm,
  onFinish,
  initialValues = {},
  disabled = false
}) => {
  // Use external form if provided, otherwise create a new one
  const [internalForm] = Form.useForm();
  const form = externalForm || internalForm;

  // Debug logging
  useEffect(() => {
    console.log('DynamicForm template:', template);
    console.log('DynamicForm fields:', template.fields);
    console.log('DynamicForm initialValues:', initialValues);
  }, [template, initialValues]);

  // Set initial values when template changes
  useEffect(() => {
    if (template && template.fields) {
      const values = template.fields.reduce((acc, field) => {
        // Only set initial value if it exists and is not empty
        if (initialValues[field.id] !== undefined && initialValues[field.id] !== '') {
          acc[field.id] = initialValues[field.id];
        }
        return acc;
      }, {} as Record<string, any>);

      console.log('Setting initial form values:', values);
      form.setFieldsValue(values);
    }
  }, [template, initialValues, form]);

  const handleFinish = (values: any) => {
    console.log('DynamicForm onFinish values:', values);
    
    // Validate that we have actual values
    if (!values || Object.keys(values).length === 0) {
      console.error('No form values provided');
      return;
    }

    // Validate required fields
    const missingFields = template.fields
      .filter(field => field.required)
      .filter(field => !values[field.id] || values[field.id].trim() === '');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return;
    }

    if (onFinish) {
      onFinish(values);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      preserve={false}
      validateTrigger={['onChange', 'onBlur']}
    >
      {template.fields.map((field) => {
        console.log('Rendering field:', field);
        
        const rules = getFieldRules(field);
        console.log(`Validation rules for ${field.id}:`, rules);

        return (
          <Form.Item
            key={field.id}
            name={field.id}
            label={field.label}
            rules={rules}
            validateTrigger={['onChange', 'onBlur']}
            validateFirst
            preserve={false}
          >
            {renderField(field, disabled)}
          </Form.Item>
        );
      })}
    </Form>
  );
};

export default DynamicForm; 