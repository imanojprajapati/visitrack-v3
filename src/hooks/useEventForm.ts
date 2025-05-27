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

      // Get banner URL from either string or upload response
      const bannerUrl = typeof values.banner === 'string' 
        ? values.banner 
        : (values.banner?.[0] as unknown as (UploadFile & { response?: UploadResponse }))?.response?.url;

      // Format dates and times and create properly typed event input
      const formattedData: CreateEventInput = {
        title: values.title,
        location: values.venue,
        startDate: values.date?.format('YYYY-MM-DD') ?? '',
        endDate: values.endDate?.format('YYYY-MM-DD') ?? '',
        time: values.time,
        endTime: values.endTime,
        status: values.status,
        capacity: values.capacity,
        description: values.description,
        registrationDeadline: values.registrationDeadline?.format('YYYY-MM-DD'),
        banner: bannerUrl
      };

      // Remove venue field as we're using location
      delete formattedData.venue;

      // Validate end time is after start time
      if (values.time && values.endTime) {
        const startTime = dayjs(`2000-01-01 ${values.time}`);
        const endTime = dayjs(`2000-01-01 ${values.endTime}`);
        if (endTime.isBefore(startTime)) {
          messageApi?.error('End time must be after start time');
          return false;
        }
      }

      // Validate end date is after or equal to start date
      if (values.date && values.endDate) {
        if (values.endDate.isBefore(values.date)) {
          messageApi?.error('End date must be after or equal to start date');
          return false;
        }
      }

      const response = await fetch(eventId ? `/api/events/${eventId}` : '/api/events', {
        method: eventId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save event');
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
