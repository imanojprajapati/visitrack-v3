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
import moment from 'moment';

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
  company?: string;
  age?: number;
  eventId: string;
  eventName: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  status: 'registered' | 'checked_in' | 'checked_out' | 'cancelled';
  checkInTime?: string;
  checkOutTime?: string;
  additionalData: Record<string, { label: string; value: any }>;
  createdAt: string;
  updatedAt: string;
  qrCode?: string;
}

interface SearchFormValues {
  search?: string;
  eventId?: string;
  status?: Visitor['status'];
  dateRange?: [moment.Moment, moment.Moment];
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
  const [mounted, setMounted] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchVisitors();
    fetchEvents();
    return () => {
      setMounted(false);
    };
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
      setLoading(true);
      const response = await fetch('/api/visitors');
      if (!response.ok) throw new Error('Failed to fetch visitors');
      const data = await response.json();
      console.log('Fetched visitors:', data); // Debug log
      setVisitors(data);
      setFilteredVisitors(data);
      setPagination(prev => ({
        ...prev,
        total: data.length,
      }));
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
      render: (name: string, record: Visitor) => name || record.additionalData?.name?.value || '-',
      fixed: 'left',
      width: 200,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record: Visitor) => email || record.additionalData?.email?.value || '-',
      responsive: ['sm'],
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string, record: Visitor) => phone || record.additionalData?.phone?.value || '-',
      responsive: ['sm'],
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      render: (company: string, record: Visitor) => 
        company || record.additionalData?.company?.value || '-',
      responsive: ['md'],
    },
    {
      title: 'Event',
      dataIndex: 'eventName',
      key: 'eventName',
      render: (eventName: string) => eventName || '-',
      responsive: ['md'],
    },
    {
      title: 'Location',
      dataIndex: 'eventLocation',
      key: 'eventLocation',
      render: (location: string) => location || '-',
      responsive: ['md'],
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
      responsive: ['xs'],
    },
    {
      title: 'Registration Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => {
        try {
          if (!date) return '-';
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return '-';
          return dateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).replace(',', '');
        } catch (error) {
          console.error('Error formatting date:', error);
          return '-';
        }
      },
      responsive: ['lg'],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Visitor) => (
        <Space size="small" className="flex-wrap">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedVisitor(record);
              setShowProfile(true);
            }}
            title="View Details"
          />
        </Space>
      ),
      fixed: 'right',
      width: 100,
    },
  ];

  const handleSearch = (values: SearchFormValues) => {
    let filtered = [...visitors];

    // Filter by search term (name, email, or phone)
    if (values.search) {
      const searchTerm = values.search.toLowerCase();
      filtered = filtered.filter(visitor => 
        visitor.name.toLowerCase().includes(searchTerm) ||
        visitor.email.toLowerCase().includes(searchTerm) ||
        visitor.phone.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by event
    if (values.eventId) {
      filtered = filtered.filter(visitor => 
        visitor.eventId === values.eventId
      );
    }

    // Filter by date range
    if (values.dateRange && values.dateRange[0] && values.dateRange[1]) {
      const startDate = values.dateRange[0].startOf('day').toDate();
      const endDate = values.dateRange[1].endOf('day').toDate();
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
    setPagination(prev => ({
      ...prev,
      current: 1,
      total: filtered.length,
    }));
  };

  const handleReset = () => {
    form.resetFields();
    setFilteredVisitors(visitors);
    setPagination(prev => ({
      ...prev,
      current: 1,
      total: visitors.length,
    }));
  };

  // Reset pagination when filtered data changes
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      current: 1,
      total: filteredVisitors.length,
    }));
  }, [filteredVisitors]);

  const handleTableChange = (paginationConfig: any) => {
    console.log('Table pagination changed:', paginationConfig);
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
      total: filteredVisitors.length,
    });
  };

  // Calculate paginated data
  const getPaginatedData = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredVisitors.slice(startIndex, endIndex);
  };

  const handleExport = () => {
    try {
      const headers = [
        'Name',
        'Email',
        'Phone',
        'Company',
        'Event',
        'Location',
        'Status',
        'Registration Date',
        'Check-in Time',
        'Check-out Time',
        ...Object.keys(visitors[0]?.additionalData || {}).map(key => 
          visitors[0]?.additionalData?.[key]?.label || key
        )
      ];

      const csvData = filteredVisitors.map(visitor => [
        visitor.name || visitor.additionalData?.name?.value || '',
        visitor.email || visitor.additionalData?.email?.value || '',
        visitor.phone || visitor.additionalData?.phone?.value || '',
        visitor.company || visitor.additionalData?.company?.value || '',
        visitor.eventName || '',
        visitor.eventLocation || '',
        formatStatus(visitor.status),
        visitor.createdAt ? new Date(visitor.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(',', '') : '',
        visitor.checkInTime ? new Date(visitor.checkInTime).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(',', '') : '',
        visitor.checkOutTime ? new Date(visitor.checkOutTime).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).replace(',', '') : '',
        ...Object.keys(visitor.additionalData || {}).map(key => 
          visitor.additionalData?.[key]?.value || ''
        )
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => 
          typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : cell
        ).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `visitors-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Export completed successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      message.error('Failed to export data');
    }
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
              <strong>Name:</strong> {selectedVisitor.name || selectedVisitor.additionalData?.name?.value || '-'}
            </div>
            <div className="mb-2">
              <strong>Email:</strong> {selectedVisitor.email || selectedVisitor.additionalData?.email?.value || '-'}
            </div>
            <div className="mb-2">
              <strong>Phone:</strong> {selectedVisitor.phone || selectedVisitor.additionalData?.phone?.value || '-'}
            </div>
            {selectedVisitor.age && (
              <div className="mb-2">
                <strong>Age:</strong> {selectedVisitor.age}
              </div>
            )}
          </Card>
          <Card title="Event Information" className="mb-4">
            <div className="mb-2">
              <strong>Event:</strong> {selectedVisitor.eventName || '-'}
            </div>
            <div className="mb-2">
              <strong>Location:</strong> {selectedVisitor.eventLocation || '-'}
            </div>
            <div className="mb-2">
              <strong>Date:</strong>{' '}
              {selectedVisitor.eventStartDate 
                ? new Date(selectedVisitor.eventStartDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : '-'}
            </div>
            <div className="mb-2">
              <strong>Time:</strong>{' '}
              {selectedVisitor.eventStartDate && selectedVisitor.eventEndDate
                ? `${new Date(selectedVisitor.eventStartDate).toLocaleTimeString()} - ${new Date(selectedVisitor.eventEndDate).toLocaleTimeString()}`
                : '-'}
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
                ? new Date(selectedVisitor.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).replace(',', '')
                : '-'}
            </div>
            {selectedVisitor.checkInTime && (
              <div className="mb-2">
                <strong>Check-in Time:</strong>{' '}
                {new Date(selectedVisitor.checkInTime).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }).replace(',', '')}
              </div>
            )}
            {selectedVisitor.checkOutTime && (
              <div className="mb-2">
                <strong>Check-out Time:</strong>{' '}
                {new Date(selectedVisitor.checkOutTime).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }).replace(',', '')}
              </div>
            )}
          </Card>
        </div>
      )}
    </Modal>
  );

  const QRCodeModal = () => {
    if (!selectedVisitor) {
      return null;
    }

    const visitorUrl = `${window.location.origin}/visitor/${selectedVisitor._id}`;

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
        <div className="text-center">
          <QRCode
            value={visitorUrl}
            size={256}
            className="mx-auto mb-4"
            errorLevel="M"
          />
          <p className="text-sm text-gray-600 mb-2">
            Scan this QR code to view visitor details
          </p>
          <p className="text-sm font-medium">
            {selectedVisitor.name}
          </p>
          <p className="text-sm text-gray-600">
            {selectedVisitor.eventName}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Opens visitor details in browser
          </p>
        </div>
      </Modal>
    );
  };

  if (!mounted) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6">
        <Card
          title={<h1 className="text-xl sm:text-2xl font-bold">Visitor Management</h1>}
          extra={
            <Space className="flex-wrap">
              <Button icon={<ExportOutlined />} onClick={handleExport} className="w-full sm:w-auto">
                Export
              </Button>
              <Button icon={<ImportOutlined />} onClick={handleImport} className="w-full sm:w-auto">
                Import
              </Button>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setShowFilters(!showFilters)}
                type={showFilters ? 'primary' : 'default'}
                className="w-full sm:w-auto"
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
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="search" label="Search">
                    <Input prefix={<SearchOutlined />} placeholder="Search by name, email, or phone" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
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
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="status" label="Status">
                    <Select placeholder="Select status" allowClear>
                      <Option value="registered">Registered</Option>
                      <Option value="checked_in">Checked In</Option>
                      <Option value="checked_out">Checked Out</Option>
                      <Option value="cancelled">Cancelled</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <Form.Item name="dateRange" label="Date Range">
                    <RangePicker className="w-full" />
                  </Form.Item>
                </Col>
              </Row>
              <Row>
                <Col span={24} className="text-right">
                  <Space className="flex-wrap justify-end">
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
            dataSource={getPaginatedData()}
            rowKey="_id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} visitors`,
              pageSizeOptions: ['10', '20', '50', '100'],
              showQuickJumper: true,
              responsive: true,
              onChange: handleTableChange,
              onShowSizeChange: (current, size) => {
                console.log('Page size changed:', { current, size });
                setPagination(prev => ({
                  ...prev,
                  pageSize: size,
                  current: 1, // Reset to first page when changing page size
                }));
              }
            }}
            scroll={{ x: 'max-content' }}
            className="overflow-x-auto"
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
