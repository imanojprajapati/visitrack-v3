import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Form, Input, Button, Card, Select, DatePicker, InputNumber, message } from 'antd';
import type { Rule } from 'antd/es/form';
import { EventForm, FormField } from '../../../types/form';
import { Event } from '../../../types/event';
import { useAppContext } from '../../../context/AppContext';

const { TextArea } = Input;

export default function EventRegistrationPage() {
  const router = useRouter();
  const { eventId } = router.query;
  const [form] = Form.useForm();
  const { messageApi } = useAppContext();
  const [eventForm, setEventForm] = useState<EventForm | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;

      try {
        // Fetch event details
        const eventResponse = await fetch(`/api/events/${eventId}`);
        if (!eventResponse.ok) throw new Error('Failed to fetch event');
        const eventData = await eventResponse.json();
        setEvent(eventData);

        // Fetch form for this event
        const formResponse = await fetch(`/api/forms?eventId=${eventId}`);
        if (!formResponse.ok) throw new Error('Failed to fetch form');
        const forms = await formResponse.json();
        
        if (forms.length > 0) {
          setEventForm(forms[0]); // Use the first form found for this event
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        messageApi?.error('Failed to load registration form');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, messageApi]);

  const handleSubmit = async (values: any) => {
    try {
      // Format the data to match the desired structure
      const formattedData = eventForm?.fields.reduce((acc, field) => {
        acc[field.id] = {
          label: field.label,
          value: values[field.id]
        };
        return acc;
      }, {} as Record<string, { label: string; value: any }>);

      console.log('Submitting registration with data:', {
        eventId,
        formId: eventForm?._id,
        data: formattedData,
      });

      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          formId: eventForm?._id,
          data: formattedData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Registration error response:', errorData);
        throw new Error(errorData.error || 'Failed to submit registration');
      }

      const result = await response.json();
      console.log('Registration successful:', result);

      messageApi?.success('Registration submitted successfully!');
      // Redirect to home page instead of event page
      router.push('/');
    } catch (error) {
      console.error('Registration error:', error);
      messageApi?.error('Failed to submit registration');
    }
  };

  const renderFormField = (field: FormField) => {
    const commonProps = {
      placeholder: field.placeholder,
      required: field.required,
    };

    switch (field.type) {
      case 'text':
        return <Input {...commonProps} />;
      
      case 'email':
        return <Input type="email" {...commonProps} />;
      
      case 'number':
        return (
          <InputNumber
            style={{ width: '100%' }}
            min={field.validation?.min}
            max={field.validation?.max}
            {...commonProps}
          />
        );
      
      case 'tel':
        return <Input type="tel" {...commonProps} />;
      
      case 'date':
        return <DatePicker style={{ width: '100%' }} />;
      
      case 'select':
        return (
          <Select {...commonProps}>
            {field.options?.map(option => (
              <Select.Option key={option} value={option}>
                {option}
              </Select.Option>
            ))}
          </Select>
        );
      
      case 'textarea':
        return <TextArea rows={4} {...commonProps} />;
      
      default:
        return <Input {...commonProps} />;
    }
  };

  const getFieldRules = (field: FormField): Rule[] => {
    const rules: Rule[] = [];

    if (field.required) {
      rules.push({
        required: true,
        message: `Please enter ${field.label.toLowerCase()}`,
      });
    }

    if (field.type === 'email') {
      rules.push({
        type: 'email',
        message: 'Please enter a valid email address',
      });
    }

    if (field.type === 'number') {
      if (field.validation?.min !== undefined) {
        rules.push({
          type: 'number',
          min: field.validation.min,
          message: `Minimum value is ${field.validation.min}`,
        });
      }
      if (field.validation?.max !== undefined) {
        rules.push({
          type: 'number',
          max: field.validation.max,
          message: `Maximum value is ${field.validation.max}`,
        });
      }
    }

    return rules;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  if (!event) {
    return <div className="p-6 text-center">Event not found</div>;
  }

  if (!eventForm) {
    return <div className="p-6 text-center">Registration form not available for this event</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card title={event.title} className="mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-medium">{eventForm.title}</h2>
          <p className="text-gray-600">
            {event.startDate} at {event.time}
          </p>
          <p className="text-gray-600">{event.venue || event.location}</p>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {eventForm.fields.map((field) => (
            <Form.Item
              key={field.id}
              name={field.id}
              label={field.label}
              rules={getFieldRules(field)}
            >
              {renderFormField(field)}
            </Form.Item>
          ))}

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Register for Event
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 