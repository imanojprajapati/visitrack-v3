import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Card, Typography, message, Modal, Form, Select, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
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
  const [form] = Form.useForm();

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
          <div className="flex justify-between items-center mb-4">
            <div>
              <Title level={3}>Center Database</Title>
              <Text type="secondary">
                Manage and view all center data from visitor registrations
              </Text>
            </div>
            <Space>
              <Search
                placeholder="Search by name, email, company, city..."
                allowClear
                enterButton={<SearchOutlined />}
                size="large"
                onSearch={handleSearch}
                style={{ width: 300 }}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => fetchCenters(pagination.current, searchText)}
                loading={loading}
              >
                Refresh
              </Button>
            </Space>
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
    </div>
  );
};

export default CenterDBReport; 