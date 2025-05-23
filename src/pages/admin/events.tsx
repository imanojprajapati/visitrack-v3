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
  Col,
  Popconfirm
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
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete event');
      }

      messageApi?.success('Event deleted successfully');
      
      // Refresh events list
      const updatedEvents = events.filter(event => event._id !== eventId);
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Failed to delete event:', error);
      messageApi?.error(error instanceof Error ? error.message : 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

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
              setIsViewMode(true);
              setModalVisible(true);
            }}
          />
          <Button 
            type="text" 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedEvent(record);
              setIsViewMode(false);
              setModalVisible(true);
            }}
          />
          <Popconfirm
            title="Delete Event"
            description="Are you sure you want to delete this event? This action cannot be undone."
            onConfirm={() => handleDeleteEvent(record._id!)}
            okText="Yes, delete"
            cancelText="No, cancel"
            okButtonProps={{ danger: true, loading: isDeleting }}
          >
            <Button 
              type="text" 
              icon={<DeleteOutlined />}
              danger
            />
          </Popconfirm>
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
      title: event.title,
      venue: event.venue || event.location, // Use venue if available, fallback to location
      date: event.startDate ? dayjs(event.startDate) : undefined,
      time: event.time,
      status: event.status,
      capacity: event.capacity,
      description: event.description,
      registrationDeadline: event.registrationDeadline ? dayjs(event.registrationDeadline) : undefined,
      banner: fileList
    };
  };

  const onSubmit = async (values: FormValues) => {
    const success = await handleSubmit(values, selectedEvent?._id);
    if (success) {
      setModalVisible(false);
      form.resetFields();
      setIsViewMode(false);
      
      // Refresh events list
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        messageApi?.error('Failed to refresh events list');
      }
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
                setIsViewMode(false);
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
          title={isViewMode ? 'Event Details' : (selectedEvent ? 'Edit Event' : 'Create New Event')}
          open={modalVisible}
          onCancel={() => {
            form.resetFields();
            setModalVisible(false);
            setIsViewMode(false);
          }}
          footer={isViewMode ? [
            <Button key="close" onClick={() => {
              setModalVisible(false);
              setIsViewMode(false);
            }}>
              Close
            </Button>
          ] : null}
          width={800}
        >
          {isViewMode && selectedEvent ? (
            <div className="p-4">
              {selectedEvent.banner && (
                <div className="mb-6">
                  <img 
                    src={selectedEvent.banner} 
                    alt={selectedEvent.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>
                </Col>
                <Col span={12}>
                  <div className="font-semibold text-gray-600">Date & Time</div>
                  <div>{selectedEvent.startDate} at {selectedEvent.time}</div>
                </Col>
                <Col span={12}>
                  <div className="font-semibold text-gray-600">Status</div>
                  <Tag color={
                    selectedEvent.status === 'active' ? 'green' :
                    selectedEvent.status === 'upcoming' ? 'blue' :
                    selectedEvent.status === 'completed' ? 'gray' : 'red'
                  }>
                    {selectedEvent.status.toUpperCase()}
                  </Tag>
                </Col>
                <Col span={12}>
                  <div className="font-semibold text-gray-600">Venue</div>
                  <div>{selectedEvent.venue || selectedEvent.location}</div>
                </Col>
                <Col span={12}>
                  <div className="font-semibold text-gray-600">Capacity</div>
                  <div>{selectedEvent.visitors || 0} / {selectedEvent.capacity} visitors</div>
                </Col>
                <Col span={24}>
                  <div className="font-semibold text-gray-600">Description</div>
                  <div className="mt-1">{selectedEvent.description}</div>
                </Col>
                {selectedEvent.registrationDeadline && (
                  <Col span={12}>
                    <div className="font-semibold text-gray-600">Registration Deadline</div>
                    <div>{selectedEvent.registrationDeadline}</div>
                  </Col>
                )}
              </Row>
            </div>
          ) : (
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
                    rules={[{ required: true, message: 'Please enter event title' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: 'Please select status' }]}
                  >
                    <Select>
                      <Select.Option value="active">Active</Select.Option>
                      <Select.Option value="upcoming">Upcoming</Select.Option>
                      <Select.Option value="completed">Completed</Select.Option>
                      <Select.Option value="cancelled">Cancelled</Select.Option>
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
              </Form.Item>

              <Form.Item
                name="banner"
                label="Event Banner"
                valuePropName="fileList"
                getValueFromEvent={(e) => {
                  if (Array.isArray(e)) {
                    return e;
                  }
                  return e?.fileList || [];
                }}
              >
                <Upload
                  name="file"
                  action="/api/upload"
                  listType="picture-card"
                  maxCount={1}
                  accept="image/*"
                  fileList={form.getFieldValue('banner') ? [{
                    uid: '-1',
                    name: 'banner.jpg',
                    status: 'done',
                    url: form.getFieldValue('banner'),
                    response: { url: form.getFieldValue('banner') }
                  }] : []}
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
                  onChange={(info) => {
                    // Ensure fileList is always an array
                    const fileList = info.fileList || [];
                    // Update form with the latest fileList
                    form.setFieldValue('banner', fileList);
                    // Call the original handler
                    handleImageUpload(info);
                  }}
                >
                  {(!form.getFieldValue('banner') || form.getFieldValue('banner').length === 0) && (
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
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
