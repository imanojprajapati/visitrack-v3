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
  Drawer,
  Typography
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
const { Text } = Typography;

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
  dateRange?: [moment.Moment, moment.Moment];
}

export default function VisitorsPage() {
  const [form] = Form.useForm<SearchFormValues>();
  const [showFilters, setShowFilters] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [allVisitors, setAllVisitors] = useState<Visitor[]>([]); // Store all visitors
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]); // Store cascading filtered results
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  
  // Cascading filters state
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    eventId: '',
    location: '',
  });
  
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    fetchAllVisitors();
    fetchEvents();
    return () => {
      setMounted(false);
    };
  }, []);

  // Apply cascading filters whenever filters change
  useEffect(() => {
    if (mounted) {
      applyCascadingFilters();
    }
  }, [filters, allVisitors, mounted]);

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

  const fetchAllVisitors = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/visitors');
      if (!response.ok) throw new Error('Failed to fetch visitors');
      const data = await response.json();
      console.log('Fetched visitors:', data); // Debug log
      setAllVisitors(data);
      setFilteredVisitors(data); // Initially show all visitors
      setPagination(prev => ({
        ...prev,
        current: 1,
        total: data.length,
      }));
    } catch (error) {
      console.error('Error fetching visitors:', error);
      message.error('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

  // Cascading filter function
  const applyCascadingFilters = () => {
    let filtered = [...allVisitors];

    // Apply filters in sequence (cascading)
    if (filters.name.trim()) {
      filtered = filtered.filter(visitor => 
        visitor.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.email.trim()) {
      filtered = filtered.filter(visitor => 
        visitor.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }

    if (filters.phone.trim()) {
      filtered = filtered.filter(visitor => 
        visitor.phone.includes(filters.phone)
      );
    }

    if (filters.company.trim()) {
      filtered = filtered.filter(visitor => {
        const company = visitor.company || visitor.additionalData?.company?.value || '';
        return company.toLowerCase().includes(filters.company.toLowerCase());
      });
    }

    if (filters.location.trim()) {
      filtered = filtered.filter(visitor => 
        visitor.eventLocation.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.eventId) {
      const selectedEvent = events.find(e => e._id === filters.eventId);
      if (selectedEvent) {
        filtered = filtered.filter(visitor => 
          visitor.eventName === selectedEvent.title
        );
      }
    }

    setFilteredVisitors(filtered);
    setPagination(prev => ({
      ...prev,
      current: 1,
      total: filtered.length,
    }));
  };

  // Get unique values from currently filtered data for dropdown options
  const getUniqueValues = (field: string) => {
    const values = new Set<string>();
    
    filteredVisitors.forEach(visitor => {
      let value = '';
      
      switch (field) {
        case 'location':
          value = visitor.eventLocation || '';
          break;
        case 'phone':
          value = visitor.phone || '';
          break;
        case 'company':
          value = visitor.company || visitor.additionalData?.company?.value || '';
          break;
        case 'eventName':
          value = visitor.eventName || '';
          break;
        default:
          return;
      }
      
      if (value.trim()) {
        values.add(value);
      }
    });
    
    return Array.from(values).sort();
  };

  // Get available events from currently filtered data
  const getAvailableEvents = () => {
    const availableEventNames = new Set(filteredVisitors.map(v => v.eventName));
    return events.filter(event => availableEventNames.has(event.title));
  };

  const handleFilterChange = (key: string, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value || '' }));
  };

  const handleReset = () => {
    setFilters({
      name: '',
      email: '',
      phone: '',
      company: '',
      eventId: '',
      location: '',
    });
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

  // Calculate paginated data from filtered results
  const getPaginatedData = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredVisitors.slice(startIndex, endIndex);
  };

  if (!mounted) return null;

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
                onClick={() => setShowFilters(f => !f)}
                type={showFilters ? 'primary' : 'default'}
                className="show-mobile w-full sm:w-auto"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>
          </div>

          {/* Cascading Filters */}
          {showFilters && (
            <Card 
              bordered={false} 
              className="bg-white shadow-sm mb-6 flex-none"
              bodyStyle={{ padding: '24px' }}
            >
              <div className="mb-6">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <Text className="text-sm font-medium text-gray-700">Cascading Filters</Text>
                        </div>
                        <Text className="text-xs text-gray-500">
                          (Each filter narrows down from previous results)
                        </Text>
                      </div>
                      <div className="text-sm text-gray-600">
                        Showing {filteredVisitors.length} of {allVisitors.length} total visitors
                      </div>
                    </div>
                    <Space>
                      <Button
                        onClick={handleReset}
                      >
                        Reset Filters
                      </Button>
                      <Button
                        type="primary"
                        onClick={fetchAllVisitors}
                        loading={loading}
                      >
                        Refresh
                      </Button>
                    </Space>
                  </div>
                </Space>
              </div>

              {/* How it works explanation */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      <strong>How it works:</strong> Apply filters in sequence. Each new filter only shows options available from the current filtered results.
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Example: Filter by "Name: John" → then "Location" dropdown will only show locations where visitors named John are registered.
                    </p>
                  </div>
                </div>
              </div>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <div className="relative">
                    <Input
                      placeholder="Search by name"
                      value={filters.name}
                      onChange={(e) => handleFilterChange('name', e.target.value)}
                      prefix={<SearchOutlined className="text-gray-400" />}
                      allowClear
                      className="hover:border-blue-400 focus:border-blue-400"
                    />
                    {filters.name && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">1</span>
                      </div>
                    )}
                  </div>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <div className="relative">
                    <Input
                      placeholder="Search by email"
                      value={filters.email}
                      onChange={(e) => handleFilterChange('email', e.target.value)}
                      prefix={<SearchOutlined className="text-gray-400" />}
                      allowClear
                      className="hover:border-blue-400 focus:border-blue-400"
                    />
                    {filters.email && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">2</span>
                      </div>
                    )}
                  </div>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <div className="relative">
                    <Select
                      placeholder="Filter by phone"
                      value={filters.phone || undefined}
                      onChange={(value) => handleFilterChange('phone', value)}
                      allowClear
                      style={{ width: '100%' }}
                      className="hover:border-blue-400 focus:border-blue-400"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                      }
                      dropdownRender={(menu) => (
                        <div>
                          {getUniqueValues('phone').length === 0 ? (
                            <div className="p-2 text-center text-gray-500">
                              No phone numbers available from current filters
                            </div>
                          ) : (
                            menu
                          )}
                        </div>
                      )}
                    >
                      {getUniqueValues('phone').map(phone => (
                        <Select.Option key={phone} value={phone}>
                          {phone}
                        </Select.Option>
                      ))}
                    </Select>
                    {filters.phone && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">3</span>
                      </div>
                    )}
                  </div>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <div className="relative">
                    <Input
                      placeholder="Search by company"
                      value={filters.company}
                      onChange={(e) => handleFilterChange('company', e.target.value)}
                      allowClear
                      className="hover:border-blue-400 focus:border-blue-400"
                    />
                    {filters.company && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">4</span>
                      </div>
                    )}
                  </div>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <div className="relative">
                    <Select
                      placeholder="Filter by location"
                      value={filters.location || undefined}
                      onChange={(value) => handleFilterChange('location', value)}
                      allowClear
                      style={{ width: '100%' }}
                      className="hover:border-blue-400 focus:border-blue-400"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                      }
                      dropdownRender={(menu) => (
                        <div>
                          {getUniqueValues('location').length === 0 ? (
                            <div className="p-2 text-center text-gray-500">
                              No locations available from current filters
                            </div>
                          ) : (
                            menu
                          )}
                        </div>
                      )}
                    >
                      {getUniqueValues('location').map(location => (
                        <Select.Option key={location} value={location}>
                          {location}
                        </Select.Option>
                      ))}
                    </Select>
                    {filters.location && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">5</span>
                      </div>
                    )}
                  </div>
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <div className="relative">
                    <Select
                      placeholder="Filter by event"
                      value={filters.eventId || undefined}
                      onChange={(value) => handleFilterChange('eventId', value)}
                      allowClear
                      style={{ width: '100%' }}
                      suffixIcon={<FilterOutlined className="text-gray-400" />}
                      className="hover:border-blue-400 focus:border-blue-400"
                      showSearch
                      filterOption={(input, option) =>
                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                      }
                      dropdownRender={(menu) => (
                        <div>
                          {getAvailableEvents().length === 0 ? (
                            <div className="p-2 text-center text-gray-500">
                              No events available from current filters
                            </div>
                          ) : (
                            menu
                          )}
                        </div>
                      )}
                    >
                      {getAvailableEvents().map(event => (
                        <Select.Option key={event._id} value={event._id}>
                          {event.title}
                        </Select.Option>
                      ))}
                    </Select>
                    {filters.eventId && (
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">6</span>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
              
              {/* Active Filters Summary & Filter Chain Visualization */}
              {(Object.entries(filters).some(([key, value]) => value)) && (
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <FilterOutlined className="text-blue-600 mr-2" />
                      <Text strong className="text-blue-800">Active Cascading Filters:</Text>
                    </div>
                    <Button 
                      size="small" 
                      type="link" 
                      onClick={handleReset}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  {/* Filter Chain Visualization */}
                  <div className="mb-3">
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <span className="font-medium">Filter Chain:</span>
                      <span className="ml-2 text-xs bg-white px-2 py-1 rounded border">
                        {allVisitors.length} total → {filteredVisitors.length} filtered
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {Object.entries(filters).map(([key, value], index) => {
                        if (value) {
                          const label = key.charAt(0).toUpperCase() + key.slice(1);
                          return (
                            <div key={key} className="flex items-center">
                              {index > 0 && <span className="text-gray-400 mx-1">→</span>}
                              <Tag 
                                color="blue" 
                                closable 
                                onClose={() => handleFilterChange(key, '')}
                                className="text-xs"
                              >
                                {label}: {typeof value === 'string' && value.length > 20 ? value.substring(0, 20) + '...' : value}
                              </Tag>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                  
                  {/* Results Summary */}
                  <div className="text-sm text-gray-700 bg-white p-2 rounded border">
                    <span className="font-medium">Results:</span> Showing {filteredVisitors.length} visitors 
                    {filteredVisitors.length !== allVisitors.length && (
                      <span className="text-gray-500"> (filtered from {allVisitors.length} total)</span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Quick Search Bar */}
          <Card className="admin-card-responsive mb-6">
            <div className="admin-form-responsive">
              <Row gutter={[16, 16]} className="items-end">
                <Col xs={24} sm={16}>
                  <Input.Search
                    placeholder="Quick search by name..."
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                    onSearch={(value) => handleFilterChange('name', value)}
                    className="w-full"
                    enterButton
                  />
                </Col>
                <Col xs={24} sm={8}>
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => setShowFilters(f => !f)}
                    type={showFilters ? 'primary' : 'default'}
                    className="w-full"
                  >
                    {showFilters ? 'Hide Filters' : 'Advanced Filters'}
                  </Button>
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
                pagination={false}
                scroll={{ x: 'max-content' }}
              />
              
              {/* Custom Pagination */}
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.current - 1) * pagination.pageSize) + 1} to {Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total} visitors
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
            title="Cascading Filters"
            placement="right"
            onClose={() => setIsFilterDrawerVisible(false)}
            open={isFilterDrawerVisible}
            className="admin-drawer-responsive"
          >
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Cascading Filters:</strong> Each filter narrows down options from previous results.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Showing {filteredVisitors.length} of {allVisitors.length} visitors
                </p>
              </div>
              
              <div>
                <label className="text-responsive-sm font-medium">Name:</label>
                <Input
                  placeholder="Search by name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                  className="w-full mt-2"
                />
              </div>
              
              <div>
                <label className="text-responsive-sm font-medium">Email:</label>
                <Input
                  placeholder="Search by email"
                  value={filters.email}
                  onChange={(e) => handleFilterChange('email', e.target.value)}
                  className="w-full mt-2"
                />
              </div>
              
              <div>
                <label className="text-responsive-sm font-medium">Phone:</label>
                <Select
                  placeholder="Select Phone"
                  allowClear
                  className="w-full mt-2"
                  value={filters.phone || undefined}
                  onChange={(value) => handleFilterChange('phone', value)}
                  showSearch
                >
                  {getUniqueValues('phone').map(phone => (
                    <Option key={phone} value={phone}>
                      {phone}
                    </Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="text-responsive-sm font-medium">Company:</label>
                <Input
                  placeholder="Search by company"
                  value={filters.company}
                  onChange={(e) => handleFilterChange('company', e.target.value)}
                  className="w-full mt-2"
                />
              </div>
              
              <div>
                <label className="text-responsive-sm font-medium">Location:</label>
                <Select
                  placeholder="Select Location"
                  allowClear
                  className="w-full mt-2"
                  value={filters.location || undefined}
                  onChange={(value) => handleFilterChange('location', value)}
                  showSearch
                >
                  {getUniqueValues('location').map(location => (
                    <Option key={location} value={location}>
                      {location}
                    </Option>
                  ))}
                </Select>
              </div>
              
              <div>
                <label className="text-responsive-sm font-medium">Event:</label>
                <Select
                  placeholder="Select Event"
                  allowClear
                  className="w-full mt-2"
                  value={filters.eventId || undefined}
                  onChange={(value) => handleFilterChange('eventId', value)}
                  showSearch
                >
                  {getAvailableEvents().map(event => (
                    <Option key={event._id} value={event._id}>
                      {event.title}
                    </Option>
                  ))}
                </Select>
              </div>
              
              <div className="pt-4">
                <Button 
                  type="primary" 
                  className="w-full mb-2"
                  onClick={() => {
                    // Filters are applied automatically via useEffect
                    setIsFilterDrawerVisible(false);
                  }}
                >
                  Apply Filters
                </Button>
                <Button 
                  className="w-full"
                  onClick={() => {
                    // Clear all filters
                    handleReset();
                    setIsFilterDrawerVisible(false);
                  }}
                >
                  Clear All Filters
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