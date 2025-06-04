import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, Spin, message, Tag, Divider, Row, Col, Typography } from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  CalendarOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

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
  createdAt: Date;
  updatedAt: Date;
}

export default function VisitorDetailsPage() {
  const router = useRouter();
  const { visitorId } = router.query;
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisitor = async () => {
      if (!visitorId) return;

      try {
        const response = await fetch(`/api/visitors/${visitorId}`);
        if (!response.ok) {
          if (response.status === 404) {
            message.error('Visitor not found');
          } else {
            throw new Error('Failed to fetch visitor details');
          }
          return;
        }
        const data = await response.json();
        setVisitor(data);
      } catch (error) {
        console.error('Error fetching visitor:', error);
        message.error('Failed to load visitor details');
      } finally {
        setLoading(false);
      }
    };

    if (visitorId) {
      fetchVisitor();
    }
  }, [visitorId]);

  const getStatusColor = (status: Visitor['status']) => {
    switch (status) {
      case 'checked_in':
        return 'success';
      case 'checked_out':
        return 'error';
      case 'registered':
        return 'processing';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatStatus = (status: Visitor['status']) => {
    switch (status) {
      case 'checked_in':
        return 'Checked In';
      case 'checked_out':
        return 'Checked Out';
      case 'registered':
        return 'Registered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <p className="text-center text-gray-600">Visitor not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-blue-50 rounded-full mb-4">
              <UserOutlined className="text-4xl text-blue-500" />
            </div>
            <Title level={2} className="mb-2">{visitor.name}</Title>
            <Tag color={getStatusColor(visitor.status)} className="text-base px-4 py-1">
              {formatStatus(visitor.status)}
            </Tag>
          </div>

          <Divider />

          {/* Contact Information */}
          <div className="mb-8">
            <Title level={4} className="mb-4">Contact Information</Title>
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <div className="flex items-center space-x-3">
                  <MailOutlined className="text-gray-400 text-xl" />
                  <div>
                    <Text type="secondary" className="block text-sm">Email</Text>
                    <Text strong>{visitor.email}</Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="flex items-center space-x-3">
                  <PhoneOutlined className="text-gray-400 text-xl" />
                  <div>
                    <Text type="secondary" className="block text-sm">Phone</Text>
                    <Text strong>{visitor.phone}</Text>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Event Information */}
          <div className="mb-8">
            <Title level={4} className="mb-4">Event Information</Title>
            <Row gutter={[24, 16]}>
              <Col span={24}>
                <div className="flex items-center space-x-3">
                  <CalendarOutlined className="text-gray-400 text-xl" />
                  <div>
                    <Text type="secondary" className="block text-sm">Event Name</Text>
                    <Text strong>{visitor.eventName}</Text>
                  </div>
                </div>
              </Col>
              <Col span={24}>
                <div className="flex items-center space-x-3">
                  <EnvironmentOutlined className="text-gray-400 text-xl" />
                  <div>
                    <Text type="secondary" className="block text-sm">Event Location</Text>
                    <Text strong>{visitor.eventLocation}</Text>
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div className="flex items-center space-x-3">
                  <ClockCircleOutlined className="text-gray-400 text-xl" />
                  <div>
                    <Text type="secondary" className="block text-sm">Event Date</Text>
                    <Text strong>
                      {new Date(visitor.eventStartDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </Text>
                  </div>
                </div>
              </Col>
            </Row>
          </div>

          {/* Registration Details */}
          <div>
            <Title level={4} className="mb-4">Registration Details</Title>
            <Row gutter={[24, 16]}>
              <Col span={12}>
                <div className="flex items-center space-x-3">
                  <CheckCircleOutlined className="text-gray-400 text-xl" />
                  <div>
                    <Text type="secondary" className="block text-sm">Registration Date</Text>
                    <Text strong>
                      {new Date(visitor.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).replace(',', '')}
                    </Text>
                  </div>
                </div>
              </Col>
              {visitor.checkInTime && (
                <Col span={12}>
                  <div className="flex items-center space-x-3">
                    <ClockCircleOutlined className="text-gray-400 text-xl" />
                    <div>
                      <Text type="secondary" className="block text-sm">Check-in Time</Text>
                      <Text strong>
                        {new Date(visitor.checkInTime).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                </Col>
              )}
              {visitor.checkOutTime && (
                <Col span={12}>
                  <div className="flex items-center space-x-3">
                    <ClockCircleOutlined className="text-gray-400 text-xl" />
                    <div>
                      <Text type="secondary" className="block text-sm">Check-out Time</Text>
                      <Text strong>
                        {new Date(visitor.checkOutTime).toLocaleString()}
                      </Text>
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </div>
        </Card>
      </div>
    </div>
  );
} 