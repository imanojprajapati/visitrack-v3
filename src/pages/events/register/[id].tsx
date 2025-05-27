import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Form, Input, Button, Card, Select, DatePicker, InputNumber, message, Spin, Typography, Divider } from 'antd';
import type { Rule } from 'antd/es/form';
import { EventForm, FormField } from '../../../types/form';
import { Event } from '../../../types/event';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';

const { TextArea } = Input;
const { Title, Text } = Typography;

export default function EventRegistrationPage() {
  const router = useRouter();
  const { id } = router.query;
  const [form] = Form.useForm();
  const { messageApi } = useAppContext();
  const [eventForm, setEventForm] = useState<EventForm | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch event details
        const eventResponse = await fetch(`/api/events/${id}`);
        if (!eventResponse.ok) throw new Error('Failed to fetch event');
        const eventData = await eventResponse.json();
        setEvent(eventData);

        // Fetch registration count
        const registrationsResponse = await fetch(`/api/registrations?eventId=${id}`);
        if (registrationsResponse.ok) {
          const registrations = await registrationsResponse.json();
          setRegistrationCount(registrations.length);
        }

        // Fetch form for this event
        const formResponse = await fetch(`/api/forms?eventId=${id}`);
        if (!formResponse.ok) throw new Error('Failed to fetch form');
        const forms = await formResponse.json();
        
        if (forms.length > 0) {
          setEventForm(forms[0]);
        } else {
          messageApi?.error('No registration form found for this event');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        messageApi?.error('Failed to load registration form');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, messageApi]);

  // Add source field to form data when initializing
  useEffect(() => {
    if (eventForm) {
      form.setFieldsValue({
        source: 'Website' // Set default source value
      });
    }
  }, [eventForm, form]);

  const handleSubmit = async (values: any) => {
    if (!event || !eventForm) return;
    
    // Check capacity before submitting
    if (registrationCount >= event.capacity) {
      messageApi?.error('Sorry, this event has reached its maximum capacity');
      return;
    }

    setSubmitting(true);
    try {
      // Format the data to match the expected structure
      const formattedData = eventForm.fields.reduce((acc, field) => {
        acc[field.id] = {
          label: field.label,
          value: values[field.id]
        };
        return acc;
      }, {} as Record<string, { label: string; value: any }>);

      // Add source field
      formattedData.source = {
        label: 'Source',
        value: 'Website'
      };

      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: id,
          formId: eventForm._id,
          data: formattedData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      const result = await response.json();

      // Update local registration count
      setRegistrationCount(prev => prev + 1);

      // Refresh event data to get updated capacity
      const eventResponse = await fetch(`/api/events/${id}`);
      if (eventResponse.ok) {
        const updatedEvent = await eventResponse.json();
        setEvent(updatedEvent);
      }

      messageApi?.success('Registration submitted successfully!');
      
      // Wait a moment before redirecting to show the success message
      setTimeout(() => {
        router.push(`/events/${id}/success`);
      }, 1500);
    } catch (error) {
      console.error('Registration error:', error);
      messageApi?.error(error instanceof Error ? error.message : 'Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  // Add a function to refresh registration count
  const refreshRegistrationCount = async () => {
    if (!id) return;
    try {
      const registrationsResponse = await fetch(`/api/registrations?eventId=${id}`);
      if (registrationsResponse.ok) {
        const registrations = await registrationsResponse.json();
        setRegistrationCount(registrations.length);
      }
    } catch (error) {
      console.error('Error refreshing registration count:', error);
    }
  };

  // Only fetch registration count once when component mounts
  useEffect(() => {
    if (!id) return;
    refreshRegistrationCount();
  }, [id]);

  const getFieldRules = (field: FormField): Rule[] => {
    const rules: Rule[] = [];
    
    if (field.required) {
      rules.push({ required: true, message: `Please enter ${field.label.toLowerCase()}` });
    }

    if (field.type === 'email') {
      rules.push({ type: 'email', message: 'Please enter a valid email address' });
    }

    if (field.type === 'number') {
      rules.push({ type: 'number', message: 'Please enter a valid number' });
    }

    return rules;
  };

  const renderFormField = (field: FormField) => {
    const commonProps = {
      id: field.id,
      name: field.id,
      label: field.label,
      rules: getFieldRules(field),
      tooltip: field.description,
    };

    switch (field.type) {
      case 'text':
        return <Form.Item {...commonProps}>
          <Input placeholder={`Enter ${field.label.toLowerCase()}`} />
        </Form.Item>;

      case 'textarea':
        return <Form.Item {...commonProps}>
          <TextArea rows={4} placeholder={`Enter ${field.label.toLowerCase()}`} />
        </Form.Item>;

      case 'email':
        return <Form.Item {...commonProps}>
          <Input type="email" placeholder="Enter email address" />
        </Form.Item>;

      case 'number':
        return <Form.Item {...commonProps}>
          <InputNumber style={{ width: '100%' }} placeholder={`Enter ${field.label.toLowerCase()}`} />
        </Form.Item>;

      case 'select':
        return <Form.Item {...commonProps}>
          <Select placeholder={`Select ${field.label.toLowerCase()}`}>
            {field.options?.map(option => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>;

      case 'date':
        return <Form.Item {...commonProps}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>;

      default:
        return <Form.Item {...commonProps}>
          <Input placeholder={`Enter ${field.label.toLowerCase()}`} />
        </Form.Item>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <Spin size="large" />
            <Text className="block mt-4">Loading registration form...</Text>
          </div>
        </div>
      </div>
    );
  }

  if (!event || !eventForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Card>
            <div className="text-center">
              <Title level={4}>Event Not Found</Title>
              <Text className="block mt-4">The event or registration form could not be found.</Text>
              <Link href="/events" className="mt-4 inline-block">
                <Button type="primary">Back to Events</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isAtCapacity = registrationCount >= event.capacity;
  const remainingSpots = event.capacity - registrationCount;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/events" className="text-blue-600 hover:text-blue-500">
            ← Back to Events
          </Link>
        </div>

        <Card>
          <div className="mb-8">
            <Title level={2}>{event.title}</Title>
            <Text className="block text-gray-600">{event.description}</Text>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Text strong>Date:</Text>
                <Text className="ml-2">
                  {new Date(event.startDate).toLocaleDateString()}
                </Text>
              </div>
              <div>
                <Text strong>Location:</Text>
                <Text className="ml-2">{event.location}</Text>
              </div>
            </div>
            <div className="mt-4">
              <Text strong>Registration Status:</Text>
              {isAtCapacity ? (
                <Text type="danger">Event is at full capacity ({event.capacity} registrations)</Text>
              ) : (
                <Text type="success">{remainingSpots} spots remaining out of {event.capacity}</Text>
              )}
            </div>
          </div>

          <Divider />

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ source: 'Website' }}
          >
            {/* Hidden source field */}
            <Form.Item name="source" hidden>
              <Input />
            </Form.Item>

            {eventForm.fields.map(field => (
              <div key={field.id} className="mb-6">
                {renderFormField(field)}
              </div>
            ))}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={isAtCapacity}
                block
                size="large"
              >
                {isAtCapacity ? 'Event is Full' : 'Register for Event'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
} 