import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { QRCodeComponent } from '../../lib/qrcode';
import { Button, Modal, Form, message, Typography, Input, DatePicker } from 'antd';
import { formatDate, formatDateTime } from '../../utils/dateFormat';

const { Title, Text } = Typography;
const { useForm } = Form;

interface RegisteredVisitor {
  _id: string;
  eventId: string;
  name: string;
  company: string;
  designation: string;
  eventName: string;
  endDate: string;
}

const VisitorRegistration: React.FC = () => {
  const [form] = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredVisitor, setRegisteredVisitor] = useState<RegisteredVisitor | null>(null);

  const handleSubmit = async (values: any) => {
    try {
      setIsSubmitting(true);
      
      // Format dates
      const formattedValues = {
        ...values,
        eventStartDate: formatDate(values.eventStartDate),
        eventEndDate: formatDate(values.eventEndDate),
        checkInTime: formatDateTime(values.checkInTime),
        checkOutTime: formatDateTime(values.checkOutTime)
      };

      // Create visitor
      const response = await fetch('/api/visitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedValues),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register visitor');
      }

      const visitor = await response.json();
      
      // Show success message and QR code
      message.success('Visitor registered successfully');
      setRegistrationSuccess(true);
      setRegisteredVisitor({
        ...visitor,
        name: values.name,
        company: values.company,
        designation: values.designation,
        eventName: values.eventName,
        endDate: values.eventEndDate
      });
      
      // Reset form
      form.resetFields();
    } catch (error) {
      console.error('Registration error:', error);
      message.error(error instanceof Error ? error.message : 'Failed to register visitor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <html>
        <head>
          <title>Visitor QR Code</title>
          <style>
            body { text-align: center; padding: 20px; }
            .qr-container { margin: 20px 0; }
            .visitor-info { margin-top: 20px; }
          </style>
        </head>
        <body>
          <div id="qr-code" class="qr-container"></div>
          <div class="visitor-info">
            <p><strong>Name:</strong> ${registeredVisitor?.name}</p>
            <p><strong>Company:</strong> ${registeredVisitor?.company}</p>
            <p><strong>Event:</strong> ${registeredVisitor?.eventName}</p>
            <p><strong>Valid Until:</strong> ${registeredVisitor?.endDate}</p>
          </div>
          <script>
            window.print();
            window.close();
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    
    // Render QR code in the new window
    if (registeredVisitor) {
      const qrCodeElement = document.createElement('div');
      printWindow.document.getElementById('qr-code')?.appendChild(qrCodeElement);
      
      // Render QR code component into the element
      const qrCode = (
        <QRCodeComponent
          data={{
            visitorId: registeredVisitor._id,
            eventId: registeredVisitor.eventId
          }}
          size={200}
        />
      );
      // Use ReactDOM to render the component
      ReactDOM.render(qrCode, qrCodeElement);
    }
  };

  const renderQRCodeModal = () => (
    <Modal
      title="Registration Successful"
      open={registrationSuccess}
      onCancel={() => setRegistrationSuccess(false)}
      footer={[
        <Button key="print" type="primary" onClick={handlePrintQRCode}>
          Print QR Code
        </Button>,
        <Button key="close" onClick={() => setRegistrationSuccess(false)}>
          Close
        </Button>
      ]}
      width={400}
    >
      <div style={{ textAlign: 'center' }}>
        <Title level={4}>Visitor QR Code</Title>
        <div style={{ margin: '20px 0' }}>
          {registeredVisitor && (
            <QRCodeComponent
              data={{
                visitorId: registeredVisitor._id,
                eventId: registeredVisitor.eventId
              }}
              size={200}
            />
          )}
        </div>
        <Text>
          <strong>Name:</strong> {registeredVisitor?.name}<br />
          <strong>Company:</strong> {registeredVisitor?.company}<br />
          <strong>Event:</strong> {registeredVisitor?.eventName}<br />
          <strong>Valid Until:</strong> {registeredVisitor?.endDate}
        </Text>
      </div>
    </Modal>
  );

  return (
    <div className="p-6">
      <Title level={2}>Visitor Registration</Title>
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        className="max-w-2xl"
      >
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Please enter visitor name' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="company"
          label="Company"
          rules={[{ required: true, message: 'Please enter company name' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="designation"
          label="Designation"
          rules={[{ required: true, message: 'Please enter designation' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="eventName"
          label="Event Name"
          rules={[{ required: true, message: 'Please enter event name' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="eventStartDate"
          label="Event Start Date"
          rules={[{ required: true, message: 'Please select event start date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="eventEndDate"
          label="Event End Date"
          rules={[{ required: true, message: 'Please select event end date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Register Visitor
          </Button>
        </Form.Item>
      </Form>

      {renderQRCodeModal()}
    </div>
  );
};

export default VisitorRegistration; 