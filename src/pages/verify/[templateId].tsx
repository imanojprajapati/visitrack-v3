import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Card,
  Descriptions,
  Typography,
  Space,
  Tag,
  Spin,
  Result,
  Button,
  Image,
  Row,
  Col,
  Divider,
  Statistic
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { connectToDatabase } from '../../lib/mongodb';
import BadgeTemplate from '../../models/BadgeTemplate';
import Event from '../../models/Event';

const { Title, Text, Paragraph } = Typography;

interface Event {
  _id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  description?: string;
}

interface BadgeTemplate {
  _id: string;
  name: string;
  eventId: string;
  badge?: {
    cloudinaryUrl?: string;
  };
}

const VerifyBadge: React.FC = () => {
  const router = useRouter();
  const { templateId } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [template, setTemplate] = useState<BadgeTemplate | null>(null);
  const [verificationTime, setVerificationTime] = useState<string>('');

  useEffect(() => {
    const verifyBadge = async () => {
      if (!templateId) return;

      try {
        setLoading(true);
        // Fetch template details
        const templateResponse = await fetch(`/api/badge-templates/${templateId}`);
        if (!templateResponse.ok) {
          throw new Error('Invalid badge template');
        }
        const templateData = await templateResponse.json();
        setTemplate(templateData);

        // Fetch event details
        const eventResponse = await fetch(`/api/events/${templateData.eventId}`);
        if (!eventResponse.ok) {
          throw new Error('Event not found');
        }
        const eventData = await eventResponse.json();
        setEvent(eventData);
        setVerificationTime(new Date().toLocaleString());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify badge');
      } finally {
        setLoading(false);
      }
    };

    verifyBadge();
  }, [templateId]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5'
      }}>
        <Space direction="vertical" align="center" size="large">
          <Spin size="large" />
          <Text type="secondary">Verifying badge...</Text>
        </Space>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5',
        padding: '20px'
      }}>
        <Result
          status="error"
          title="Invalid Badge"
          subTitle={error}
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '48px' }} />}
          extra={[
            <Button type="primary" key="back" onClick={() => router.push('/')}>
              Go Back
            </Button>
          ]}
        />
      </div>
    );
  }

  if (!event || !template) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5',
        padding: '20px'
      }}>
        <Result
          status="error"
          title="Badge Not Found"
          subTitle="The badge you're trying to verify does not exist"
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: '48px' }} />}
          extra={[
            <Button type="primary" key="back" onClick={() => router.push('/')}>
              Go Back
            </Button>
          ]}
        />
      </div>
    );
  }

  const eventStartDate = new Date(event.startDate);
  const eventEndDate = new Date(event.endDate);
  const isEventActive = new Date() >= eventStartDate && new Date() <= eventEndDate;

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f0f2f5',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <div style={{ 
          background: isEventActive ? '#52c41a' : '#ff4d4f',
          padding: '24px',
          textAlign: 'center'
        }}>
          <Result
            status={isEventActive ? "success" : "error"}
            title={isEventActive ? "Valid Badge" : "Expired Badge"}
            subTitle={isEventActive ? "This badge has been verified successfully" : "This badge has expired"}
            icon={isEventActive ? 
              <CheckCircleOutlined style={{ color: 'white', fontSize: '48px' }} /> :
              <CloseCircleOutlined style={{ color: 'white', fontSize: '48px' }} />
            }
            style={{ padding: 0 }}
          />
        </div>

        <div style={{ padding: '24px' }}>
          <Row gutter={[24, 24]}>
            {template.badge?.cloudinaryUrl && (
              <Col xs={24} sm={24} md={8}>
                <Card
                  hoverable
                  cover={
                    <Image
                      src={template.badge.cloudinaryUrl}
                      alt="Badge"
                      style={{ 
                        width: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                        padding: '16px'
                      }}
                    />
                  }
                  bodyStyle={{ padding: '12px' }}
                >
                  <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
                    Badge Template
                  </Text>
                </Card>
              </Col>
            )}
            
            <Col xs={24} sm={24} md={template.badge?.cloudinaryUrl ? 16 : 24}>
              <Card>
                <Title level={4} style={{ marginBottom: '24px' }}>
                  <Space>
                    <InfoCircleOutlined />
                    Event Information
                  </Space>
                </Title>

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Statistic
                      title="Event Name"
                      value={event.title}
                      prefix={<CalendarOutlined />}
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <Statistic
                      title="Location"
                      value={event.location}
                      prefix={<EnvironmentOutlined />}
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <Statistic
                      title="Start Date"
                      value={eventStartDate.toLocaleDateString()}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <Statistic
                      title="End Date"
                      value={eventEndDate.toLocaleDateString()}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                </Row>

                {event.description && (
                  <>
                    <Divider />
                    <Paragraph>
                      <Text type="secondary">Description:</Text>
                      <br />
                      {event.description}
                    </Paragraph>
                  </>
                )}

                <Divider />

                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Statistic
                      title="Verification Time"
                      value={verificationTime}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                  <Col span={24}>
                    <Space>
                      <Tag color={isEventActive ? 'success' : 'error'}>
                        {isEventActive ? 'Active' : 'Expired'}
                      </Tag>
                      <Tag color="processing">
                        {template.name}
                      </Tag>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
};

export default VerifyBadge;

export async function getServerSideProps() {
  return {
    props: {
      isAdminPage: false,
    },
  };
} 