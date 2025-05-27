import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Button, Space, Card, Switch, InputNumber, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FormField, FormFieldType, EventForm } from '../../types/form';
import { Event } from '../../types/event';
import { useAppContext } from '../../context/AppContext';

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
    type: 'tel',
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
    placeholder: 'Website',
    readOnly: true
  }
];

interface FormBuilderProps {
  onSave: (formData: { eventId: string; title: string; fields: FormField[] }) => Promise<void>;
  initialData?: EventForm;
}

export default function FormBuilder({ onSave, initialData }: FormBuilderProps) {
  const [form] = Form.useForm();
  const [events, setEvents] = useState<Event[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const { messageApi } = useAppContext();

  useEffect(() => {
    // Fetch upcoming events
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events?status=upcoming');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        setEvents(data);
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card title="Create Event Registration Form" className="mb-6">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="eventId"
            label="Select Event"
            rules={[{ required: true, message: 'Please select an event' }]}
          >
            <Select placeholder="Choose an event">
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
          >
            <Input placeholder="e.g., Registration Form for Tech Conference 2024" />
          </Form.Item>

          <div className="mb-4">
            <h3 className="text-lg font-medium mb-4">Form Fields</h3>
            {fields.map((field, index) => (
              <Card key={field.id} className="mb-4">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div className="flex gap-4">
                    <Form.Item
                      label="Field Type"
                      style={{ flex: 1 }}
                    >
                      <Select
                        value={field.type}
                        onChange={(value) => updateField(field.id, { type: value })}
                        disabled={field.readOnly}
                      >
                        <Option value="text">Text</Option>
                        <Option value="email">Email</Option>
                        <Option value="number">Number</Option>
                        <Option value="tel">Phone</Option>
                        <Option value="date">Date</Option>
                        <Option value="select">Select</Option>
                        <Option value="textarea">Text Area</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      label="Required"
                      style={{ width: 120 }}
                    >
                      <Switch
                        checked={field.required}
                        onChange={(checked) => updateField(field.id, { required: checked })}
                        disabled={field.readOnly}
                      />
                    </Form.Item>

                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeField(field.id)}
                      disabled={field.readOnly}
                    />
                  </div>

                  <Form.Item label="Label">
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Field label"
                      disabled={field.readOnly}
                    />
                  </Form.Item>

                  <Form.Item label="Placeholder">
                    <Input
                      value={field.placeholder}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      placeholder="Placeholder text"
                      disabled={field.readOnly}
                    />
                  </Form.Item>

                  {field.type === 'select' && (
                    <Form.Item label="Options">
                      <Select
                        mode="tags"
                        value={field.options}
                        onChange={(values) => updateField(field.id, { options: values })}
                        placeholder="Enter options"
                        style={{ width: '100%' }}
                        disabled={field.readOnly}
                      />
                    </Form.Item>
                  )}

                  {field.type === 'number' && (
                    <div className="flex gap-4">
                      <Form.Item label="Min Value" style={{ flex: 1 }}>
                        <InputNumber
                          value={field.validation?.min}
                          onChange={(value) => updateField(field.id, {
                            validation: { ...field.validation, min: value || undefined }
                          })}
                          style={{ width: '100%' }}
                          disabled={field.readOnly}
                        />
                      </Form.Item>
                      <Form.Item label="Max Value" style={{ flex: 1 }}>
                        <InputNumber
                          value={field.validation?.max}
                          onChange={(value) => updateField(field.id, {
                            validation: { ...field.validation, max: value || undefined }
                          })}
                          style={{ width: '100%' }}
                          disabled={field.readOnly}
                        />
                      </Form.Item>
                    </div>
                  )}
                </Space>
              </Card>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <Button
              type="dashed"
              onClick={addField}
              icon={<PlusOutlined />}
            >
              Add Field
            </Button>
            <Button type="primary" htmlType="submit">
              Save Form
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
} 