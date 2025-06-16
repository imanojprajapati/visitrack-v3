import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import AdminLayout from './layout';
import FormBuilder from '@/components/admin/FormBuilder';
import { EventForm } from '../../types/form';
import { useRouter } from 'next/router';
import AccessControl from '../../components/admin/AccessControl';

// Define the form record type to match the database structure
interface FormRecord {
  _id: string;
  title: string;
  description: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchForms();
    return () => {
      setMounted(false);
    };
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

  const columns: ColumnsType<FormRecord> = [
    {
      title: 'Form Title',
      dataIndex: 'title',
      key: 'title',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: 'Event ID',
      dataIndex: 'eventId',
      key: 'eventId',
      width: 150,
    },
    {
      title: 'Fields',
      dataIndex: 'fields',
      key: 'fields',
      render: (fields: any[]) => fields.length,
      width: 100,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => {
        try {
          return new Date(date).toLocaleDateString();
        } catch (error) {
          return date; // Return as-is if parsing fails
        }
      },
      width: 150,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: FormRecord) => (
        <Space size="small" className="flex-wrap">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => router.push(`/admin/forms/edit/${record._id}`)}
            size="small"
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteForm(record._id)}
            size="small"
          />
        </Space>
      ),
    },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <AccessControl allowedRoles={['admin', 'manager']} pageName="Forms">
      <AdminLayout>
        <div className="w-full max-w-screen px-2 sm:px-4 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold">Forms</h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowFormBuilder(true)}
              className="w-full sm:w-auto"
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
              <div className="overflow-x-auto">
                <Table
                  columns={columns}
                  dataSource={forms}
                  rowKey="_id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} forms`,
                    responsive: true,
                  }}
                  scroll={{ x: 'max-content' }}
                />
              </div>
            </Card>
          )}
        </div>
      </AdminLayout>
    </AccessControl>
  );
}