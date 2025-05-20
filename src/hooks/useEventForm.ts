import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Form, UploadFile, UploadProps } from 'antd';
import { FormValues } from '../pages/admin/events';
import { useRouter } from 'next/router';
import { UploadChangeParam } from 'antd/lib/upload';

export function useEventForm() {
  const { messageApi } = useAppContext();
  const [form] = Form.useForm<FormValues>();
  const router = useRouter();  const handleImageUpload = useCallback((info: UploadChangeParam<UploadFile>) => {
    const { status, response } = info.file;
    
    try {
      switch (status) {
        case 'uploading':
          break;
        case 'done':
          if (response?.url) {
            form.setFieldValue('banner', info.fileList);
            messageApi?.success('Image uploaded successfully');
          }
          break;
        case 'error':
          messageApi?.error('Failed to upload image');
          break;
        case 'removed':
          form.setFieldValue('banner', undefined);
          break;
      }
    } catch (error) {
      console.error('Image upload error:', error);
      messageApi?.error('An error occurred while processing the image');
    }
  }, [form, messageApi]);
  const handleSubmit = async (values: FormValues) => {
    try {
      // Get the banner URL from the fileList if it exists
      const banner = Array.isArray(values.banner) && values.banner.length > 0
        ? values.banner[0]?.response?.url
        : values.banner;

      const formattedValues = {
        title: values.title,
        category: 'Conference', // Default category
        description: values.description || '',
        startDate: values.date?.format('YYYY-MM-DD'),
        endDate: values.date?.format('YYYY-MM-DD'), // Same as start date if no end date provided
        time: values.time,
        location: values.venue,
        organizer: 'Admin', // Default organizer
        status: values.status,
        capacity: values.capacity,
        banner,
        registrationDeadline: values.registrationDeadline?.format('YYYY-MM-DD'),
      };

      const cleanedValues = Object.fromEntries(
        Object.entries(formattedValues).filter(([_, v]) => v !== null)
      );
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedValues),
      });      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      messageApi?.success({
        content: 'Event created successfully',
        key: 'event-save',
      });

      // Redirect to events list
      router.push('/admin/events');
      
      return true;
    } catch (error) {
      messageApi?.error({
        content: 'Failed to create event',
        key: 'event-save',
      });
      return false;
    }
  };

  return {
    form,
    handleSubmit,
    handleImageUpload,
  };
}
