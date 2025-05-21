import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import AdminLayout from './layout';
import FormBuilder from '../../components/admin/FormBuilder';
import { EventForm } from '../../types/form';
import { useRouter } from 'next/router';

export default function FormsPage() {
  const [forms, setForms] = useState<EventForm[]>([]);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await fetch('/api/forms');
      if (!response.ok) throw new Error('Failed to fetch forms');
      const data = await response.json();
      setForms(data);
    } catch (error) {
      console.error('Error fetching forms:', error);
      message.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async (formData: { eventId: string; title: string; fields: any[] }) => {
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save form');
      }

      message.success('Form saved successfully');
      setShowFormBuilder(false);
      fetchForms();
    } catch (error) {
      console.error('Error saving form:', error);
      message.error('Failed to save form');
    }
  };

  const columns = [
    {
      title: 'Form Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Event ID',
      dataIndex: 'eventId',
      key: 'eventId',
    },
    {
      title: 'Fields',
      dataIndex: 'fields',
      key: 'fields',
      render: (fields: any[]) => fields.length,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: EventForm) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => router.push(`/admin/forms/edit/${record.id}`)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteForm(record.id)}
          />
        </Space>
      ),
    },
  ];

  const handleDeleteForm = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete form');

      message.success('Form deleted successfully');
      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      message.error('Failed to delete form');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Forms</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowFormBuilder(true)}
          >
            Create New Form
          </Button>
        </div>

        {showFormBuilder ? (
          <Card className="mb-6">
            <FormBuilder onSave={handleSaveForm} />
          </Card>
        ) : (
          <Card>
            <Table
              columns={columns}
              dataSource={forms}
              rowKey="id"
              loading={loading}
            />
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
