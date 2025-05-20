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
  Upload,
  message,
  Popover,
  QRCode,
  Avatar,
  Row,
  Col
} from 'antd';
import type { ColumnType } from 'antd/es/table';
import {
  ExportOutlined,
  ImportOutlined,
  SearchOutlined,
  FilterOutlined,
  EyeOutlined,
  DownloadOutlined,
  UserOutlined
} from '@ant-design/icons';
import { DatePicker } from '../../utils/date';
import AdminLayout from './layout';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface Visitor {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  designation: string;
  event: string;
  status: string;
  registrationDate: string;
  photo?: string;
}

interface SearchFormValues {
  name?: string;
  event?: string;
  dateRange?: [string, string];
  status?: string;
}

export default function VisitorManagement() {
  const [form] = Form.useForm<SearchFormValues>();
  const [showFilters, setShowFilters] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  // Mock data - replace with API calls later
  const [visitors] = useState<Visitor[]>([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      company: 'Tech Corp',
      designation: 'Software Engineer',
      event: 'Tech Conference 2024',
      status: 'registered',
      registrationDate: '2024-03-15',
      photo: undefined
    }
  ]);

  const columns: ColumnType<Visitor>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Visitor) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          {text}
        </Space>
      ),
    },
    {
      title: 'Event',
      dataIndex: 'event',
      key: 'event',
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'registered' ? 'blue' : 'green'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Visitor) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedVisitor(record);
              setShowProfile(true);
            }}
          />
          <Popover
            content={
              <QRCode
                value={JSON.stringify(record)}
                size={200}
              />
            }
            title="Visitor QR Code"
            trigger="click"
          >
            <Button type="text">View QR</Button>
          </Popover>
        </Space>
      ),
    },
  ];

  const handleSearch = (values: SearchFormValues) => {
    console.log('Search values:', values);
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
