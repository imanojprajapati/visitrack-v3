import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Space, Card, Switch, InputNumber, message } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { FormField, FormFieldType, EventForm } from '../../types/form';
import { Event } from '../../types/event';
import { useAppContext } from '../../context/AppContext';
import { useRouter } from 'next/router';

const { Option } = Select;

// Default form fields
const DEFAULT_FIELDS: FormField[] = [
  {
    id: 'name',
    type: 'text',
    label: 'Full Name',
    required: true,
    placeholder: 'Enter your full name'
  },
  {
    id: 'email',
    type: 'email',
    label: 'Email',
    required: true,
    placeholder: 'Enter your email address'
  },
  {
    id: 'phone',
    type: 'phone',
    label: 'Phone Number',
    required: true,
    placeholder: 'Enter your phone number'
  },
  {
    id: 'company',
    type: 'text',
    label: 'Company',
    required: true,
    placeholder: 'Enter your company name'
  },
  {
    id: 'city',
    type: 'text',
    label: 'City',
    required: true,
    placeholder: 'Enter your city'
  },
  {
    id: 'state',
    type: 'text',
    label: 'State',
    required: true,
    placeholder: 'Enter your state'
  },
  {
    id: 'country',
    type: 'text',
    label: 'Country',
    required: true,
    placeholder: 'Enter your country'
  },
  {
    id: 'pincode',
    type: 'text',
    label: 'Pincode',
    required: true,
    placeholder: 'Enter your pincode'
  },
  {
    id: 'source',
    type: 'text',
    label: 'Source',
    required: true,
    readOnly: true,
    placeholder: 'Website',
    defaultValue: 'Website'
  }
];

interface FormBuilderProps {
  onSave: (formData: { eventId: string; title: string; fields: FormField[] }) => Promise<void>;
  initialData?: EventForm;
}

export default function FormBuilder({ onSave, initialData }: FormBuilderProps) {
  const router = useRouter();
  const [form] = Form.useForm();
  const [events, setEvents] = useState<Event[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const { messageApi } = useAppContext();

  useEffect(() => {
    // Fetch all events for admin form builder
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events?admin=true');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        console.log('Fetched events for form builder:', data);
        // Handle new API response format with events and pagination
        const eventsData = data.events || data;
        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
        messageApi?.error('Failed to load events');
      }
    };

    fetchEvents();
  }, [messageApi]);

  // Initialize form with initialData if provided, otherwise use default fields
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue({
        eventId: initialData.eventId,
        title: initialData.title,
      });
      setFields(initialData.fields);
    } else {
      setFields(DEFAULT_FIELDS);
    }
  }, [initialData, form]);

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
    };
    setFields([...fields, newField]);
  };

  const removeField = (id: string) => {
    // Don't allow removing default fields
    if (DEFAULT_FIELDS.some(field => field.id === id)) {
      messageApi?.warning('Default fields cannot be removed');
      return;
    }
    setFields(fields.filter(field => field.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    // Don't allow updating certain properties of default fields
    if (DEFAULT_FIELDS.some(field => field.id === id)) {
      if (updates.readOnly !== undefined || updates.type !== undefined) {
        messageApi?.warning('Cannot modify default field properties');
        return;
      }
    }
    setFields(fields.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const handleSubmit = async (values: any) => {
    try {
      await onSave({
        eventId: values.eventId,
        title: values.title,
        fields: fields,
      });
      messageApi?.success('Form saved successfully');
      form.resetFields();
      setFields(DEFAULT_FIELDS);
    } catch (error) {
      console.error('Error saving form:', error);
      messageApi?.error('Failed to save form');
    }
  };

  const handleBack = () => {
    router.push('/admin/forms');
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const temp = newFields[index];
    if (direction === 'up') {
      newFields[index] = newFields[index - 1];
      newFields[index - 1] = temp;
    } else {
      newFields[index] = newFields[index + 1];
      newFields[index + 1] = temp;
    }
    setFields(newFields);
  };

  const addOption = (fieldId: string) => {
    const newOption = { label: '', value: '' };
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, options: [...(field.options || []), newOption] } : field
    ));
  };

  const updateOption = (fieldId: string, optionIndex: number, property: 'label' | 'value', value: string) => {
    setFields(fields.map(field => 
      field.id === fieldId ? {
        ...field,
        options: field.options?.map((option, index) => 
          index === optionIndex ? { ...option, [property]: value } : option
        )
      } : field
    ));
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    setFields(fields.map(field => 
      field.id === fieldId ? {
        ...field,
        options: field.options?.filter((_, index) => index !== optionIndex)
      } : field
    ));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <Button 
          type="link" 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          className="p-0"
        >
          Back
        </Button>
        <h2 className="text-2xl font-semibold m-0">Create Event Registration Form</h2>
      </div>

      <Card className="mb-6">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="w-full"
        >
          <div className="grid grid-cols-1 gap-6">
            <Form.Item
              name="eventId"
              label="Select Event"
              rules={[{ required: true, message: 'Please select an event' }]}
              className="w-full"
            >
              <Select placeholder="Choose an event" className="w-full">
                {events.map(event => (
                  <Option key={event._id} value={event._id}>
                    {event.title} ({event.startDate})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="title"
              label="Form Title"
              rules={[{ required: true, message: 'Please enter form title' }]}
              className="w-full"
            >
              <Input placeholder="e.g., Registration Form for Tech Conference 2024" className="w-full" />
            </Form.Item>

            <div className="space-y-6">
              {fields.map((field, index) => (
                <Card 
                  key={field.id} 
                  className="w-full"
                  title={
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="text-lg font-medium">Field {index + 1}: {field.label}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="text"
                          icon={<ArrowUpOutlined />}
                          onClick={() => moveField(index, 'up')}
                          disabled={index === 0}
                        />
                        <Button
                          type="text"
                          icon={<ArrowDownOutlined />}
                          onClick={() => moveField(index, 'down')}
                          disabled={index === fields.length - 1}
                        />
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeField(field.id)}
                        />
                      </div>
                    </div>
                  }
                >
                  <Space direction="vertical" className="w-full" size="large">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item label="Field Label" className="w-full">
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="w-full"
                        />
                      </Form.Item>
                      <Form.Item label="Field Type" className="w-full">
                        <Select
                          value={field.type}
                          onChange={(value) => updateField(field.id, { type: value })}
                          className="w-full"
                        >
                          <Option value="text">Text</Option>
                          <Option value="textarea">Text Area</Option>
                          <Option value="number">Number</Option>
                          <Option value="select">Select</Option>
                          <Option value="date">Date</Option>
                          <Option value="email">Email</Option>
                          <Option value="phone">Phone</Option>
                          <Option value="checkbox">Checkbox</Option>
                          <Option value="radio">Radio</Option>
                        </Select>
                      </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item label="Placeholder" className="w-full">
                        <Input
                          value={field.placeholder}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          className="w-full"
                        />
                      </Form.Item>
                      <Form.Item label="Default Value" className="w-full">
                        <Input
                          value={field.defaultValue}
                          onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                          className="w-full"
                        />
                      </Form.Item>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <Form.Item label="Required" className="mb-0">
                        <Switch
                          checked={field.required}
                          onChange={(checked) => updateField(field.id, { required: checked })}
                        />
                      </Form.Item>
                      <Form.Item label="Read Only" className="mb-0">
                        <Switch
                          checked={field.readOnly}
                          onChange={(checked) => updateField(field.id, { readOnly: checked })}
                        />
                      </Form.Item>
                    </div>

                    {field.type === 'select' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-medium">Options</h4>
                          <Button
                            type="dashed"
                            onClick={() => addOption(field.id)}
                            icon={<PlusOutlined />}
                          >
                            Add Option
                          </Button>
                        </div>
                        {field.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-4 items-start">
                            <Input
                              placeholder="Label"
                              value={option.label}
                              onChange={(e) => updateOption(field.id, optionIndex, 'label', e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              placeholder="Value"
                              value={option.value}
                              onChange={(e) => updateOption(field.id, optionIndex, 'value', e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeOption(field.id, optionIndex)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {field.type === 'number' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item label="Min Value" className="w-full">
                          <InputNumber
                            value={field.validation?.min}
                            onChange={(value) => updateField(field.id, {
                              validation: { ...field.validation, min: value || undefined }
                            })}
                            className="w-full"
                          />
                        </Form.Item>
                        <Form.Item label="Max Value" className="w-full">
                          <InputNumber
                            value={field.validation?.max}
                            onChange={(value) => updateField(field.id, {
                              validation: { ...field.validation, max: value || undefined }
                            })}
                            className="w-full"
                          />
                        </Form.Item>
                      </div>
                    )}
                  </Space>
                </Card>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
              <Button
                type="dashed"
                onClick={addField}
                icon={<PlusOutlined />}
                className="w-full sm:w-auto"
              >
                Add Field
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                className="w-full sm:w-auto"
              >
                Save Form
              </Button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
} 