import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Space, Button, DatePicker, message, Row, Col, Typography, Tag } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined, ImportOutlined } from '@ant-design/icons';
import { Event } from '../../../types/event';
import ImportRegistrationsModal from '../../../components/ImportRegistrationsModal';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

interface Visitor {
  _id: string;
  registrationId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  eventName: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate: string;
  status: string;
  createdAt: string;
  additionalData: Record<string, { label: string; value: any }>;
}

export default function RegistrationReport() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    eventId: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    source: '',
    location: '',
    status: '',
    dateRange: null as [string, string] | null,
  });

  useEffect(() => {
    setMounted(true);
    fetchEvents();
    fetchVisitors();
    return () => {
      setMounted(false);
    };
  }, []);

  // Auto-apply filters when they change (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (mounted) {
        fetchVisitors();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [filters, mounted]);

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
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // Add all filters to query parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'dateRange') {
          if (typeof value === 'string' && value.trim() !== '') {
            queryParams.append(key, value.trim());
          }
        }
      });
      
      // Handle date range filter
      if (filters.dateRange) {
        queryParams.append('startDate', filters.dateRange[0]);
        queryParams.append('endDate', filters.dateRange[1]);
      }

      const response = await fetch(`/api/visitors?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch visitors');
      const data = await response.json();
      
      // Debug: Check first visitor's event date data
      if (data.length > 0) {
        console.log('First visitor event data:', {
          eventStartDate: data[0].eventStartDate,
          eventEndDate: data[0].eventEndDate,
          eventName: data[0].eventName
        });
      }
      
      setVisitors(data);
      setPagination(prev => ({
        ...prev,
        current: 1, // Reset to first page when filtering
        total: data.length,
      }));
    } catch (error) {
      console.error('Error fetching visitors:', error);
      message.error('Failed to load visitor data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value || '' }));
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setFilters(prev => ({
        ...prev,
        dateRange: [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
      }));
    } else {
      setFilters(prev => ({ ...prev, dateRange: null }));
    }
  };

  const handleReset = () => {
    setFilters({
      name: '',
      email: '',
      phone: '',
      company: '',
      eventId: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      source: '',
      location: '',
      status: '',
      dateRange: null,
    });
    // Fetch all visitors after reset
    setTimeout(() => fetchVisitors(), 100);
  };

  // Calculate paginated data
  const getPaginatedData = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return visitors.slice(startIndex, endIndex);
  };

  const allAdditionalKeys = Array.from(new Set(visitors.flatMap(v => Object.keys(v.additionalData || {}))));

  const additionalDataColumns = allAdditionalKeys.map(key => ({
    title: visitors[0]?.additionalData?.[key]?.label || key,
    dataIndex: ['additionalData', key, 'value'],
    key,
    render: (_: any, record: Visitor) => record.additionalData?.[key]?.value || '-',
  }));

  const columns = [
    {
      title: 'Full Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Visitor) => name || record.additionalData?.name?.value || '-',
      width: 150,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record: Visitor) => email || record.additionalData?.email?.value || '-',
      width: 200,
    },
    {
      title: 'Phone Number',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string, record: Visitor) => phone || record.additionalData?.phone?.value || '-',
      width: 130,
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      render: (company: string, record: Visitor) => 
        company || record.additionalData?.company?.value || '-',
      width: 150,
    },
    {
      title: 'City',
      key: 'city',
      render: (_: any, record: Visitor) => record.additionalData?.city?.value || '-',
      width: 100,
    },
    {
      title: 'State',
      key: 'state',
      render: (_: any, record: Visitor) => record.additionalData?.state?.value || '-',
      width: 100,
    },
    {
      title: 'Country',
      key: 'country',
      render: (_: any, record: Visitor) => record.additionalData?.country?.value || '-',
      width: 100,
    },
    {
      title: 'Pincode',
      key: 'pincode',
      render: (_: any, record: Visitor) => record.additionalData?.pinCode?.value || record.additionalData?.pincode?.value || '-',
      width: 100,
    },
    {
      title: 'Source',
      key: 'source',
      render: (_: any, record: Visitor) => record.additionalData?.source?.value || '-',
      width: 100,
    },
    {
      title: 'Location',
      dataIndex: 'eventLocation',
      key: 'eventLocation',
      render: (location: string) => location || '-',
      width: 150,
    },
    {
      title: 'Event',
      dataIndex: 'eventName',
      key: 'eventName',
      render: (eventName: string) => eventName || '-',
      width: 150,
    },
    {
      title: 'Event Date',
      dataIndex: 'eventStartDate',
      key: 'eventStartDate',
      render: (date: string, record: Visitor) => {
        try {
          const dateToUse = date || record.eventEndDate;
          if (!dateToUse) return '-';
          
          // Handle ISO date format (2024-01-15T00:00:00.000Z)
          const dateObj = new Date(dateToUse);
          if (!isNaN(dateObj.getTime())) {
            return dateObj.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
          }
          
          // Fallback: try to parse DD-MM-YY format
          const [day, month, year] = dateToUse.split('-');
          if (day && month && year) {
            const fullYear = Number(year) < 50 ? '20' + year : '19' + year;
            const fallbackDateObj = new Date(`${fullYear}-${month}-${day}`);
            if (!isNaN(fallbackDateObj.getTime())) {
              return fallbackDateObj.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });
            }
          }
          
          return dateToUse || '-';
        } catch (error) {
          console.error('Error formatting event date:', error);
          const dateToUse = date || record.eventEndDate;
          return dateToUse || '-';
        }
      },
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span className={`capitalize ${
          status === 'registered' ? 'text-green-600' :
          status === 'Visited' ? 'text-red-600' :
          'text-black-600'
        }`}>
          {status.replace('_', ' ')}
        </span>
      ),
      width: 120,
    },
    {
      title: 'Registration Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => {
        try {
          if (!date) return '-';
          
          // Handle ISO date format (2025-06-05T18:30:00.000Z)
          const dateObj = new Date(date);
          if (!isNaN(dateObj.getTime())) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            return `${day}/${month}/${year}`;
          }
          
          // Fallback: try to parse DD-MM-YY format
          const [day, month, year] = date.split('-');
          if (day && month && year) {
            const fullYear = Number(year) < 50 ? '20' + year : '19' + year;
            const fallbackDateObj = new Date(`${fullYear}-${month}-${day}`);
            if (!isNaN(fallbackDateObj.getTime())) {
              return `${day}/${month}/${fullYear}`;
            }
          }
          
          return date || '-';
        } catch (error) {
          console.error('Error formatting registration date:', error);
          return date || '-';
        }
      },
      width: 140,
    },
  ];

  const handleExport = () => {
    const headers = [
      'Full Name',
      'Email',
      'Phone Number',
      'Company',
      'City',
      'State',
      'Country',
      'Pincode',
      'Source',
      'Location',
      'Event',
      'Event Date',
      'Status',
      'Registration Date'
    ];

    const csvData = visitors.map(visitor => {
      // Format event date
      let eventDate = '-';
      try {
        const dateToUse = visitor.eventStartDate || visitor.eventEndDate;
        if (dateToUse) {
          // Handle ISO date format (2024-01-15T00:00:00.000Z)
          const dateObj = new Date(dateToUse);
          if (!isNaN(dateObj.getTime())) {
            eventDate = dateObj.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });
          } else {
            // Fallback: try to parse DD-MM-YY format
            const [day, month, year] = dateToUse.split('-');
            if (day && month && year) {
              const fullYear = Number(year) < 50 ? '20' + year : '19' + year;
              const fallbackDateObj = new Date(`${fullYear}-${month}-${day}`);
              if (!isNaN(fallbackDateObj.getTime())) {
                eventDate = fallbackDateObj.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error formatting event date:', error);
        eventDate = visitor.eventStartDate || '-';
      }

      // Format registration date
      let registrationDate = '-';
      try {
        if (visitor.createdAt) {
          // Handle ISO date format (2025-06-05T18:30:00.000Z)
          const dateObj = new Date(visitor.createdAt);
          if (!isNaN(dateObj.getTime())) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            registrationDate = `${day}/${month}/${year}`;
          } else {
            // Fallback: try to parse DD-MM-YY format
            const [day, month, year] = visitor.createdAt.split('-');
            if (day && month && year) {
              const fullYear = Number(year) < 50 ? '20' + year : '19' + year;
              const fallbackDateObj = new Date(`${fullYear}-${month}-${day}`);
              if (!isNaN(fallbackDateObj.getTime())) {
                registrationDate = `${day}/${month}/${fullYear}`;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error formatting registration date:', error);
        registrationDate = visitor.createdAt || '-';
      }

      return [
        visitor.name || visitor.additionalData?.name?.value || '',
        visitor.email || visitor.additionalData?.email?.value || '',
        visitor.phone || visitor.additionalData?.phone?.value || '',
        visitor.company || visitor.additionalData?.company?.value || '',
        visitor.additionalData?.city?.value || '',
        visitor.additionalData?.state?.value || '',
        visitor.additionalData?.country?.value || '',
        visitor.additionalData?.pinCode?.value || visitor.additionalData?.pincode?.value || '',
        visitor.additionalData?.source?.value || '',
        visitor.eventLocation || '',
        visitor.eventName || '',
        eventDate,
        visitor.status.replace('_', ' '),
        registrationDate
      ];
    });

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
    link.setAttribute('download', `registration-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Export completed successfully');
  };

  const handleImportSuccess = () => {
    setShowImportModal(false);
    fetchVisitors(); // Refresh the data after import
    message.success('Registrations imported successfully!');
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
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
                  <Title level={4} className="m-0">Filter Visitors</Title>
                  <Text type="secondary">Search and filter visitor registration data</Text>
                </div>
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                  >
                    Reset Filters
                  </Button>
                  <Button
                    type="primary"
                    onClick={fetchVisitors}
                    icon={<SearchOutlined />}
                    loading={loading}
                  >
                    Refresh
                  </Button>
                </Space>
              </div>
            </Space>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by name"
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                prefix={<SearchOutlined className="text-gray-400" />}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by email"
                value={filters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
                prefix={<SearchOutlined className="text-gray-400" />}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by phone"
                value={filters.phone}
                onChange={(e) => handleFilterChange('phone', e.target.value)}
                prefix={<SearchOutlined className="text-gray-400" />}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by company"
                value={filters.company}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                prefix={<SearchOutlined className="text-gray-400" />}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by city"
                value={filters.city}
                onChange={(e) => handleFilterChange('city', e.target.value)}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by state"
                value={filters.state}
                onChange={(e) => handleFilterChange('state', e.target.value)}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by country"
                value={filters.country}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by pincode"
                value={filters.pincode}
                onChange={(e) => handleFilterChange('pincode', e.target.value)}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Filter by source"
                value={filters.source || undefined}
                onChange={(value) => handleFilterChange('source', value)}
                allowClear
                style={{ width: '100%' }}
                className="hover:border-blue-400 focus:border-blue-400"
              >
                <Select.Option value="Website">Website</Select.Option>
                <Select.Option value="manual">Manual</Select.Option>
                <Select.Option value="scan">Scan</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search by location"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Filter by status"
                value={filters.status || undefined}
                onChange={(value) => handleFilterChange('status', value)}
                allowClear
                style={{ width: '100%' }}
                className="hover:border-blue-400 focus:border-blue-400"
              >
                <Select.Option value="registered">Registered</Select.Option>
                <Select.Option value="checked_in">Checked In</Select.Option>
                <Select.Option value="checked_out">Checked Out</Select.Option>
                <Select.Option value="Visited">Visited</Select.Option>
                <Select.Option value="cancelled">Cancelled</Select.Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Select
                placeholder="Filter by event"
                value={filters.eventId || undefined}
                onChange={(value) => handleFilterChange('eventId', value)}
                allowClear
                style={{ width: '100%' }}
                suffixIcon={<FilterOutlined className="text-gray-400" />}
                className="hover:border-blue-400 focus:border-blue-400"
              >
                {events.map(event => (
                  <Select.Option key={event._id} value={event._id}>
                    {event.title}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div>
                <RangePicker
                  onChange={handleDateRangeChange}
                  style={{ width: '100%' }}
                  placeholder={['Event Start Date', 'Event End Date']}
                  className="hover:border-blue-400 focus:border-blue-400"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Filter by when events occur (not registration date)
                </div>
              </div>
            </Col>
          </Row>
          
          {/* Active Filters Summary */}
          {Object.entries(filters).some(([key, value]) => value && key !== 'dateRange') && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FilterOutlined className="text-blue-600 mr-2" />
                  <Text strong className="text-blue-800">Active Filters:</Text>
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
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                  if (value && key !== 'dateRange') {
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    return (
                      <Tag 
                        key={key} 
                        color="blue" 
                        closable 
                        onClose={() => handleFilterChange(key, '')}
                        className="text-xs"
                      >
                        {label}: {value}
                      </Tag>
                    );
                  }
                  return null;
                })}
                {filters.dateRange && (
                  <Tag 
                    color="blue" 
                    closable 
                    onClose={() => handleDateRangeChange(null)}
                    className="text-xs"
                  >
                    Event Occurrence: {filters.dateRange[0]} to {filters.dateRange[1]}
                  </Tag>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card 
        bordered={false} 
        className="bg-white shadow-sm flex-1 flex flex-col overflow-hidden"
        bodyStyle={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex-none flex items-center justify-between mb-6">
          <div>
            <Title level={4} className="m-0">Visitor Registrations</Title>
            <Text type="secondary">Showing all visitor registration records</Text>
          </div>
          <Space>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(f => !f)}
              type={showFilters ? 'primary' : 'default'}
            >
              Filter
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setShowImportModal(true)}
              type="default"
            >
              Import
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              type="default"
            >
              Export CSV
            </Button>
          </Space>
        </div>

        <div className="flex-1 overflow-auto">
          <Table
            columns={columns}
            dataSource={getPaginatedData()}
            rowKey="_id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={false}
            className="custom-pagination"
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

      {/* Import Modal */}
      <ImportRegistrationsModal
        visible={showImportModal}
        onCancel={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        events={events}
      />

      <style jsx global>{`
        .visitor-table {
          width: 100%;
        }
        .visitor-table .ant-table-container {
          border: 1px solid #f0f0f0;
          border-radius: 8px;
        }
        .visitor-table .ant-table-thead > tr > th {
          background-color: #fafafa;
          font-weight: 600;
          color: #1f2937;
          border-bottom: 2px solid #f0f0f0;
          white-space: nowrap;
          padding: 12px 16px;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .visitor-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5;
        }
        .visitor-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f0f0f0;
          white-space: nowrap;
          padding: 12px 16px;
        }
        .visitor-table .ant-table-cell-fix-left,
        .visitor-table .ant-table-cell-fix-right {
          background: #fff;
          z-index: 1;
        }
        .visitor-table .ant-table-body {
          overflow-x: auto !important;
        }
        .visitor-table .ant-table-body::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .visitor-table .ant-table-body::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .visitor-table .ant-table-body::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .visitor-table .ant-table-body::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        .custom-pagination {
          margin-top: 16px;
          padding: 8px;
          background: #fff;
          border-top: 1px solid #f0f0f0;
          position: sticky;
          bottom: 0;
          z-index: 2;
        }
        .custom-pagination .ant-pagination-item-active {
          border-color: #1890ff;
        }
        .custom-pagination .ant-pagination-item-active a {
          color: #1890ff;
        }
        .ant-input-affix-wrapper:hover,
        .ant-input-affix-wrapper-focused,
        .ant-select:hover,
        .ant-select-focused {
          border-color: #1890ff !important;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }
        @media (max-width: 640px) {
          .visitor-table {
            font-size: 14px;
          }
          .visitor-table .ant-table-thead > tr > th,
          .visitor-table .ant-table-tbody > tr > td {
            padding: 8px 12px;
          }
          .custom-pagination {
            padding: 4px;
          }
        }
      `}</style>
    </div>
  );
} 