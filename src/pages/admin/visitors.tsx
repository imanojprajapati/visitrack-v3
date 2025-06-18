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
  Col,
  Drawer
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
  QrcodeOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { DatePicker } from '../../utils/date';
import AdminLayout from './layout';
import { useRouter } from 'next/router';
import moment from 'moment';
import dayjs from 'dayjs';

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
  visited?: boolean;
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
  const [exportLoading, setExportLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string | undefined>(undefined);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | undefined>(undefined);
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
      responsive: ['lg'],
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
              setIsDetailModalVisible(true);
            }}
            title="View Details"
          />
        </Space>
      ),
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

  const handleExport = async () => {
    try {
      setExportLoading(true);
      
      // Build query parameters based on current filters
      const params = new URLSearchParams();
      
      if (form.getFieldValue('eventId')) {
        params.append('eventId', form.getFieldValue('eventId'));
      }
      
      if (form.getFieldValue('status')) {
        params.append('status', form.getFieldValue('status'));
      }
      
      if (form.getFieldValue('dateRange')) {
        const [startDate, endDate] = form.getFieldValue('dateRange');
        params.append('startDate', startDate.format('YYYY-MM-DD'));
        params.append('endDate', endDate.format('YYYY-MM-DD'));
      }
      
      // Add format parameter (default to xlsx for better formatting)
      params.append('format', 'xlsx');
      
      // Call the API endpoint
      const response = await fetch(`/api/visitors/export?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Export failed');
      }
      
      // Get the file blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `visitors-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Export completed successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      message.error(error instanceof Error ? error.message : 'Failed to export data');
    } finally {
      setExportLoading(false);
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

  const handleViewDetails = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setIsDetailModalVisible(true);
  };

  const handleEdit = (visitor: Visitor) => {
    // Implement edit functionality
    message.info('Edit functionality coming soon');
  };

  if (!mounted) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="admin-responsive-container">
        <div className="admin-content-wrapper">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-responsive-xl font-bold text-gray-900">Visitors Management</h1>
            <div className="admin-button-group">
              <Button
                icon={<FilterOutlined />}
                onClick={() => setIsFilterDrawerVisible(true)}
                className="show-mobile w-full sm:w-auto"
              >
                Filters
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <Card className="admin-card-responsive mb-6">
            <div className="admin-form-responsive">
              <Row gutter={[16, 16]} className="items-end">
                <Col xs={24} sm={12} md={8}>
                  <Input.Search
                    placeholder="Search visitors..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onSearch={(value) => {
                      setSearchText(value);
                      // Apply search filter
                      const filtered = visitors.filter(visitor => 
                        visitor.name.toLowerCase().includes(value.toLowerCase()) ||
                        visitor.email.toLowerCase().includes(value.toLowerCase()) ||
                        visitor.phone.toLowerCase().includes(value.toLowerCase())
                      );
                      setFilteredVisitors(filtered);
                    }}
                    className="w-full"
                    enterButton
                  />
                </Col>
                <Col xs={24} sm={12} md={8} className="hide-mobile">
                  <Select
                    placeholder="Filter by Event"
                    allowClear
                    className="w-full"
                    onChange={(value) => {
                      if (value) {
                        const filtered = visitors.filter(visitor => visitor.eventId === value);
                        setFilteredVisitors(filtered);
                      } else {
                        setFilteredVisitors(visitors);
                      }
                    }}
                  >
                    {events.map(event => (
                      <Option key={event._id} value={event._id}>
                        {event.title}
                      </Option>
                    ))}
                  </Select>
                </Col>
                <Col xs={24} sm={12} md={8} className="hide-mobile">
                  <Select
                    placeholder="Filter by Status"
                    allowClear
                    className="w-full"
                    onChange={(value) => {
                      if (value) {
                        const filtered = visitors.filter(visitor => visitor.status === value);
                        setFilteredVisitors(filtered);
                      } else {
                        setFilteredVisitors(visitors);
                      }
                    }}
                  >
                    <Option value="registered">Registered</Option>
                    <Option value="checked_in">Checked In</Option>
                    <Option value="checked_out">Checked Out</Option>
                    <Option value="cancelled">Cancelled</Option>
                  </Select>
                </Col>
              </Row>
            </div>
          </Card>

          {/* Visitors Table */}
          <Card className="admin-card-responsive">
            <div className="admin-table-responsive">
              <Table
                columns={columns}
                dataSource={getPaginatedData()}
                rowKey="_id"
                loading={loading}
                pagination={{
                  total: filteredVisitors.length,
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} of ${total} visitors`,
                  responsive: true,
                  onChange: handleTableChange,
                }}
                scroll={{ x: 'max-content' }}
                size="middle"
              />
            </div>
          </Card>

          {/* Detail Modal */}
          <Modal
            title="Visitor Details"
            open={isDetailModalVisible}
            onCancel={() => setIsDetailModalVisible(false)}
            footer={null}
            className="admin-modal-responsive"
          >
            {selectedVisitor && (
              <div className="space-y-4">
                <div>
                  <label className="text-responsive-sm font-medium text-gray-700">Name:</label>
                  <p className="text-responsive-md">{selectedVisitor.name}</p>
                </div>
                <div>
                  <label className="text-responsive-sm font-medium text-gray-700">Email:</label>
                  <p className="text-responsive-md">{selectedVisitor.email}</p>
                </div>
                {selectedVisitor.phone && (
                  <div>
                    <label className="text-responsive-sm font-medium text-gray-700">Phone:</label>
                    <p className="text-responsive-md">{selectedVisitor.phone}</p>
                  </div>
                )}
                {selectedVisitor.company && (
                  <div>
                    <label className="text-responsive-sm font-medium text-gray-700">Company:</label>
                    <p className="text-responsive-md">{selectedVisitor.company}</p>
                  </div>
                )}
                <div>
                  <label className="text-responsive-sm font-medium text-gray-700">Registration Date:</label>
                  <p className="text-responsive-md">
                    {dayjs(selectedVisitor.createdAt).format('YYYY-MM-DD HH:mm')}
                  </p>
                </div>
              </div>
            )}
          </Modal>

          {/* Mobile Filter Drawer */}
          <Drawer
            title="Filters"
            placement="right"
            onClose={() => setIsFilterDrawerVisible(false)}
            open={isFilterDrawerVisible}
            className="admin-drawer-responsive"
          >
            <div className="space-y-4">
              <div>
                <label className="text-responsive-sm font-medium">Event:</label>
                <Select
                  placeholder="Select Event"
                  allowClear
                  className="w-full mt-2"
                  value={selectedEventFilter}
                  onChange={(value) => setSelectedEventFilter(value)}
                >
                  {events.map(event => (
                    <Option key={event._id} value={event._id}>
                      {event.title}
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="text-responsive-sm font-medium">Status:</label>
                <Select
                  placeholder="Select Status"
                  allowClear
                  className="w-full mt-2"
                  value={selectedStatusFilter}
                  onChange={(value) => setSelectedStatusFilter(value)}
                >
                  <Option value="registered">Registered</Option>
                  <Option value="checked_in">Checked In</Option>
                  <Option value="checked_out">Checked Out</Option>
                  <Option value="cancelled">Cancelled</Option>
                </Select>
              </div>
              <div className="pt-4">
                <Button 
                  type="primary" 
                  className="w-full mb-2"
                  onClick={() => {
                    // Apply filters
                    let filtered = [...visitors];
                    
                    // Apply search filter if exists
                    if (searchText) {
                      filtered = filtered.filter(visitor => 
                        visitor.name.toLowerCase().includes(searchText.toLowerCase()) ||
                        visitor.email.toLowerCase().includes(searchText.toLowerCase()) ||
                        visitor.phone.toLowerCase().includes(searchText.toLowerCase())
                      );
                    }
                    
                    // Apply event filter
                    if (selectedEventFilter) {
                      filtered = filtered.filter(visitor => visitor.eventId === selectedEventFilter);
                    }
                    
                    // Apply status filter
                    if (selectedStatusFilter) {
                      filtered = filtered.filter(visitor => visitor.status === selectedStatusFilter);
                    }
                    
                    setFilteredVisitors(filtered);
                    setIsFilterDrawerVisible(false);
                  }}
                >
                  Apply Filters
                </Button>
                <Button 
                  className="w-full"
                  onClick={() => {
                    // Clear filters
                    setSelectedEventFilter(undefined);
                    setSelectedStatusFilter(undefined);
                    setSearchText('');
                    setFilteredVisitors(visitors);
                    setIsFilterDrawerVisible(false);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Drawer>
        </div>
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