import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Select, Space, Spin, Alert } from 'antd';
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
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (filters.eventId) {
        queryParams.append('eventId', filters.eventId);
      }

      const response = await fetch(`/api/dashboard/stats?${queryParams.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Frontend received dashboard stats:', {
          totalVisitors: data.totalVisitors,
          totalEvents: data.totalEvents,
          visitedVisitors: data.visitedVisitors,
          upcomingEvents: data.upcomingEvents,
          monthlyRegistrationsLength: data.monthlyRegistrations?.length,
          monthlyRegistrationsSample: data.monthlyRegistrations?.slice(0, 3),
          eventStatsLength: data.eventStats?.length
        });
        setStats(data);
        setError(null);
      } else {
        console.error('Failed to fetch dashboard stats');
        setError('Failed to load dashboard data');
      }
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

  // Debug: Log chart data when it changes
  useEffect(() => {
    if (stats) {
      console.log('Chart data updated:', {
        monthlyRegistrations: stats.monthlyRegistrations,
        eventStats: stats.eventStats
      });
      
      // Log first item of each dataset to understand structure
      if (stats.monthlyRegistrations && stats.monthlyRegistrations.length > 0) {
        console.log('First monthly registration item:', stats.monthlyRegistrations[0]);
      }
      if (stats.eventStats && stats.eventStats.length > 0) {
        console.log('First event stat item:', stats.eventStats[0]);
      }
    }
  }, [stats]);

  // Helper function to truncate long event names for chart display
  const truncateEventName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
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
      <div className="admin-responsive-container">
        <div className="admin-content-wrapper">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-responsive-xl font-bold text-gray-900">Dashboard</h1>
            <div className="admin-button-group">
              <Select
                placeholder="Filter by Event"
                value={filters.eventId || undefined}
                onChange={(value) => handleFilterChange('eventId', value)}
                allowClear
                style={{ width: 200 }}
                className="w-full sm:w-auto"
              >
                {events.map(event => (
                  <Option key={event._id} value={event._id}>
                    {truncateEventName(event.title)}
                  </Option>
                ))}
              </Select>
              <button
                onClick={handleRefresh}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ReloadOutlined />
              </button>
            </div>
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
              <div className="admin-stats-grid mb-8">
                <Card className="admin-card-responsive">
                  <Statistic
                    title="Total Visitors"
                    value={stats.totalVisitors}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
                <Card className="admin-card-responsive">
                  <Statistic
                    title="Total Events"
                    value={stats.totalEvents}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
                <Card className="admin-card-responsive">
                  <Statistic
                    title="Visited Visitors"
                    value={stats.visitedVisitors}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
                <Card className="admin-card-responsive">
                  <Statistic
                    title="Upcoming Events"
                    value={stats.upcomingEvents}
                    prefix={<UpOutlined />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </div>

              {/* Charts */}
              <Row gutter={[16, 16]} className="mb-8">
                <Col xs={24} lg={12}>
                  <Card title="Monthly Registrations" className="h-96">
                    {stats.monthlyRegistrations && stats.monthlyRegistrations.length > 0 && 
                     stats.monthlyRegistrations.some(item => item.count > 0) ? (
                      <div className="h-80">
                        <Line
                          data={stats.monthlyRegistrations}
                          xField="month"
                          yField="count"
                          smooth
                          point={{
                            size: 6,
                            shape: 'circle',
                            style: {
                              fill: '#1890ff',
                              stroke: '#fff',
                              strokeWidth: 2,
                            },
                          }}
                          line={{
                            style: {
                              stroke: '#1890ff',
                              strokeWidth: 3,
                            },
                          }}
                          color="#1890ff"
                          height={300}
                          xAxis={{
                            title: {
                              text: 'Month',
                              style: {
                                fontSize: 12,
                                fontWeight: 500,
                              },
                            },
                            label: {
                              style: {
                                fontSize: 10,
                              },
                              autoRotate: true,
                              autoHide: true,
                              autoEllipsis: true,
                            },
                          }}
                          yAxis={{
                            title: {
                              text: 'Registrations',
                              style: {
                                fontSize: 12,
                                fontWeight: 500,
                              },
                            },
                            min: 0,
                            label: {
                              style: {
                                fontSize: 10,
                              },
                            },
                          }}
                          tooltip={{
                            showCrosshairs: true,
                            crosshairs: {
                              type: 'xy',
                              line: {
                                style: {
                                  stroke: '#1890ff',
                                  strokeWidth: 1,
                                  strokeOpacity: 0.5,
                                  lineDash: [4, 4],
                                },
                              },
                            },
                            showMarkers: true,
                            marker: {
                              fill: '#1890ff',
                              stroke: '#fff',
                              strokeWidth: 2,
                              r: 4,
                            },
                            formatter: (datum: any) => {
                              // Ensure we have valid data
                              const month = datum?.month || datum?.x || 'Unknown Month';
                              const count = datum?.count || datum?.y || 0;
                              
                              console.log('Tooltip datum:', datum);
                              console.log('Formatted tooltip:', { month, count });
                              
                              return {
                                name: month,
                                value: `${count} registrations`,
                              };
                            },
                            domStyles: {
                              'g2-tooltip': {
                                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                color: '#fff',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                fontSize: '13px',
                                fontWeight: '500',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              },
                              'g2-tooltip-title': {
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '4px',
                              },
                              'g2-tooltip-list': {
                                margin: '0',
                              },
                              'g2-tooltip-list-item': {
                                margin: '4px 0',
                              },
                            },
                          }}
                          animation={{
                            appear: {
                              animation: 'path-in',
                              duration: 1000,
                            },
                          }}
                          interactions={[
                            {
                              type: 'marker-active',
                            },
                          ]}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-80 text-gray-500">
                        <div className="text-center">
                          <div className="text-lg mb-2">No registration data available</div>
                          <div className="text-sm">Registration data will appear here once visitors start registering</div>
                        </div>
                      </div>
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Event Performance" className="h-96">
                    {stats.eventStats && stats.eventStats.length > 0 && 
                     stats.eventStats.some(item => item.value > 0) ? (
                      <div className="h-80">
                        <Column
                          data={stats.eventStats.filter(item => item.value > 0)}
                          xField="event"
                          yField="value"
                          seriesField="type"
                          isGroup={true}
                          columnStyle={{
                            radius: [6, 6, 0, 0],
                          }}
                          height={300}
                          color={['#ff4d4f', '#1890ff', '#52c41a', '#faad14']}
                          legend={{
                            position: 'top',
                            marker: {
                              symbol: 'circle',
                            },
                            itemName: {
                              style: {
                                fontSize: 12,
                                fontWeight: 500,
                              },
                            },
                          }}
                          xAxis={{
                            label: {
                              style: {
                                fontSize: 10,
                              },
                              autoRotate: true,
                              autoHide: true,
                              autoEllipsis: true,
                            },
                          }}
                          yAxis={{
                            title: {
                              text: 'Count',
                              style: {
                                fontSize: 12,
                                fontWeight: 500,
                              },
                            },
                            min: 0,
                            label: {
                              style: {
                                fontSize: 10,
                              },
                            },
                          }}
                          tooltip={{
                            showCrosshairs: true,
                            crosshairs: {
                              type: 'xy',
                              line: {
                                style: {
                                  stroke: '#1890ff',
                                  strokeWidth: 1,
                                  strokeOpacity: 0.5,
                                  lineDash: [4, 4],
                                },
                              },
                            },
                            showMarkers: true,
                            marker: {
                              fill: '#1890ff',
                              stroke: '#fff',
                              strokeWidth: 2,
                              r: 4,
                            },
                            formatter: (datum: any) => {
                              return {
                                name: datum.type || 'Unknown',
                                value: `${datum.value || 0} ${(datum.type || 'unknown').toLowerCase()}`,
                              };
                            },
                            domStyles: {
                              'g2-tooltip': {
                                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                                color: '#fff',
                                borderRadius: '8px',
                                padding: '12px 16px',
                                fontSize: '13px',
                                fontWeight: '500',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              },
                              'g2-tooltip-title': {
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '4px',
                              },
                              'g2-tooltip-list': {
                                margin: '0',
                              },
                              'g2-tooltip-list-item': {
                                margin: '4px 0',
                              },
                            },
                          }}
                          animation={{
                            appear: {
                              animation: 'fade-in',
                              duration: 1000,
                            },
                          }}
                          interactions={[
                            {
                              type: 'element-active',
                            },
                          ]}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-80 text-gray-500">
                        <div className="text-center">
                          <div className="text-lg mb-2">No event data available</div>
                          <div className="text-sm">Event performance data will appear here once events are created and visitors register</div>
                        </div>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </div>
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
