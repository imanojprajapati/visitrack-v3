import { useCallback, useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Form } from 'antd';
import type { FormValues } from '../pages/admin/events';
import type { UploadChangeParam, UploadFile } from 'antd/lib/upload';
import { dayjs } from '../utils/date';
import type { CreateEventInput } from '../types/event';

interface UploadResponse {
  url: string;
}

export function useEventForm() {
  const { messageApi } = useAppContext();
  const [form] = Form.useForm<FormValues>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = useCallback((info: UploadChangeParam<UploadFile>) => {
    if (!info.file) return;

    const { status, response } = info.file;
    
    try {
      switch (status) {
        case 'uploading':
          form.setFieldValue('banner', info.fileList);
          break;
        case 'done':
          if (response?.url) {
            const updatedFileList = info.fileList.map(file => ({
              ...file,
              url: file.response?.url || file.url,
              status: 'done'
            }));
            form.setFieldValue('banner', updatedFileList);
            messageApi?.success('Image uploaded successfully');
          }
          break;
        case 'error':
          messageApi?.error('Failed to upload image');
          form.setFieldValue('banner', []);
          break;
        case 'removed':
          form.setFieldValue('banner', []);
          break;
      }
    } catch (error) {
      console.error('Image upload error:', error);
      messageApi?.error('An error occurred while processing the image');
      form.setFieldValue('banner', []);
    }
  }, [form, messageApi]);

  const handleSubmit = useCallback(async (values: FormValues, eventId?: string) => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      const requiredFields = ['title', 'venue', 'date', 'time', 'endTime', 'status', 'capacity'];
      for (const field of requiredFields) {
        if (!values[field as keyof FormValues]) {
          messageApi?.error(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
          return false;
        }
      }

      // Get banner URL from either string or upload response
      const bannerUrl = typeof values.banner === 'string' 
        ? values.banner 
        : (values.banner?.[0] as unknown as (UploadFile & { response?: UploadResponse }))?.response?.url;

      // Format dates and times
      const startDate = values.date?.format('YYYY-MM-DD');
      const endDate = values.endDate?.format('YYYY-MM-DD') || startDate;
      const registrationDeadline = values.registrationDeadline?.format('YYYY-MM-DD');

      // Validate dates
      if (!startDate) {
        messageApi?.error('Start date is required');
        return false;
      }

      // Validate times
      const startTime = dayjs(`2000-01-01 ${values.time}`);
      const endTime = dayjs(`2000-01-01 ${values.endTime}`);
      if (!startTime.isValid() || !endTime.isValid()) {
        messageApi?.error('Please enter valid times in HH:mm format');
        return false;
      }
      if (endTime.isBefore(startTime)) {
        messageApi?.error('End time must be after start time');
        return false;
      }

      // Create properly typed event input
      const formattedData: CreateEventInput = {
        title: values.title.trim(),
        location: values.venue.trim(),
        startDate,
        endDate,
        time: values.time,
        endTime: values.endTime,
        status: values.status,
        capacity: Math.max(1, Number(values.capacity) || 0),
        description: values.description?.trim(),
        registrationDeadline,
        banner: bannerUrl
      };

      // Validate capacity
      const capacity = Math.max(1, Number(values.capacity) || 0);
      if (capacity < 1) {
        messageApi?.error('Capacity must be at least 1');
        return false;
      }
      formattedData.capacity = capacity;

      const response = await fetch(eventId ? `/api/events/${eventId}` : '/api/events', {
        method: eventId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${eventId ? 'update' : 'create'} event`);
      }

      const data = await response.json();
      if (!data._id) {
        throw new Error('Invalid response from server');
      }

      messageApi?.success(`Event ${eventId ? 'updated' : 'created'} successfully`);
      return true;
    } catch (error) {
      console.error('Error saving event:', error);
      messageApi?.error(error instanceof Error ? error.message : 'Failed to save event');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [messageApi]);

  return useMemo(() => ({
    form,
    handleSubmit,
    handleImageUpload,
    isSubmitting,
  }), [form, handleSubmit, handleImageUpload, isSubmitting]);
}
