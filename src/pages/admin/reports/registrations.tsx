import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Select, Space, Button, DatePicker, message, Row, Col, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { Event } from '../../../types/event';

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
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [showFilters, setShowFilters] = useState(false);
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
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'dateRange') {
          if (typeof value === 'string') {
            queryParams.append(key, value);
          }
        }
      });
      if (filters.dateRange) {
        queryParams.append('startDate', filters.dateRange[0]);
        queryParams.append('endDate', filters.dateRange[1]);
      }

      const response = await fetch(`/api/visitors?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch visitors');
      const data = await response.json();
      setVisitors(data);
    } catch (error) {
      console.error('Error fetching visitors:', error);
      message.error('Failed to load visitor data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates) {
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
    setTimeout(fetchVisitors, 0);
  };

  const allAdditionalKeys = Array.from(new Set(visitors.flatMap(v => Object.keys(v.additionalData || {}))));

  const additionalDataColumns = allAdditionalKeys.map(key => ({
    title: visitors[0]?.additionalData?.[key]?.label || key,
    dataIndex: ['additionalData', key, 'value'],
    key,
    render: (_: any, record: Visitor) => record.additionalData?.[key]?.value || '-',
  }));

  const columns = [
    ...additionalDataColumns,
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
      title: 'Event Date',
      dataIndex: 'eventStartDate',
      key: 'eventStartDate',
      render: (date: string) => {
        try {
          if (!date) return '-';
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return '-';
          return dateObj.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } catch (error) {
          console.error('Error formatting date:', error);
          return '-';
        }
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span className={`capitalize ${
          status === 'registered' ? 'text-green-600' :
          status === 'checked_in' ? 'text-blue-600' :
          status === 'checked_out' ? 'text-gray-600' :
          'text-red-600'
        }`}>
          {status.replace('_', ' ')}
        </span>
      ),
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
    },
  ];

  const handleExport = () => {
    const headers = [
      ...allAdditionalKeys.map(key => visitors[0]?.additionalData?.[key]?.label || key),
      'Event', 'Location', 'Date', 'Status', 'Registration Date'
    ];
    const csvData = visitors.map(visitor => [
      ...allAdditionalKeys.map(key => visitor.additionalData?.[key]?.value || ''),
      visitor.eventName,
      visitor.eventLocation,
      visitor.eventStartDate ? new Date(visitor.eventStartDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }) : '-',
      visitor.status,
      visitor.createdAt ? new Date(visitor.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).replace(',', '') : '-'
    ]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `visitor-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                  >
                    Apply Filters
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
              <Input
                placeholder="Search by source"
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                allowClear
                className="hover:border-blue-400 focus:border-blue-400"
              />
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
              <RangePicker
                onChange={handleDateRangeChange}
                style={{ width: '100%' }}
                placeholder={['Start Date', 'End Date']}
                className="hover:border-blue-400 focus:border-blue-400"
              />
            </Col>
          </Row>
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
            dataSource={visitors}
            rowKey="_id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} visitors`,
              showQuickJumper: true,
              className: "custom-pagination"
            }}
            className="visitor-table"
            size="middle"
          />
        </div>
      </Card>

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