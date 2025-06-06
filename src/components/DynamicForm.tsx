import React from 'react';
import { Form, Input, InputNumber, Select, DatePicker } from 'antd';
import type { Rule } from 'antd/lib/form';
import { FormField, FormTemplate } from '../utils/formBuilder';

interface DynamicFormProps {
  template: FormTemplate;
  onFinish?: (values: any) => void;
  onFinishFailed?: (errorInfo: any) => void;
  form?: any; // Add form prop to allow external form control
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
    });
  }

  switch (field.type) {
    case 'email':
      rules.push({
        validator: async (_, value) => {
          if (value && !validateEmail(value)) {
            throw new Error('Please enter a valid email address');
          }
        },
      });
      break;

    case 'phone':
      rules.push({
        validator: async (_, value) => {
          if (value && !validatePhone(value)) {
            throw new Error('Please enter a valid phone number');
          }
        },
      });
      break;

    case 'number':
      rules.push({
        type: 'number',
        message: 'Please enter a valid number',
      });
      break;
  }

  if (field.validation) {
    rules.push(...field.validation);
  }

  return rules;
};

const renderField = (field: FormField): React.ReactNode => {
  switch (field.type) {
    case 'text':
      return <Input placeholder={field.placeholder} />;

    case 'textarea':
      return <Input.TextArea rows={4} placeholder={field.placeholder} />;

    case 'number':
      return <InputNumber style={{ width: '100%' }} placeholder={field.placeholder} />;

    case 'email':
      return <Input type="email" placeholder={field.placeholder || 'Enter email'} />;

    case 'phone':
      return <Input placeholder={field.placeholder || 'Enter phone number'} />;

    case 'select':
      return (
        <Select placeholder={field.placeholder}>
          {field.options?.map((option) => (
            <Select.Option key={option.value} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      );

    case 'date':
      return <DatePicker style={{ width: '100%' }} />;

    default:
      return <Input placeholder={field.placeholder} />;
  }
};

export const DynamicForm: React.FC<DynamicFormProps> = ({
  template,
  onFinish,
  onFinishFailed,
  form: externalForm,
}) => {
  // Use external form if provided, otherwise create a new one
  const [internalForm] = Form.useForm();
  const form = externalForm || internalForm;

  // Set initial values when template changes
  React.useEffect(() => {
    const initialValues = template.fields.reduce((acc, field) => {
      if (field.defaultValue !== undefined) {
        acc[field.id] = field.defaultValue;
      }
      return acc;
    }, {} as Record<string, any>);

    form.setFieldsValue(initialValues);
  }, [template, form]);

  return (
    <Form
      form={form}
      layout="vertical"
      name={template.id}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      validateTrigger={['onBlur', 'onChange', 'onSubmit']}
    >
      {template.fields.map((field) => (
        <Form.Item
          key={field.id}
          name={field.id}
          label={field.label}
          rules={getFieldRules(field)}
          validateTrigger={['onBlur', 'onChange', 'onSubmit']}
        >
          {renderField(field)}
        </Form.Item>
      ))}
    </Form>
  );
}; 