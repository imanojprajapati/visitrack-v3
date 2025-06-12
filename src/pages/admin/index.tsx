import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, DatePicker, Space, Spin, Alert } from 'antd';
import { Line, Column } from '@ant-design/plots';
import {
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  UpOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import AdminLayout from './layout';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface DashboardStats {
  totalVisitors: number;
  totalEvents: number;
  visitedVisitors: number;
  upcomingEvents: number;
  monthlyRegistrations: Array<{ month: string; count: number }>;
  eventStats: Array<{ event: string; type: string; value: number }>;
}

interface Event {
  _id: string;
  title: string;
  startDate: string;
  endDate: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    eventId: '',
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  });

  useEffect(() => {
    fetchEvents();
    fetchDashboardStats();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events?admin=true');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      // Handle new API response format with events and pagination
      const eventsData = data.events || data;
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    }
  };

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.eventId) {
        queryParams.append('eventId', filters.eventId);
      }
      
      if (filters.dateRange) {
        queryParams.append('startDate', filters.dateRange[0].format('YYYY-MM-DD'));
        queryParams.append('endDate', filters.dateRange[1].format('YYYY-MM-DD'));
      }

      const response = await fetch(`/api/dashboard/stats?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRefresh = () => {
    fetchDashboardStats();
  };

  if (loading && !stats) {
    return (
      <AdminLayout>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center h-64">
            <Spin size="large" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <Space>
            <Select
              placeholder="Filter by Event"
              value={filters.eventId || undefined}
              onChange={(value) => handleFilterChange('eventId', value)}
              allowClear
              style={{ width: 200 }}
            >
              {events.map(event => (
                <Option key={event._id} value={event._id}>
                  {event.title}
                </Option>
              ))}
            </Select>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
              placeholder={['Start Date', 'End Date']}
              disabled
              title="Date filtering is currently disabled due to data format limitations"
            />
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ReloadOutlined />
            </button>
          </Space>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            className="mb-6"
            action={
              <button onClick={handleRefresh} className="text-red-600 hover:text-red-800">
                Retry
              </button>
            }
          />
        )}

        {stats && (
          <>
            {/* Statistics Cards */}
            <Row gutter={[16, 16]} className="mb-8">
              <Col xs={24} sm={12} md={6}>
                <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
                  <Statistic
                    title={<span className="text-base sm:text-lg">Total Registrations</span>}
                    value={stats.totalVisitors}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#1890ff', fontSize: 24 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
                  <Statistic
                    title={<span className="text-base sm:text-lg">Total Events</span>}
                    value={stats.totalEvents}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: '#52c41a', fontSize: 24 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
                  <Statistic
                    title={<span className="text-base sm:text-lg">Visited</span>}
                    value={stats.visitedVisitors}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#722ed1', fontSize: 24 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
                  <Statistic
                    title={<span className="text-base sm:text-lg">Upcoming Events</span>}
                    value={stats.upcomingEvents}
                    prefix={<UpOutlined />}
                    valueStyle={{ color: '#faad14', fontSize: 24 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Charts */}
            <Row gutter={[16, 16]} className="mb-8">
              <Col xs={24} lg={12}>
                <Card title="Monthly Registrations" className="h-96">
                  {stats.monthlyRegistrations && stats.monthlyRegistrations.length > 0 ? (
                    <div className="h-80">
                      <Line
                        data={stats.monthlyRegistrations}
                        xField="month"
                        yField="count"
                        smooth
                        point={{
                          size: 5,
                          shape: 'diamond',
                        }}
                        color="#1890ff"
                        height={300}
                        xAxis={{
                          title: {
                            text: 'Month'
                          }
                        }}
                        yAxis={{
                          title: {
                            text: 'Registrations'
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-80 text-gray-500">
                      No data available
                    </div>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Event Performance" className="h-96">
                  {stats.eventStats && stats.eventStats.length > 0 ? (
                    <div className="h-80">
                      <Column
                        data={stats.eventStats.filter(item => item.value > 0)}
                        xField="event"
                        yField="value"
                        seriesField="type"
                        isGroup={true}
                        columnStyle={{
                          radius: [4, 4, 0, 0],
                        }}
                        height={300}
                        color={['#ff4d4f', '#1890ff']}
                        legend={{
                          position: 'top'
                        }}
                        xAxis={{
                          label: {
                            autoRotate: true,
                            autoHide: true,
                            autoEllipsis: true,
                          }
                        }}
                        yAxis={{
                          title: {
                            text: 'Count'
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-80 text-gray-500">
                      No data available
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

// Add getServerSideProps to pass the isAdminPage prop
export async function getServerSideProps() {
  return {
    props: {
      isAdminPage: true,
    },
  };
}
