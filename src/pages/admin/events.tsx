import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Upload,
  Card,
  Select,
  InputNumber,
  Progress,
  Tag,
  Row,
  Col
} from 'antd';
import type { TableProps } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { DatePicker, dayjs } from '../../utils/date';
import AdminLayout from './layout';
import { useAppContext } from '../../context/AppContext';
import { useEventForm } from '../../hooks/useEventForm';

const { TextArea } = Input;

import type { Event } from '../../types/event';

export interface FormValues {
  title: string;
  venue: string;
  date: any; // dayjs object
  time: string;
  status: Event['status'];
  capacity: number;
  description?: string;
  banner?: string;
  registrationDeadline?: any; // dayjs object
}

export default function EventManagement() {
  const { messageApi } = useAppContext();
  const { form, handleSubmit, handleImageUpload } = useEventForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      }
    };
    
    fetchEvents();
  }, []);

  const columns: TableProps<Event>['columns'] = [
    {
      title: 'Event',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Event) => (
        <Space>
          {record.banner && (
            <div style={{ width: 40, height: 40, position: 'relative', overflow: 'hidden', borderRadius: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={record.banner} 
                alt={text}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          )}
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-sm text-gray-500">{record.location}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Date & Time',
      key: 'date',
      render: (_, record) => (
        <div>
          <div>{record.startDate}</div>
          <div className="text-sm text-gray-500">{record.time}</div>
        </div>
      ),
    },
    {
      title: 'Capacity',
      key: 'capacity',
      render: (_, record) => (
        <div>
          <Progress 
            percent={record.visitors ? Math.round((record.visitors / record.capacity) * 100) : 0} 
            size="small"
          />
          <div className="text-sm text-gray-500">
            {record.visitors || 0} / {record.capacity} visitors
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: Event['status']) => {
        const colors: Record<Event['status'], string> = {
          active: 'green',
          upcoming: 'blue',
          completed: 'gray',
          cancelled: 'red'
        };
        return (
          <Tag color={colors[status]}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedEvent(record);
              setModalVisible(true);
            }}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedEvent(record);
              setModalVisible(true);
            }}
          />
          <Button 
            type="text" 
            icon={<DeleteOutlined />}
            danger
            onClick={() => {
              // Implement delete functionality
              messageApi?.success('Event deleted successfully');
            }}
          />
        </Space>
      ),
    },
  ];  

  const getInitialValues = (event: Event | null) => {
    if (!event) return undefined;

    // Convert banner URL to fileList format that Upload component expects
    const fileList = event.banner ? [{
      uid: '-1',
      name: event.banner.split('/').pop() || 'image.jpg',
      status: 'done',
      url: event.banner,
    }] : undefined;

    return {
      ...event,
      date: event.startDate ? dayjs(event.startDate) : undefined,
      registrationDeadline: event.registrationDeadline ? dayjs(event.registrationDeadline) : undefined,
      banner: fileList
    };
  };

  const onSubmit = async (values: FormValues) => {
    const success = await handleSubmit(values);
    if (success) {
      setModalVisible(false);
      form.resetFields();
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <Card
          title={<h1 className="text-2xl font-bold">Event Management</h1>}
          extra={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setSelectedEvent(null);
                setModalVisible(true);
              }}
            >
              Create Event
            </Button>
          }
        >
          <Table
            columns={columns}
            dataSource={events}
            rowKey="id"
            pagination={{
              total: events.length,
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} events`,
            }}
          />
        </Card>

        <Modal
          title={selectedEvent ? 'Edit Event' : 'Create New Event'}
          open={modalVisible}
          onCancel={() => {
            form.resetFields();
            setModalVisible(false);
          }}
          footer={null}
          width={800}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            initialValues={getInitialValues(selectedEvent)}
          >
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item
                  name="title"
                  label="Event Title"
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="date"
                  label="Event Date"
                  rules={[
                    { required: true, message: 'Please select the event date' },
                  ]}
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="time"
                  label="Event Time"
                  rules={[{ required: true, message: 'Please enter event time' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="venue"
              label="Venue"
              rules={[{ required: true, message: 'Please enter venue' }]}
            >
              <Input />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="capacity"
                  label="Capacity"
                  rules={[{ required: true, message: 'Please enter capacity' }]}
                >
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="registrationDeadline"
                  label="Registration Deadline"
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    format="YYYY-MM-DD"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea rows={4} />
            </Form.Item>            <Form.Item
              name="banner"
              label="Event Banner"
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e;
                }
                return e?.fileList;
              }}
            >
              <Upload
                name="file"
                action="/api/upload"
                listType="picture-card"
                maxCount={1}
                accept="image/*"
                showUploadList={{
                  showPreviewIcon: true,
                  showRemoveIcon: true,
                }}
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) {
                    messageApi?.error('You can only upload image files!');
                    return false;
                  }
                  const isLt5M = file.size / 1024 / 1024 < 5;
                  if (!isLt5M) {
                    messageApi?.error('Image must be smaller than 5MB!');
                    return false;
                  }
                  return true;
                }}
                onChange={handleImageUpload}
              >
                {form.getFieldValue('banner')?.length >= 1 ? null : (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>Upload</div>
                  </div>
                )}
              </Upload>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {selectedEvent ? 'Update Event' : 'Create Event'}
                </Button>
                <Button onClick={() => {
                  form.resetFields();
                  setModalVisible(false);
                }}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
