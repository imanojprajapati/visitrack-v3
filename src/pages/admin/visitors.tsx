import React, { useState, useEffect } from 'react';
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
  UserOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { DatePicker } from '../../utils/date';
import AdminLayout from './layout';
import { useRouter } from 'next/router';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface Event {
  _id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
}

interface Visitor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  eventName: string;
  eventLocation: string;
  eventStartDate: Date;
  eventEndDate: Date;
  status: 'registered' | 'checked_in' | 'checked_out' | 'cancelled';
  checkInTime?: Date;
  checkOutTime?: Date;
  additionalData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface SearchFormValues {
  search: string;
  eventId: string;
  dateRange: [Date, Date];
  status: 'registered' | 'checked_in' | 'checked_out' | 'cancelled';
}

export default function VisitorsPage() {
  const [form] = Form.useForm<SearchFormValues>();
  const [showFilters, setShowFilters] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchVisitors();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      message.error('Failed to load events');
    }
  };

  const fetchVisitors = async () => {
    try {
      const response = await fetch('/api/visitors');
      if (!response.ok) throw new Error('Failed to fetch visitors');
      const data = await response.json();
      console.log('Fetched visitors:', data); // Debug log
      setVisitors(data);
      setFilteredVisitors(data);
    } catch (error) {
      console.error('Error fetching visitors:', error);
      message.error('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Visitor['status']) => {
    switch (status) {
      case 'checked_in':
        return 'green';
      case 'checked_out':
        return 'red';
      case 'registered':
        return 'blue';
      case 'cancelled':
        return 'gray';
      default:
        return 'default';
    }
  };

  const formatStatus = (status: Visitor['status'] | undefined) => {
    if (!status) return 'Unknown';
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const columns: ColumnType<Visitor>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Event',
      dataIndex: 'eventName',
      key: 'eventName',
    },
    {
      title: 'Location',
      dataIndex: 'eventLocation',
      key: 'eventLocation',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Visitor['status']) => (
        <Tag color={getStatusColor(status)}>
          {formatStatus(status)}
        </Tag>
      ),
    },
    {
      title: 'Registration Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Visitor) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedVisitor(record);
              setShowProfile(true);
            }}
            title="View Details"
          />
          <Button
            type="text"
            icon={<QrcodeOutlined />}
            onClick={() => {
              setSelectedVisitor(record);
              setShowQRCode(true);
            }}
            title="Show QR Code"
          />
        </Space>
      ),
    },
  ];

  const handleSearch = (values: SearchFormValues) => {
    let filtered = [...visitors];

    // Filter by search term (name)
    if (values.search) {
      const searchTerm = values.search.toLowerCase();
      filtered = filtered.filter(visitor => 
        visitor.name.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by event
    if (values.eventId) {
      filtered = filtered.filter(visitor => 
        visitor.eventName === values.eventId
      );
    }

    // Filter by date range
    if (values.dateRange) {
      const [startDate, endDate] = values.dateRange;
      filtered = filtered.filter(visitor => {
        const visitorDate = new Date(visitor.createdAt);
        return visitorDate >= startDate && visitorDate <= endDate;
      });
    }

    // Filter by status
    if (values.status) {
      filtered = filtered.filter(visitor => visitor.status === values.status);
    }

    setFilteredVisitors(filtered);
  };

  const handleReset = () => {
    form.resetFields();
    setFilteredVisitors(visitors);
  };

  const handleExport = () => {
    // Implement export functionality
    message.success('Exporting visitor data...');
  };

  const handleImport = () => {
    // Implement import functionality
    message.success('Importing visitor data...');
  };

  const VisitorDetailsModal = () => (
    <Modal
      title="Visitor Details"
      open={showProfile}
      onCancel={() => {
        setShowProfile(false);
        setSelectedVisitor(null);
      }}
      footer={null}
      width={600}
    >
      {selectedVisitor && (
        <div className="space-y-4">
          <Card title="Personal Information" className="mb-4">
            <div className="mb-2">
              <strong>Name:</strong> {selectedVisitor.name}
            </div>
            <div className="mb-2">
              <strong>Email:</strong> {selectedVisitor.email}
            </div>
            <div className="mb-2">
              <strong>Phone:</strong> {selectedVisitor.phone}
            </div>
            <div className="mb-2">
              <strong>Age:</strong> {selectedVisitor.age}
            </div>
          </Card>
          <Card title="Event Information" className="mb-4">
            <div className="mb-2">
              <strong>Event:</strong> {selectedVisitor.eventName}
            </div>
            <div className="mb-2">
              <strong>Location:</strong> {selectedVisitor.eventLocation}
            </div>
            <div className="mb-2">
              <strong>Date:</strong>{' '}
              {selectedVisitor.eventStartDate 
                ? new Date(selectedVisitor.eventStartDate).toLocaleDateString()
                : 'N/A'}
            </div>
            <div className="mb-2">
              <strong>Time:</strong>{' '}
              {selectedVisitor.eventStartDate && selectedVisitor.eventEndDate
                ? `${new Date(selectedVisitor.eventStartDate).toLocaleTimeString()} - ${new Date(selectedVisitor.eventEndDate).toLocaleTimeString()}`
                : 'N/A'}
            </div>
          </Card>
          <Card title="Registration Information">
            <div className="mb-2">
              <strong>Status:</strong>{' '}
              <Tag color={getStatusColor(selectedVisitor.status)}>
                {formatStatus(selectedVisitor.status)}
              </Tag>
            </div>
            <div className="mb-2">
              <strong>Registration Date:</strong>{' '}
              {selectedVisitor.createdAt
                ? new Date(selectedVisitor.createdAt).toLocaleString()
                : 'N/A'}
            </div>
            {selectedVisitor.checkInTime && (
              <div className="mb-2">
                <strong>Check-in Time:</strong>{' '}
                {new Date(selectedVisitor.checkInTime).toLocaleString()}
              </div>
            )}
            {selectedVisitor.checkOutTime && (
              <div className="mb-2">
                <strong>Check-out Time:</strong>{' '}
                {new Date(selectedVisitor.checkOutTime).toLocaleString()}
              </div>
            )}
          </Card>
        </div>
      )}
    </Modal>
  );

  const QRCodeModal = () => {
    const generateVCard = (visitor: Visitor) => {
      // Format dates for vCard
      const formatDate = (date: Date | string) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      // Create vCard string
      const vCard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${visitor.name}`,
        `TEL;TYPE=CELL:${visitor.phone}`,
        `EMAIL:${visitor.email}`,
        `ORG:${visitor.eventName}`,
        `NOTE:Event Location: ${visitor.eventLocation}`,
        `NOTE:Event Date: ${formatDate(visitor.eventStartDate)}`,
        `NOTE:Status: ${formatStatus(visitor.status)}`,
        'END:VCARD'
      ].join('\n');

      return vCard;
    };

    return (
      <Modal
        title="Visitor QR Code"
        open={showQRCode}
        onCancel={() => {
          setShowQRCode(false);
          setSelectedVisitor(null);
        }}
        footer={null}
        width={400}
      >
        {selectedVisitor && (
          <div className="text-center">
            <QRCode
              value={generateVCard(selectedVisitor)}
              size={256}
              className="mx-auto mb-4"
              errorLevel="H"
            />
            <p className="text-sm text-gray-600 mb-2">
              Scan this QR code to save visitor contact information
            </p>
            <p className="text-sm font-medium">
              {selectedVisitor.name}
            </p>
            <p className="text-sm text-gray-600">
              {selectedVisitor.eventName}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              When scanned, this QR code will show the visitor's contact details directly on your phone
            </p>
          </div>
        )}
      </Modal>
    );
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
                    <Input prefix={<SearchOutlined />} placeholder="Search by name" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="eventId" label="Event">
                    <Select placeholder="Select event" allowClear>
                      {events.map(event => (
                        <Option key={event._id} value={event._id}>
                          {event.title}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="status" label="Status">
                    <Select placeholder="Select status" allowClear>
                      <Option value="registered">Registered</Option>
                      <Option value="checked_in">Checked In</Option>
                      <Option value="checked_out">Checked Out</Option>
                      <Option value="cancelled">Cancelled</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="dateRange" label="Date Range">
                    <RangePicker className="w-full" />
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span={24} className="text-right">
                  <Space>
                    <Button onClick={handleReset}>Reset</Button>
                    <Button type="primary" htmlType="submit">
                      Apply Filters
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Form>
          )}

          <Table
            columns={columns}
            dataSource={filteredVisitors}
            rowKey="_id"
            loading={loading}
            pagination={{
              total: filteredVisitors.length,
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} visitors`,
            }}
          />
        </Card>

        <VisitorDetailsModal />
        <QRCodeModal />
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
