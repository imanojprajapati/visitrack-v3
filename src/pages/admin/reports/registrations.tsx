import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Input, Button, Select, DatePicker, Space, Typography, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

interface VisitorData {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  designation: string;
  eventId: string;
  eventName: string;
  status: string;
  registrationDate: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export default function RegistrationReportPage() {
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState<VisitorData[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<VisitorData[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchVisitors();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/visitors');
      const data = await response.json();
      setVisitors(data);
      setFilteredVisitors(data);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (values: any) => {
    let filtered = [...visitors];

    if (values.searchTerm) {
      const searchTerm = values.searchTerm.toLowerCase();
      filtered = filtered.filter(visitor =>
        visitor.name.toLowerCase().includes(searchTerm) ||
        visitor.email.toLowerCase().includes(searchTerm) ||
        visitor.phone.toLowerCase().includes(searchTerm) ||
        visitor.company.toLowerCase().includes(searchTerm)
      );
    }

    if (values.eventId) {
      filtered = filtered.filter(visitor => visitor.eventId === values.eventId);
    }

    if (values.dateRange) {
      const [start, end] = values.dateRange;
      filtered = filtered.filter(visitor => {
        const registrationDate = dayjs(visitor.registrationDate);
        return registrationDate.isAfter(start) && registrationDate.isBefore(end);
      });
    }

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
    console.log('Exporting data...');
  };

  const columns: ColumnsType<VisitorData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left' as const,
      width: 200,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: 'Company',
      dataIndex: 'company',
      key: 'company',
      width: 200,
    },
    {
      title: 'Event',
      dataIndex: 'eventName',
      key: 'eventName',
      width: 200,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <span className={`px-2 py-1 rounded-full text-sm ${
          status === 'Checked In' ? 'bg-green-100 text-green-800' :
          status === 'Checked Out' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {status}
        </span>
      ),
    },
    {
      title: 'Registration Date',
      dataIndex: 'registrationDate',
      key: 'registrationDate',
      width: 180,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Check-in Time',
      dataIndex: 'checkInTime',
      key: 'checkInTime',
      width: 180,
      render: (time: string) => time ? dayjs(time).format('DD/MM/YYYY HH:mm:ss') : '-',
    },
    {
      title: 'Check-out Time',
      dataIndex: 'checkOutTime',
      key: 'checkOutTime',
      width: 180,
      render: (time: string) => time ? dayjs(time).format('DD/MM/YYYY HH:mm:ss') : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={4} className="text-lg sm:text-xl font-semibold">Registration Report</Title>
          <Text type="secondary">View and analyze visitor registration data</Text>
        </div>
        <Space className="flex-wrap">
          <Button
            icon={<FilterOutlined />}
            onClick={() => setShowFilters(!showFilters)}
            type={showFilters ? 'primary' : 'default'}
            className="w-full sm:w-auto"
          >
            Filters
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            className="w-full sm:w-auto"
          >
            Export
          </Button>
        </Space>
      </div>

      {showFilters && (
        <Card className="mb-6">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSearch}
            className="max-w-4xl mx-auto"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="searchTerm"
                  label="Search"
                >
                  <Input
                    placeholder="Search visitors..."
                    prefix={<SearchOutlined />}
                    allowClear
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="eventId"
                  label="Event"
                >
                  <Select
                    placeholder="Select event"
                    allowClear
                    className="w-full"
                  >
                    {events.map(event => (
                      <Option key={event._id} value={event._id}>
                        {event.title}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="dateRange"
                  label="Date Range"
                >
                  <RangePicker
                    className="w-full"
                    showTime
                    format="DD/MM/YYYY HH:mm"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Form.Item
                  name="status"
                  label="Status"
                >
                  <Select
                    placeholder="Select status"
                    allowClear
                    className="w-full"
                  >
                    <Option value="Registered">Registered</Option>
                    <Option value="Checked In">Checked In</Option>
                    <Option value="Checked Out">Checked Out</Option>
                  </Select>
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
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            dataSource={filteredVisitors}
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} visitors`,
              responsive: true,
            }}
            scroll={{ x: 'max-content' }}
            className="visitor-table"
          />
        </div>
      </Card>

      <style jsx global>{`
        .visitor-table .ant-table-thead > tr > th {
          background-color: #fafafa;
          font-weight: 600;
          color: #1f2937;
          border-bottom: 2px solid #f0f0f0;
          white-space: nowrap;
        }
        .visitor-table .ant-table-tbody > tr:hover > td {
          background-color: #f5f5f5;
        }
        .visitor-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f0f0f0;
        }
        .custom-pagination .ant-pagination-item-active {
          border-color: #1890ff;
        }
        .custom-pagination .ant-pagination-item-active a {
          color: #1890ff;
        }
        .ant-card {
          border-radius: 8px;
        }
        .ant-input-affix-wrapper:hover,
        .ant-input-affix-wrapper-focused,
        .ant-select:hover,
        .ant-select-focused {
          border-color: #1890ff !important;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
        }
        .ant-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }
        .ant-table {
          min-width: 100%;
        }
        .ant-table-container {
          overflow-x: auto !important;
        }
        @media (max-width: 640px) {
          .ant-table {
            font-size: 14px;
          }
          .ant-table-thead > tr > th,
          .ant-table-tbody > tr > td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
} 