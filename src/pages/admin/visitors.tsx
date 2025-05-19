import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Upload,
  message,
  Popover,
  QRCode,
  Avatar,
  Row,
  Col
} from 'antd';
import {
  ExportOutlined,
  ImportOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  DownloadOutlined,
  UserOutlined
} from '@ant-design/icons';
import AdminLayout from './layout';

const { RangePicker } = DatePicker;
const { Option } = Select;

export default function VisitorManagement() {
  const [form] = Form.useForm();
  const [showFilters, setShowFilters] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  // Mock data - replace with API calls later
  const visitors = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      company: 'Tech Corp',
      designation: 'Manager',
      event: 'Tech Conference 2024',
      registrationDate: '2024-03-01',
      status: 'checked-in',
      photo: null
    },
    // Add more mock data as needed
  ];

  const columns = [
    {
      title: 'Visitor',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={record.photo} />
          <div>
            <div>{text}</div>
            <div className="text-sm text-gray-500">{record.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Event',
      dataIndex: 'event',
      key: 'event',
    },
    {
      title: 'Registration Date',
      dataIndex: 'registrationDate',
      key: 'registrationDate',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'checked-in' ? 'green' : 'blue'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedVisitor(record);
              setShowProfile(true);
            }}
          />
          <Popover content={<QRCode value={`VISITOR_${record.id}`} />} title="Visitor QR Code">
            <Button type="text" icon={<DownloadOutlined />} />
          </Popover>
        </Space>
      ),
    },
  ];

  const handleSearch = (values) => {
    console.log('Search values:', values);
    // Implement search functionality
  };

  const handleExport = () => {
    // Implement export functionality
    message.success('Exporting visitor data...');
  };

  const handleImport = () => {
    // Implement import functionality
    message.success('Importing visitor data...');
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <Card
          title={<h1 className="text-2xl font-bold">Visitor Management</h1>}
          extra={
            <Space>
              <Button icon={<ExportOutlined />} onClick={handleExport}>
                Export
              </Button>
              <Button icon={<ImportOutlined />} onClick={handleImport}>
                Import
              </Button>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
                type={showFilters ? 'primary' : 'default'}
              >
                Filters
              </Button>
            </Space>
          }
        >
          {showFilters && (
            <Form
              form={form}
              layout="vertical"
              className="mb-6"
              onFinish={handleSearch}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Form.Item name="search" label="Search">
                    <Input prefix={<SearchOutlined />} placeholder="Search visitors" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="event" label="Event">
                    <Select placeholder="Select event">
                      <Option value="tech-conference">Tech Conference 2024</Option>
                      <Option value="expo">Startup Expo 2024</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="dateRange" label="Date Range">
                    <RangePicker />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item label=" " className="mt-7">
                    <Button type="primary" htmlType="submit">
                      Search
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          )}

          <Table
            columns={columns}
            dataSource={visitors}
            rowKey="id"
            pagination={{
              total: visitors.length,
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} visitors`,
            }}
          />
        </Card>

        <Modal
          title="Visitor Profile"
          open={showProfile}
          onCancel={() => setShowProfile(false)}
          footer={null}
          width={600}
        >
          {selectedVisitor && (
            <div>
              <div className="text-center mb-6">
                <Avatar
                  size={96}
                  icon={<UserOutlined />}
                  src={selectedVisitor.photo}
                />
                <h2 className="text-xl font-bold mt-2">{selectedVisitor.name}</h2>
                <p className="text-gray-500">{selectedVisitor.designation}</p>
              </div>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="font-bold">Email</div>
                  <div>{selectedVisitor.email}</div>
                </Col>
                <Col span={12}>
                  <div className="font-bold">Phone</div>
                  <div>{selectedVisitor.phone}</div>
                </Col>
                <Col span={12}>
                  <div className="font-bold">Company</div>
                  <div>{selectedVisitor.company}</div>
                </Col>
                <Col span={12}>
                  <div className="font-bold">Event</div>
                  <div>{selectedVisitor.event}</div>
                </Col>
              </Row>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}

export async function getServerSideProps() {
  return {
    props: {
      isAdminPage: true,
    },
  };
}
