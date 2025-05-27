import React, { useState, useEffect } from 'react';
import { QRCodeComponent } from '../../lib/qrcode';

const VisitorRegistration: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredVisitor, setRegisteredVisitor] = useState(null);

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
                eventId: registeredVisitor.eventId,
                registrationId: registeredVisitor.registrationId,
                name: registeredVisitor.name,
                company: registeredVisitor.company,
                eventName: registeredVisitor.eventName
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
    <div>
      {/* Render your form here */}
    </div>
  );
};

export default VisitorRegistration; 