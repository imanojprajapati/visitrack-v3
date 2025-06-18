import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Space, message, Select } from 'antd';
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
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
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
      setPagination(prev => ({
        ...prev,
        total: data.length,
      }));
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

  // Calculate paginated data
  const getPaginatedData = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return forms.slice(startIndex, endIndex);
  };

  if (!mounted) {
    return null;
  }

  return (
    <AccessControl allowedRoles={['admin', 'manager']} pageName="Forms">
      <AdminLayout>
        <div className="admin-responsive-container">
          <div className="admin-content-wrapper">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h1 className="text-responsive-xl font-bold text-gray-900">Forms</h1>
              <div className="admin-button-group">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowFormBuilder(true)}
                  className="w-full sm:w-auto"
                >
                  Create New Form
                </Button>
              </div>
            </div>

            {showFormBuilder ? (
              <Card className="admin-card-responsive mb-6">
                <FormBuilder onSave={handleSaveForm} />
              </Card>
            ) : (
              <Card className="admin-card-responsive">
                <div className="admin-table-responsive">
                  <Table
                    columns={columns}
                    dataSource={getPaginatedData()}
                    rowKey="_id"
                    loading={loading}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                  />
                  
                  {/* Custom Pagination */}
                  <div className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      Showing {((pagination.current - 1) * pagination.pageSize) + 1} to {Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total} forms
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <Select
                        value={pagination.pageSize}
                        onChange={(size) => {
                          setPagination(prev => ({
                            ...prev,
                            pageSize: size,
                            current: 1,
                          }));
                        }}
                        style={{ width: 80 }}
                      >
                        <Select.Option value={10}>10</Select.Option>
                        <Select.Option value={20}>20</Select.Option>
                        <Select.Option value={50}>50</Select.Option>
                        <Select.Option value={100}>100</Select.Option>
                      </Select>
                      <span className="text-sm text-gray-600">per page</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="small"
                        disabled={pagination.current === 1}
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current - 1 }))}
                      >
                        Previous
                      </Button>
                      <span className="px-2 text-sm">
                        Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
                      </span>
                      <Button
                        size="small"
                        disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                        onClick={() => setPagination(prev => ({ ...prev, current: prev.current + 1 }))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </AdminLayout>
    </AccessControl>
  );
}