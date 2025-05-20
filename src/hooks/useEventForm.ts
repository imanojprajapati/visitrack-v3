import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { Form, UploadFile, UploadProps } from 'antd';
import { FormValues } from '../pages/admin/events';
import { useRouter } from 'next/router';
import { UploadChangeParam } from 'antd/lib/upload';

export function useEventForm() {
  const { messageApi } = useAppContext();
  const [form] = Form.useForm();
  const router = useRouter();

  const handleImageUpload = useCallback((info: UploadChangeParam<UploadFile>) => {
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

  const handleSubmit = async (values: FormValues, eventId?: string) => {
    try {
      const bannerUrl = Array.isArray(values.banner) && values.banner.length > 0
        ? values.banner[0]?.response?.url || values.banner[0]?.url
        : values.banner;

      const formattedValues = {
        title: values.title,
        category: 'Conference', // Default category
        description: values.description || '',
        startDate: values.date?.format('YYYY-MM-DD'),
        endDate: values.date?.format('YYYY-MM-DD'), // Same as start date if no end date provided
        time: values.time,
        location: values.venue,
        venue: values.venue, // Add venue field explicitly
        organizer: 'Admin', // Default organizer
        status: values.status,
        capacity: values.capacity,
        banner: bannerUrl, // Use the extracted banner URL
        registrationDeadline: values.registrationDeadline?.format('YYYY-MM-DD'),
      };

      const cleanedValues = Object.fromEntries(
        Object.entries(formattedValues).filter(([_, v]) => v !== null && v !== undefined)
      );
      
      const url = eventId ? `/api/events/${eventId}` : '/api/events';
      const method = eventId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedValues),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${eventId ? 'update' : 'create'} event`);
      }

      messageApi?.success({
        content: `Event ${eventId ? 'updated' : 'created'} successfully`,
        key: 'event-save',
      });

      // Redirect to events list
      router.push('/admin/events');
      
      return true;
    } catch (error) {
      console.error('Event save error:', error);
      messageApi?.error({
        content: `Failed to ${eventId ? 'update' : 'create'} event`,
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
