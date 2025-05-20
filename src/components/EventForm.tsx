import { Form, Input, DatePicker, TimePicker, Select, InputNumber, Upload, Button } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { useEventForm } from '../hooks/useEventForm';
import { FormValues } from '../pages/admin/events';
import { RcFile } from 'antd/lib/upload';
import { useAppContext } from '../context/AppContext';

const { TextArea } = Input;
const { Option } = Select;

const normFile = (e: any) => {
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

export default function EventForm() {
  const { form, handleSubmit, handleImageUpload } = useEventForm();
  const { messageApi } = useAppContext();
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' }}>Create New Event</h2>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          status: 'active',
        }}
      >
        <Form.Item
          name="title"
          label="Event Title"
          rules={[{ required: true, message: 'Please enter event title' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="venue"
          label="Venue"
          rules={[{ required: true, message: 'Please enter venue' }]}
        >
          <Input />
        </Form.Item>

        <div style={{ display: 'flex', gap: '16px' }}>
          <Form.Item
            name="date"
            label="Date"
            rules={[{ required: true, message: 'Please select date' }]}
            style={{ flex: 1 }}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="time"
            label="Time"
            rules={[{ required: true, message: 'Please select time' }]}
            style={{ flex: 1 }}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <Select>
            <Option value="active">Active</Option>
            <Option value="upcoming">Upcoming</Option>
            <Option value="completed">Completed</Option>
            <Option value="cancelled">Cancelled</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="capacity"
          label="Capacity"
          rules={[{ required: true, message: 'Please enter capacity' }]}
        >
          <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
        >
          <TextArea rows={4} />
        </Form.Item>        <Form.Item
          name="banner"
          label="Banner Image"
          valuePropName="fileList"
          getValueFromEvent={normFile}
        >
          <Upload
            name="file"
            action="/api/upload"
            listType="picture-card"
            maxCount={1}
            accept="image/*"
            showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
            beforeUpload={(file) => {
              const isImage = file.type.startsWith('image/');
              if (!isImage) {
                messageApi?.error('You can only upload image files!');
                return false;
              }
              const isLessThan5MB = file.size / 1024 / 1024 < 5;
              if (!isLessThan5MB) {
                messageApi?.error('Image must be smaller than 5MB!');
                return false;
              }
              return true;
            }}
            onChange={handleImageUpload}
          >
            {form.getFieldValue('banner') ? null : (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        <Form.Item
          name="registrationDeadline"
          label="Registration Deadline"
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
            Create Event
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}