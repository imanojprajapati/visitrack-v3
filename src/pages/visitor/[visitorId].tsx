import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, Spin, message, Tag } from 'antd';
import { EventOutlined, EnvironmentOutlined, ClockCircleOutlined, CalendarOutlined } from '@ant-design/icons';

interface Visitor {
  _id: string;
  eventId: string;
  formId: string;
  data: {
    [key: string]: {
      label: string;
      value: string;
    };
  };
  submittedAt: string;
  event?: {
    title: string;
    location: string;
    startDate: string;
    endDate: string;
  };
  status: 'checked-in' | 'checked-out' | 'registered';
}

export default function VisitorDetailsPage() {
  const router = useRouter();
  const { visitorId } = router.query;
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visitorId) {
      fetchVisitorDetails();
    }
  }, [visitorId]);

  const fetchVisitorDetails = async () => {
    try {
      const response = await fetch(`/api/registrations/${visitorId}`);
      if (!response.ok) throw new Error('Failed to fetch visitor details');
      const data = await response.json();
      setVisitor(data);
    } catch (error) {
      console.error('Error fetching visitor details:', error);
      message.error('Failed to load visitor details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Visitor['status']) => {
    switch (status) {
      case 'checked-in':
        return 'green';
      case 'checked-out':
        return 'red';
      case 'registered':
        return 'blue';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Spin size="large" />
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md mx-4">
          <div className="text-center text-red-500">
            Visitor not found
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <Card className="max-w-md mx-auto mb-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Visitor Details</h1>
          <Tag color={getStatusColor(visitor.status)} className="text-base px-4 py-1">
            {visitor.status.charAt(0).toUpperCase() + visitor.status.slice(1)}
          </Tag>
        </div>

        <Card title="Personal Information" className="mb-4">
          {Object.entries(visitor.data).map(([key, field]) => (
            <div key={key} className="mb-3">
              <div className="text-gray-600 text-sm">{field.label}</div>
              <div className="font-medium">{field.value}</div>
            </div>
          ))}
        </Card>

        <Card title="Event Information" className="mb-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-center text-gray-600 mb-1">
                <EventOutlined className="mr-2" />
                <span>Event</span>
              </div>
              <div className="font-medium">{visitor.event?.title}</div>
            </div>

            <div>
              <div className="flex items-center text-gray-600 mb-1">
                <EnvironmentOutlined className="mr-2" />
                <span>Location</span>
              </div>
              <div className="font-medium">{visitor.event?.location}</div>
            </div>

            <div>
              <div className="flex items-center text-gray-600 mb-1">
                <CalendarOutlined className="mr-2" />
                <span>Date</span>
              </div>
              <div className="font-medium">
                {new Date(visitor.event?.startDate || '').toLocaleDateString()}
              </div>
            </div>

            <div>
              <div className="flex items-center text-gray-600 mb-1">
                <ClockCircleOutlined className="mr-2" />
                <span>Time</span>
              </div>
              <div className="font-medium">
                {new Date(visitor.event?.startDate || '').toLocaleTimeString()} -{' '}
                {new Date(visitor.event?.endDate || '').toLocaleTimeString()}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Registration Information">
          <div className="text-gray-600 text-sm mb-1">Registration Date</div>
          <div className="font-medium">
            {new Date(visitor.submittedAt).toLocaleString()}
          </div>
        </Card>
      </Card>
    </div>
  );
} 