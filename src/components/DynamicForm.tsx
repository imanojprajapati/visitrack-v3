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

  // Add debug logging
  console.log('DynamicForm template:', template);
  console.log('DynamicForm fields:', template.fields);

  // Set initial values when template changes
  React.useEffect(() => {
    const initialValues = template.fields.reduce((acc, field) => {
      if (field.defaultValue !== undefined) {
        acc[field.id] = field.defaultValue;
      }
      return acc;
    }, {} as Record<string, any>);

    console.log('Setting initial form values:', initialValues);
    form.setFieldsValue(initialValues);
  }, [template, form]);

  const handleFinish = (values: any) => {
    console.log('DynamicForm handleFinish values:', values);
    if (onFinish) {
      // Ensure we have actual values
      const formValues = form.getFieldsValue();
      console.log('DynamicForm form values:', formValues);
      onFinish(formValues);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      name={template.id}
      onFinish={handleFinish}
      onFinishFailed={(errorInfo) => {
        console.log('DynamicForm validation failed:', errorInfo);
        console.log('DynamicForm form values:', form.getFieldsValue());
        onFinishFailed?.(errorInfo);
      }}
      validateTrigger={['onBlur', 'onChange', 'onSubmit']}
      preserve={false}
    >
      {template.fields.map((field) => {
        console.log('Rendering field:', field);
        return (
          <Form.Item
            key={field.id}
            name={field.id}
            label={field.label}
            rules={getFieldRules(field)}
            validateTrigger={['onBlur', 'onChange', 'onSubmit']}
            validateFirst={true}
            preserve={false}
          >
            {renderField(field)}
          </Form.Item>
        );
      })}
    </Form>
  );
}; 