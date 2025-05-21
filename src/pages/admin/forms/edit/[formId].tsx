import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, message } from 'antd';
import AdminLayout from '../../layout';
import FormBuilder from '../../../../components/admin/FormBuilder';
import { EventForm } from '../../../../types/form';

export default function EditFormPage() {
  const router = useRouter();
  const { formId } = router.query;
  const [form, setForm] = useState<EventForm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (formId) {
      console.log('Fetching form with ID:', formId);
      fetchForm();
    }
  }, [formId]);

  const fetchForm = async () => {
    try {
      console.log('Making request to:', `/api/forms/${formId}`);
      const response = await fetch(`/api/forms/${formId}`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch form');
      }
      
      const data = await response.json();
      console.log('Form data received:', data);
      setForm(data);
    } catch (error) {
      console.error('Error fetching form:', error);
      message.error('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async (formData: { eventId: string; title: string; fields: any[] }) => {
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update form');
      }

      message.success('Form updated successfully');
      router.push('/admin/forms');
    } catch (error) {
      console.error('Error updating form:', error);
      message.error('Failed to update form');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">Loading...</div>
      </AdminLayout>
    );
  }

  if (!form) {
    return (
      <AdminLayout>
        <div className="p-6">Form not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <Card title="Edit Form" className="mb-6">
          <FormBuilder
            onSave={handleSaveForm}
            initialData={form}
          />
        </Card>
      </div>
    </AdminLayout>
  );
} 