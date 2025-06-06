import React, { useEffect } from 'react';
import { Form, Input, InputNumber, Select, DatePicker, Upload } from 'antd';
import type { Rule } from 'antd/lib/form';
import { FormField, FormTemplate } from '../utils/formBuilder';
import { PlusOutlined } from '@ant-design/icons';

const { Option } = Select;

interface DynamicFormProps {
  template: FormTemplate;
  form?: any;
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

  if (field.validation) {
    if (field.validation.maxLength) {
      rules.push({
        max: field.validation.maxLength,
        message: `${field.label} must be at most ${field.validation.maxLength} characters`,
        validateTrigger: ['onBlur', 'onChange']
      });
    }

    if (field.validation.pattern) {
      rules.push({
        pattern: new RegExp(field.validation.pattern),
        message: field.validation.message || `${field.label} is invalid`,
        validateTrigger: ['onBlur', 'onChange']
      });
    }

    if (field.type === 'number') {
      if (field.validation.min !== undefined) {
        rules.push({
          type: 'number',
          min: field.validation.min,
          message: `${field.label} must be at least ${field.validation.min}`,
          validateTrigger: ['onBlur', 'onChange']
        });
      }
      if (field.validation.max !== undefined) {
        rules.push({
          type: 'number',
          max: field.validation.max,
          message: `${field.label} must be at most ${field.validation.max}`,
          validateTrigger: ['onBlur', 'onChange']
        });
      }
    }

    if (field.type === 'email') {
      rules.push({
        type: 'email',
        message: 'Please enter a valid email address',
        validateTrigger: ['onBlur', 'onChange']
      });
    }

    if (field.type === 'phone') {
      rules.push({
        pattern: /^\+?[\d\s-]{10,}$/,
        message: 'Please enter a valid phone number',
        validateTrigger: ['onBlur', 'onChange']
      });
    }
  }

  return rules;
};

const renderField = (field: FormField, disabled: boolean) => {
  const commonProps = {
    className: "w-full",
    disabled: disabled || field.readOnly,
    placeholder: field.placeholder || `Enter ${field.label.toLowerCase()}`,
  };

  switch (field.type) {
    case 'text':
      return <Input {...commonProps} maxLength={field.validation?.maxLength as number} />;
    
    case 'textarea':
      return (
        <Input.TextArea 
          {...commonProps} 
          rows={4}
          maxLength={field.validation?.maxLength as number}
          showCount
        />
      );
    
    case 'number':
      return (
        <InputNumber
          {...commonProps}
          min={field.validation?.min as number}
          max={field.validation?.max as number}
          style={{ width: '100%' }}
        />
      );
    
    case 'select':
      return (
        <Select {...commonProps}>
          {field.options?.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      );
    
    case 'date':
      return <DatePicker {...commonProps} style={{ width: '100%' }} />;
    
    case 'email':
      return <Input type="email" {...commonProps} />;
    
    case 'phone':
      return <Input type="tel" {...commonProps} />;
    
    case 'checkbox':
      return <Input type="checkbox" {...commonProps} />;
    
    case 'radio':
      return <Input type="radio" {...commonProps} />;
    
    default:
      return <Input {...commonProps} />;
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
      className="w-full"
    >
      <div className="grid grid-cols-1 gap-4">
        {template.fields.map((field) => {
          console.log('Rendering field:', field);
          
          const rules = getFieldRules(field);
          console.log(`Validation rules for ${field.id}:`, rules);

          // Determine if field should be full width
          const isFullWidth = field.type === 'textarea' || 
                            field.type === 'select' || 
                            field.type === 'date' ||
                            field.type === 'email' ||
                            field.type === 'phone';

          return (
            <div 
              key={field.id} 
              className={`${isFullWidth ? 'col-span-1' : 'col-span-1 md:col-span-2'}`}
            >
              <Form.Item
                name={field.id}
                label={field.label}
                rules={rules}
                validateTrigger={['onChange', 'onBlur']}
                validateFirst
                preserve={false}
                className="w-full"
              >
                {renderField(field, disabled)}
              </Form.Item>
            </div>
          );
        })}
      </div>
    </Form>
  );
};

export default DynamicForm; 