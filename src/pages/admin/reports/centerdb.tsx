import React, { useState, useEffect, useRef } from 'react';
import { Table, Input, Button, Space, Card, Typography, message, Modal, Form, Select, Tag, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface CenterData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  createdAt: string;
  updatedAt: string;
}

interface CenterDBResponse {
  centers: CenterData[];
  pagination: {
    current: number;
    total: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

const CenterDBReport: React.FC = () => {
  const [centers, setCenters] = useState<CenterData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    totalRecords: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CenterData | null>(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [form] = Form.useForm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCenters = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search && { search })
      });

      const response = await fetch(`/api/centers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch center data');
      }

      const data: CenterDBResponse = await response.json();
      setCenters(data.centers);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching centers:', error);
      message.error('Failed to load center data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCenters();
  }, []);

  const handleSearch = (value: string) => {
    setSearchText(value);
    fetchCenters(1, value);
  };

  const handleTableChange = (pagination: any) => {
    fetchCenters(pagination.current, searchText);
  };

  const handleEdit = (record: CenterData) => {
    setEditingCenter(record);
    form.setFieldsValue(record);
    setEditModalVisible(true);
  };

  const handleEditSubmit = async (values: any) => {
    try {
      const response = await fetch('/api/centers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: editingCenter?.email,
          ...values
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update center data');
      }

      message.success('Center data updated successfully');
      setEditModalVisible(false);
      setEditingCenter(null);
      form.resetFields();
      fetchCenters(pagination.current, searchText);
    } catch (error) {
      console.error('Error updating center:', error);
      message.error('Failed to update center data');
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/centers/export');
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `centerdb-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      message.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/centers/template');
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'centerdb-template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      message.error('Failed to download template');
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        if (values[index]) {
          // Normalize header names to handle different variations
          const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
          let value: any = values[index];
          
          // Handle date fields - convert to Date object if it's a valid date
          if (normalizedHeader.includes('created') || normalizedHeader.includes('updated')) {
            const dateValue = new Date(value);
            if (!isNaN(dateValue.getTime())) {
              value = dateValue;
            } else {
              // If date is invalid, use current date
              value = new Date();
            }
          }
          
          row[normalizedHeader] = value;
        }
      });
      
      data.push(row);
    }

    return data;
  };

  const handleImport = async (file: File) => {
    try {
      console.log('Starting import process for file:', file.name);
      setImportLoading(true);
      setImportResult(null);

      const text = await file.text();
      console.log('File content length:', text.length);
      
      const data = parseCSV(text);
      console.log('Parsed CSV data:', data);

      if (data.length === 0) {
        message.error('No valid data found in the CSV file');
        return;
      }

      console.log('Sending data to import API...');
      const response = await fetch('/api/centers/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      console.log('Import API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Import API error:', errorText);
        throw new Error(`Failed to import data: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Import API result:', result);
      setImportResult(result.results);
      
      if (result.results.errors.length === 0) {
        message.success(`Import completed successfully! Created: ${result.results.created}, Updated: ${result.results.updated}`);
        fetchCenters(pagination.current, searchText);
      } else {
        message.warning(`Import completed with ${result.results.errors.length} errors. Created: ${result.results.created}, Updated: ${result.results.updated}`);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      message.error(error instanceof Error ? error.message : 'Failed to import data');
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImport(file);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: CenterData, b: CenterData) => a.name.localeCompare(b.name),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string) => <Text copyable>{text}</Text>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => <Text copyable>{text}</Text>,
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      sorter: (a: CenterData, b: CenterData) => a.company.localeCompare(b.company),
    },
    {
      title: 'Location',
      key: 'location',
      render: (record: CenterData) => (
        <div>
          <div>{record.city}, {record.state}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.country} - {record.pincode}
          </Text>
        </div>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
      sorter: (a: CenterData, b: CenterData) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
      sorter: (a: CenterData, b: CenterData) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: CenterData) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-none mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start mb-4">
            <div className="mb-4 lg:mb-0">
              <Title level={3}>Center Database</Title>
              <Text type="secondary">
                Manage and view all center data from visitor registrations
              </Text>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Search
                placeholder="Search by name, email, company, city..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleSearch}
                className="w-full sm:w-80"
              />
              <Button
                icon={<DownloadOutlined />}
                onClick={handleExport}
                loading={loading}
                type="primary"
                className="w-full sm:w-auto"
              >
                Export All
              </Button>
              <Button
                icon={<UploadOutlined />}
                onClick={() => setImportModalVisible(true)}
                className="w-full sm:w-auto"
              >
                Import
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchCenters(pagination.current, searchText)}
                loading={loading}
                className="w-full sm:w-auto"
              >
                Refresh
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <Text>
              Total Records: <Tag color="blue">{pagination.totalRecords}</Tag>
            </Text>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Table
            columns={columns}
            dataSource={centers}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              total: pagination.totalRecords,
              pageSize: 50,
              showSizeChanger: false,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} items`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200, y: 'calc(100vh - 400px)' }}
            size="middle"
          />
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edit Center Data"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingCenter(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Phone is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="company"
            label="Company"
            rules={[{ required: true, message: 'Company is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="city"
            label="City"
            rules={[{ required: true, message: 'City is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="state"
            label="State"
            rules={[{ required: true, message: 'State is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="country"
            label="Country"
            rules={[{ required: true, message: 'Country is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="pincode"
            label="Pincode"
            rules={[{ required: true, message: 'Pincode is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space>
              <Button type="primary" htmlType="submit">
                Update
              </Button>
              <Button onClick={() => {
                setEditModalVisible(false);
                setEditingCenter(null);
                form.resetFields();
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal
        title="Import Center Data"
        open={importModalVisible}
        onCancel={() => {
          setImportModalVisible(false);
          setImportResult(null);
        }}
        footer={null}
        width={600}
      >
        <div className="space-y-4">
          <Alert
            message="Import Instructions"
            description={
              <div>
                <p>Upload a CSV file with the following columns:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>ID (optional - will be auto-generated if missing)</li>
                  <li>Name (required)</li>
                  <li>Email (required)</li>
                  <li>Phone (required)</li>
                  <li>Company (required)</li>
                  <li>City (required)</li>
                  <li>State (required)</li>
                  <li>Country (required)</li>
                  <li>Pincode (required)</li>
                  <li>Created At (optional - current time will be used if missing)</li>
                  <li>Updated At (optional - current time will be used if missing)</li>
                </ul>
                <p className="mt-2 text-sm text-gray-600">
                  Existing records will be updated based on email address. New records will be created.
                  Missing IDs will be auto-generated, and missing dates will use current timestamp.
                </p>
              </div>
            }
            type="info"
            showIcon
          />

          <div className="flex space-x-2">
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleDownloadTemplate}
              style={{ flex: 1 }}
            >
              Download Template
            </Button>
            <div style={{ flex: 1 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
              <Button
                icon={<UploadOutlined />}
                loading={importLoading}
                onClick={handleFileSelect}
                block
                size="large"
              >
                {importLoading ? 'Processing...' : 'Select CSV File'}
              </Button>
            </div>
          </div>

          {importResult && (
            <div className="mt-4">
              <Alert
                message={`Import Results: ${importResult.total} total records processed`}
                description={
                  <div>
                    <p>✅ Created: {importResult.created}</p>
                    <p>🔄 Updated: {importResult.updated}</p>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-600">❌ Errors: {importResult.errors.length}</p>
                        <div className="max-h-40 overflow-y-auto mt-2">
                          {importResult.errors.map((error, index) => (
                            <div key={index} className="text-sm text-red-600 mb-1">
                              Row {error.row}: {error.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                }
                type={importResult.errors.length === 0 ? "success" : "warning"}
                showIcon
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CenterDBReport; 