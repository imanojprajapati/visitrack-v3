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
  const [allVisitors, setAllVisitors] = useState<Visitor[]>([]); // Store all visitors
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]); // Store cascading filtered results
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
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchEvents();
    fetchAllVisitors();
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
    setLoading(true);
    try {
      const response = await fetch('/api/visitors');
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
      
      setAllVisitors(data);
      setFilteredVisitors(data); // Initially show all visitors
      setPagination(prev => ({
        ...prev,
        current: 1,
        total: data.length,
      }));
    } catch (error) {
      console.error('Error fetching visitors:', error);
      message.error('Failed to load visitor data');
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

    if (filters.city.trim()) {
      filtered = filtered.filter(visitor => {
        const city = visitor.additionalData?.city?.value || '';
        return city.toLowerCase().includes(filters.city.toLowerCase());
      });
    }

    if (filters.state.trim()) {
      filtered = filtered.filter(visitor => {
        const state = visitor.additionalData?.state?.value || '';
        return state.toLowerCase().includes(filters.state.toLowerCase());
      });
    }

    if (filters.country.trim()) {
      filtered = filtered.filter(visitor => {
        const country = visitor.additionalData?.country?.value || '';
        return country.toLowerCase().includes(filters.country.toLowerCase());
      });
    }

    if (filters.pincode.trim()) {
      filtered = filtered.filter(visitor => {
        const pincode = visitor.additionalData?.pinCode?.value || visitor.additionalData?.pincode?.value || '';
        return pincode.includes(filters.pincode);
      });
    }

    if (filters.source) {
      filtered = filtered.filter(visitor => {
        const source = visitor.additionalData?.source?.value || '';
        return source === filters.source;
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

    if (filters.status) {
      filtered = filtered.filter(visitor => 
        visitor.status === filters.status
      );
    }

    if (filters.dateRange) {
      filtered = filtered.filter(visitor => {
        const eventDate = visitor.eventStartDate || visitor.eventEndDate;
        if (!eventDate) return false;
        
        try {
          let dateToCompare: Date;
          
          // Handle DD-MM-YYYY format
          if (/^\d{2}-\d{2}-\d{4}$/.test(eventDate)) {
            const [day, month, year] = eventDate.split('-');
            dateToCompare = new Date(`${year}-${month}-${day}`);
          } else {
            dateToCompare = new Date(eventDate);
          }
          
          if (isNaN(dateToCompare.getTime())) return false;
          
          const startDate = new Date(filters.dateRange![0]);
          const endDate = new Date(filters.dateRange![1]);
          
          return dateToCompare >= startDate && dateToCompare <= endDate;
        } catch (error) {
          return false;
        }
      });
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
        case 'source':
          value = visitor.additionalData?.source?.value || '';
          break;
        case 'status':
          value = visitor.status || '';
          break;
        case 'city':
          value = visitor.additionalData?.city?.value || '';
          break;
        case 'state':
          value = visitor.additionalData?.state?.value || '';
          break;
        case 'country':
          value = visitor.additionalData?.country?.value || '';
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
  };

  // Calculate paginated data from filtered results
  const getPaginatedData = () => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredVisitors.slice(startIndex, endIndex);
  };

  const allAdditionalKeys = Array.from(new Set(filteredVisitors.flatMap(v => Object.keys(v.additionalData || {}))));

  const additionalDataColumns = allAdditionalKeys.map(key => ({
    title: filteredVisitors[0]?.additionalData?.[key]?.label || key,
    dataIndex: ['additionalData', key, 'value'],
    key,
    render: (_: any, record: Visitor) => record.additionalData?.[key]?.value || '-',
  }));

  // Helper function to parse DD-MM-YYYY format to Date object
  const parseDateString = (dateStr: string): Date | string => {
    if (!dateStr) return new Date();
    
    // Check if it's in DD-MM-YYYY format first - return as-is to avoid timezone issues
    const ddMMYYYYRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/;
    if (ddMMYYYYRegex.test(dateStr)) {
      // For DD-MM-YYYY, return the string as-is to avoid timezone conversion
      console.log(`parseDateString: DD-MM-YYYY format - returning as-is: ${dateStr}`);
      return dateStr;
    }
    
    // Check if it's in DD-MM-YY format - convert to DD-MM-YYYY as string
    const ddMMYYRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2}$/;
    if (ddMMYYRegex.test(dateStr)) {
      const parts = dateStr.split('-');
      const day = parts[0];
      const month = parts[1];
      const yearStr = parts[2];
      
      // Convert 2-digit year to 4-digit year
      const yearNum = parseInt(yearStr, 10);
      const year = yearNum < 50 ? '20' + yearStr : '19' + yearStr;
      
      const convertedDate = `${day}-${month}-${year}`;
      console.log(`parseDateString: DD-MM-YY format - ${dateStr} -> ${convertedDate}`);
      return convertedDate;
    }
    
    // Check if it's already in ISO format
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      console.log('parseDateString: ISO format detected, returning:', isoDate.toISOString());
      return isoDate;
    }
    
    console.log('parseDateString: No valid format detected, returning current date');
    return new Date();
  };

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
          console.log('Event Date render - input:', { date, eventEndDate: record.eventEndDate, dateToUse });
          
          if (!dateToUse) return '-';
          
          // If the date is already in DD-MM-YYYY format, return it as is
          if (/^\d{2}-\d{2}-\d{4}$/.test(dateToUse)) {
            return dateToUse;
          }
          
          // If it's in ISO format, convert to DD-MM-YYYY
          const dateObj = new Date(dateToUse);
          if (!isNaN(dateObj.getTime())) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = String(dateObj.getFullYear());
            const formatted = `${day}-${month}-${year}`;
            console.log('Event Date render - converted from ISO:', { dateToUse, formatted });
            return formatted;
          }
          
          // If it's already in DD-MM-YY format, convert to DD-MM-YYYY
          if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(dateToUse)) {
            const [day, month, year] = dateToUse.split('-');
            const fullYear = Number(year) < 50 ? '20' + year : '19' + year;
            const formatted = `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${fullYear}`;
            console.log('Event Date render - converted from DD-MM-YY:', { dateToUse, formatted });
            return formatted;
          }
          
          console.log('Event Date render - no valid format detected:', dateToUse);
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
          
          // If the date is already in DD-MM-YYYY format, return it as is
          if (/^\d{2}-\d{2}-\d{4}$/.test(date)) {
            return date;
          }
          
          // Handle ISO date format (2025-06-05T18:30:00.000Z)
          const dateObj = new Date(date);
          if (!isNaN(dateObj.getTime())) {
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();
            return `${day}-${month}-${year}`;
          }
          
          // Handle DD-MM-YY format
          if (/^\d{1,2}-\d{1,2}-\d{2}$/.test(date)) {
            const [day, month, year] = date.split('-');
            const fullYear = Number(year) < 50 ? '20' + year : '19' + year;
            return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${fullYear}`;
          }
          
          return date || '-';
        } catch (error) {
          console.error('Error formatting registration date:', error);
          return date || '-';
        }
      },
      width: 150,
    },
  ];

  const handleExport = async () => {
    try {
      setExportLoading(true);
      
      // Build query parameters based on current filters
      const params = new URLSearchParams();
      
      // Add search filters
      if (filters.name) params.append('name', filters.name);
      if (filters.email) params.append('email', filters.email);
      if (filters.phone) params.append('phone', filters.phone);
      if (filters.company) params.append('company', filters.company);
      if (filters.city) params.append('city', filters.city);
      if (filters.state) params.append('state', filters.state);
      if (filters.country) params.append('country', filters.country);
      if (filters.pincode) params.append('pincode', filters.pincode);
      if (filters.source) params.append('source', filters.source);
      if (filters.location) params.append('location', filters.location);
      if (filters.status) params.append('status', filters.status);
      
      // Add date range filter
      if (filters.dateRange && filters.dateRange.length === 2) {
        const [startDate, endDate] = filters.dateRange;
        params.append('startDate', startDate);
        params.append('endDate', endDate);
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
      link.download = `registration-report-${new Date().toISOString().split('T')[0]}.xlsx`;
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

  const handleImportSuccess = () => {
    setShowImportModal(false);
    fetchAllVisitors(); // Refresh the data after import
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
                    onClick={fetchAllVisitors}
                    icon={<SearchOutlined />}
                    loading={loading}
                  >
                    Refresh
                  </Button>
                </Space>
              </div>
            </Space>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
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
            
            {/* How it works explanation */}
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
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
                    Example: Filter by "State: California" → then "Event" dropdown will only show events that have visitors from California.
                  </p>
                </div>
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
                <Input
                  placeholder="Search by phone"
                  value={filters.phone}
                  onChange={(e) => handleFilterChange('phone', e.target.value)}
                  prefix={<SearchOutlined className="text-gray-400" />}
                  allowClear
                  className="hover:border-blue-400 focus:border-blue-400"
                />
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
                  prefix={<SearchOutlined className="text-gray-400" />}
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
                  placeholder="Filter by city"
                  value={filters.city || undefined}
                  onChange={(value) => handleFilterChange('city', value)}
                  allowClear
                  style={{ width: '100%' }}
                  className="hover:border-blue-400 focus:border-blue-400"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {getUniqueValues('city').map(city => (
                    <Select.Option key={city} value={city}>
                      {city}
                    </Select.Option>
                  ))}
                </Select>
                {filters.city && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">5</span>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="relative">
                <Select
                  placeholder="Filter by state"
                  value={filters.state || undefined}
                  onChange={(value) => handleFilterChange('state', value)}
                  allowClear
                  style={{ width: '100%' }}
                  className="hover:border-blue-400 focus:border-blue-400"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {getUniqueValues('state').map(state => (
                    <Select.Option key={state} value={state}>
                      {state}
                    </Select.Option>
                  ))}
                </Select>
                {filters.state && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">6</span>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="relative">
                <Select
                  placeholder="Filter by country"
                  value={filters.country || undefined}
                  onChange={(value) => handleFilterChange('country', value)}
                  allowClear
                  style={{ width: '100%' }}
                  className="hover:border-blue-400 focus:border-blue-400"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {getUniqueValues('country').map(country => (
                    <Select.Option key={country} value={country}>
                      {country}
                    </Select.Option>
                  ))}
                </Select>
                {filters.country && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">7</span>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="relative">
                <Input
                  placeholder="Search by pincode"
                  value={filters.pincode}
                  onChange={(e) => handleFilterChange('pincode', e.target.value)}
                  allowClear
                  className="hover:border-blue-400 focus:border-blue-400"
                />
                {filters.pincode && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">8</span>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="relative">
                <Select
                  placeholder="Filter by source"
                  value={filters.source || undefined}
                  onChange={(value) => handleFilterChange('source', value)}
                  allowClear
                  style={{ width: '100%' }}
                  className="hover:border-blue-400 focus:border-blue-400"
                  dropdownRender={(menu) => (
                    <div>
                      {getUniqueValues('source').length === 0 ? (
                        <div className="p-2 text-center text-gray-500">
                          No sources available from current filters
                        </div>
                      ) : (
                        menu
                      )}
                    </div>
                  )}
                >
                  {getUniqueValues('source').map(source => (
                    <Select.Option key={source} value={source}>
                      {source}
                    </Select.Option>
                  ))}
                </Select>
                {filters.source && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">9</span>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="relative">
                <Input
                  placeholder="Search by location"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  allowClear
                  className="hover:border-blue-400 focus:border-blue-400"
                />
                {filters.location && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">10</span>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="relative">
                <Select
                  placeholder="Filter by status"
                  value={filters.status || undefined}
                  onChange={(value) => handleFilterChange('status', value)}
                  allowClear
                  style={{ width: '100%' }}
                  className="hover:border-blue-400 focus:border-blue-400"
                  dropdownRender={(menu) => (
                    <div>
                      {getUniqueValues('status').length === 0 ? (
                        <div className="p-2 text-center text-gray-500">
                          No statuses available from current filters
                        </div>
                      ) : (
                        menu
                      )}
                    </div>
                  )}
                >
                  {getUniqueValues('status').map(status => (
                    <Select.Option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                    </Select.Option>
                  ))}
                </Select>
                {filters.status && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">11</span>
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
                    <span className="text-white text-xs">12</span>
                  </div>
                )}
              </div>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div className="relative">
                <RangePicker
                  onChange={handleDateRangeChange}
                  style={{ width: '100%' }}
                  placeholder={['Event Start Date', 'Event End Date']}
                  className="hover:border-blue-400 focus:border-blue-400"
                />
                {filters.dateRange && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">13</span>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  Filter by when events occur (not registration date)
                </div>
              </div>
            </Col>
          </Row>
          
          {/* Active Filters Summary & Filter Chain Visualization */}
          {(Object.entries(filters).some(([key, value]) => value && key !== 'dateRange') || filters.dateRange) && (
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
                    if (value && key !== 'dateRange') {
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
                  {filters.dateRange && (
                    <div className="flex items-center">
                      {Object.values(filters).filter(v => v && v !== filters.dateRange).length > 0 && (
                        <span className="text-gray-400 mx-1">→</span>
                      )}
                      <Tag 
                        color="blue" 
                        closable 
                        onClose={() => handleDateRangeChange(null)}
                        className="text-xs"
                      >
                        Date: {filters.dateRange[0]} to {filters.dateRange[1]}
                      </Tag>
                    </div>
                  )}
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

      <Card 
        bordered={false} 
        className="bg-white shadow-sm flex-1 flex flex-col overflow-hidden"
        bodyStyle={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex-none flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="mb-4 lg:mb-0">
            <Title level={4} className="m-0">Visitor Registrations</Title>
            <Text type="secondary">Showing all visitor registration records</Text>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              icon={<FilterOutlined />}
              onClick={() => setShowFilters(f => !f)}
              type={showFilters ? 'primary' : 'default'}
              className="w-full sm:w-auto"
            >
              Filter
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={() => setShowImportModal(true)}
              type="default"
              className="w-full sm:w-auto"
            >
              Import
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExport}
              type="default"
              loading={exportLoading}
              className="w-full sm:w-auto"
            >
              Export XLSX
            </Button>
          </div>
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