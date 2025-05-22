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
  const { id } = router.query; // Changed from eventId to id
  const [form] = Form.useForm();
  const { messageApi } = useAppContext();
  const [eventForm, setEventForm] = useState<EventForm | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return; // Changed from eventId to id

      try {
        // Fetch event details
        const eventResponse = await fetch(`/api/events/${id}`); // Changed from eventId to id
        if (!eventResponse.ok) throw new Error('Failed to fetch event');
        const eventData = await eventResponse.json();
        setEvent(eventData);

        // Fetch form for this event
        const formResponse = await fetch(`/api/forms?eventId=${id}`); // Changed from eventId to id
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
  }, [id, messageApi]); // Changed from eventId to id

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
        eventId: id, // Changed from eventId to id
        formId: eventForm?._id,
        data: formattedData,
      });

      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: id, // Changed from eventId to id
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
      router.push('/');
    } catch (error) {
      console.error('Registration error:', error);
      messageApi?.error('Failed to submit registration');
    }
  };

  // ... rest of the component code ...
}; 