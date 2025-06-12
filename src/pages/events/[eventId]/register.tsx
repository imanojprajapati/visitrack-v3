'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { Card, Input, Button, message, Steps, Form, Typography, Space, Divider, Result, Spin, Alert, Modal } from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  SafetyOutlined,
  DownloadOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import DynamicForm from '../../../components/DynamicForm';
import { Event } from '../../../types/event';
import { Visitor } from '../../../types/visitor';
import ReactDOM from 'react-dom/client';
import { fetchApi, buildApiUrl } from '../../../utils/api';
import { FormBuilder, FormField, FormTemplate } from '../../../utils/formBuilder';
import { Rule } from 'antd/es/form';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import { QRCode as AntQRCode } from 'antd';
import { Tag } from 'antd';

const { Title, Text } = Typography;
const { Step } = Steps;

const countries = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'India',
  'Germany',
  'France',
  'Japan',
  'China',
  'Brazil',
];

const interests = [
  'Networking',
  'Technology',
  'Marketing',
  'Business Development',
  'Product Management',
  'Sales',
  'Human Resources',
  'Finance',
  'Operations',
  'Other',
];

export default function EventRegistration() {
  const router = useRouter();
  const { eventId } = router.query;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    phoneNumber: '',
    otp: '',
    name: '',
    companyName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pinCode: '',
    interestedIn: '',
    eventId: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!eventId) {
        throw new Error('Event ID is required');
      }

      // Add console log for debugging
      console.log('Fetching event details for ID:', eventId);

      const eventData = await fetchApi(`events/${eventId}`, {
        method: 'GET',
        retries: 3,
        retryDelay: 1000,
      });

      console.log('Event data received:', eventData);

      if (!eventData) {
        throw new Error('Event not found');
      }

      // Check if registration deadline has passed
      if (eventData.registrationDeadline) {
        const now = new Date();
        const registrationDeadline = new Date(eventData.registrationDeadline);
        
        if (now > registrationDeadline) {
          Modal.info({
            title: 'Registration Closed',
            content: 'You are able to register for this event at the event location and event date with pay to entry badge.',
            onOk() {
              router.push('/events');
            },
          });
          return;
        }
      }

      // Validate event data
      if (!eventData.title || !eventData.startDate || !eventData.endDate) {
        console.error('Invalid event data:', eventData);
        throw new Error('Invalid event data: Missing required fields');
      }

      // Validate form data if present
      if (eventData.form) {
        if (!Array.isArray(eventData.form.fields)) {
          console.error('Invalid form structure:', eventData.form);
          throw new Error('Invalid form structure');
        }
      }
      
      setEvent(eventData);
    } catch (error) {
      console.error('Error fetching event:', error);
      setError(error instanceof Error ? error.message : 'Failed to load event details');
      messageApi.error(error instanceof Error ? error.message : 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    }
  }, [eventId]);

  useEffect(() => {
    if (currentStep === 2) {
      console.log('Current step:', currentStep);
      console.log('Event data:', event);
      if (event?.form) {
        console.log('Form fields:', event.form.fields);
        console.log('Form field IDs:', event.form.fields.map(f => f.id));
        console.log('Form field types:', event.form.fields.map(f => ({ id: f.id, type: f.type })));
      } else {
        console.log('No form data available');
      }
    }
  }, [currentStep, event]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendOTP = async (values: { email: string }) => {
    try {
      setLoading(true);
      setError(null);

      // Validate email
      if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        throw new Error('Please enter a valid email address');
      }

      // First check if user is already registered
      const checkResponse = await fetchApi('visitors/check-registration', {
        method: 'POST',
        body: JSON.stringify({ email: values.email, eventId }),
      });
      
      if (checkResponse.isRegistered && checkResponse.visitor) {
        setVisitor(checkResponse.visitor);
        setIsAlreadyRegistered(true);
        setCurrentStep(3); // Move to the final step
        message.info('You are already registered for this event');
        return;
      }

      // If not registered, proceed with OTP
      await fetchApi('auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: values.email, eventId }),
      });
      
      setCurrentStep(1);
      message.success('OTP sent to your email');
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process request');
      message.error(error instanceof Error ? error.message : 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (values: { otp: string }) => {
    if (isVerifying || isSubmitting) {
      console.log('Verification already in progress');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      // Get email from form
      const email = form.getFieldValue('email');
      if (!email) {
        form.setFields([{
          name: 'email',
          errors: ['Email is required']
        }]);
        return;
      }

      // Clean and validate OTP
      const cleanOTP = values.otp?.toString().trim() || '';
      if (!cleanOTP) {
        form.setFields([{
          name: 'otp',
          errors: ['Please enter the OTP']
        }]);
        return;
      }

      if (!/^\d{6}$/.test(cleanOTP)) {
        form.setFields([{
          name: 'otp',
          errors: ['Please enter a valid 6-digit OTP']
        }]);
        return;
      }

      // Clear any previous errors
      form.setFields([{
        name: 'otp',
        errors: []
      }]);

      // Verify OTP
      const response = await fetchApi('auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email,
          otp: cleanOTP
        })
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to verify OTP');
      }

      // OTP verification successful
      setCurrentStep(2);
      message.success('OTP verified successfully');
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to verify OTP');
      message.error(error instanceof Error ? error.message : 'Failed to verify OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegistration = async (values: any) => {
    if (isSubmitting) {
      console.log('Registration already in progress');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Add debug logging
      console.log('Form values received:', values);
      console.log('Event form fields:', event?.form?.fields);

      // Validate required fields
      if (!event?.form?.fields) {
        throw new Error('Form configuration is missing');
      }

      // Get all form values
      const formValues = form.getFieldsValue();
      console.log('All form values:', formValues);

      // Validate that we have actual values
      if (!formValues || Object.keys(formValues).length === 0) {
        throw new Error('No form values provided');
      }

      // Extract required fields
      const name = formValues.name;
      const email = formValues.email || form.getFieldValue('email');
      const phone = formValues.phone;
      const source = 'Website'; // Always set source to Website

      console.log('Extracted values:', { name, email, phone, source });

      if (!name) {
        throw new Error('Name is required');
      }

      if (!email) {
        throw new Error('Email is required');
      }

      // Format form data
      const formData = event.form.fields.reduce((acc: Record<string, any>, field) => {
        // For source field, always use 'Website'
        if (field.id === 'source') {
          acc[field.id] = {
            label: field.label,
            value: source
          };
          return acc;
        }

        const value = formValues[field.id];
        
        // Skip empty optional fields
        if (!field.required && (value === undefined || value === '' || value === null)) {
          return acc;
        }

        // Validate required fields
        if (field.required && (value === undefined || value === '' || value === null)) {
          throw new Error(`${field.label} is required`);
        }

        // Format the field value based on type
        let formattedValue = value;
        if (field.type === 'date' && value) {
          formattedValue = dayjs(value).format('YYYY-MM-DD');
        } else if (field.type === 'number' && value) {
          formattedValue = Number(value);
        }

        acc[field.id] = {
          label: field.label,
          value: formattedValue
        };

        return acc;
      }, {});

      // Add source field if not already present
      if (!formData.source) {
        formData.source = {
          label: 'Source',
          value: source
        };
      }

      // Submit registration
      const response = await fetchApi('visitors/register', {
        method: 'POST',
        body: JSON.stringify({
          eventId,
          email,
          name,
          phone: phone || '',
          formData,
          source // Add source to the main registration data
        })
      });

      if (!response.visitor) {
        throw new Error('Failed to create visitor registration');
      }

      setVisitor(response.visitor);
      setCurrentStep(3);
      
      message.success('Registration successful! A confirmation email has been sent to your inbox.');

    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete registration';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to validate MongoDB ObjectId format
  const isValidObjectId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // QR Code component with error boundary
  const QRCode: React.FC<{ value: string; size?: number }> = ({ value, size = 200 }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
      return (
        <Result
          status="error"
          title="QR Code Generation Failed"
          subTitle="Unable to generate QR code. Please try again later."
        />
      );
    }

    try {
      return (
        <div style={{ background: '#fff', padding: '20px', textAlign: 'center' }}>
          <QRCodeSVG
            value={value}
            size={size}
            level="L"
            includeMargin={true}
            style={{ display: 'block', margin: '0 auto' }}
            onError={(error) => {
              console.error('QR Code generation error:', error);
              setHasError(true);
            }}
          />
          <div style={{ marginTop: '10px', fontSize: '12px', wordBreak: 'break-all' }}>
            {value}
          </div>
        </div>
      );
    } catch (error) {
      console.error('QR Code render error:', error);
      setHasError(true);
      return null;
    }
  };

  // Registration details component
  const RegistrationDetails: React.FC<{ visitor: Visitor }> = ({ visitor }) => {
    const [qrError, setQrError] = useState<string | null>(null);
    
    if (!visitor) {
      return (
        <Result
          status="error"
          title="Registration Not Found"
          subTitle="Unable to load registration details."
        />
      );
    }

    // QR code should only encode the visitor ID
    const qrCodeValue = visitor._id ? visitor._id.toString() : '';

    return (
      <div className="mb-8">
        <div className="mb-6">
          <Title level={4}>Your QR Code</Title>
          <div className="my-4 p-4 bg-white rounded-lg shadow-sm inline-block">
            {qrError ? (
              <Result
                status="error"
                title="Error Generating QR Code"
                subTitle={qrError}
              />
            ) : (
              <QRCode value={qrCodeValue} />
            )}
          </div>
        </div>

        <div className="text-left">
          <Title level={4}>Registration Details</Title>
          <Divider />
          <Space direction="vertical" size="middle" style={{ width: '100%' }} className="p-4 bg-gray-50 rounded-lg">
            <div>
              <Text type="secondary">Name</Text>
              <div><Text strong>{visitor.name}</Text></div>
            </div>
            <div>
              <Text type="secondary">Email</Text>
              <div><Text strong>{visitor.email}</Text></div>
            </div>
            {visitor.phone && (
              <div>
                <Text type="secondary">Phone</Text>
                <div><Text strong>{visitor.phone}</Text></div>
              </div>
            )}
            {visitor.company && (
              <div>
                <Text type="secondary">Company</Text>
                <div><Text strong>{visitor.company}</Text></div>
              </div>
            )}
            <div>
              <Text type="secondary">Event</Text>
              <div><Text strong>{visitor.eventName}</Text></div>
            </div>
            {visitor.eventLocation && (
              <div>
                <Text type="secondary">Location</Text>
                <div><Text strong>{visitor.eventLocation}</Text></div>
              </div>
            )}
            {visitor.eventStartDate && visitor.eventEndDate && (
              <div>
                <Text type="secondary">Event Date</Text>
                <div><Text strong>{formatDate(visitor.eventStartDate)} - {formatDate(visitor.eventEndDate)}</Text></div>
              </div>
            )}
            {visitor.eventStartDate && !visitor.eventEndDate && (
              <div>
                <Text type="secondary">Event Date</Text>
                <div><Text strong>{formatDate(visitor.eventStartDate)}</Text></div>
              </div>
            )}
            <div>
              <Text type="secondary">Registration Date</Text>
              <div><Text strong>{formatDateTime(visitor.createdAt)}</Text></div>
            </div>
          </Space>
        </div>
      </div>
    );
  };

  const handleDownloadQR = async () => {
    if (!visitor) return;

    try {
      const qrCodeData = visitor._id ? visitor._id.toString().trim() : '';
      if (!qrCodeData) {
        throw new Error('Failed to generate QR code data');
      }

      // Create a temporary div to render QR code
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '240px';
      tempDiv.style.height = '280px';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.background = '#ffffff';
      tempDiv.style.padding = '20px';
      document.body.appendChild(tempDiv);

      // Create QR code container
      const qrContainer = document.createElement('div');
      qrContainer.id = 'qr-code-container';
      tempDiv.appendChild(qrContainer);

      // Create a promise that resolves when the QR code is rendered
      const qrCodePromise = new Promise<HTMLCanvasElement>((resolve, reject) => {
        try {
          // Render QR code using ReactDOM
          const root = ReactDOM.createRoot(qrContainer);
          root.render(
            <QRCode value={qrCodeData} />
          );

          // Wait for QR code to render
          setTimeout(() => {
            const svg = qrContainer.querySelector('svg');
            if (!svg) {
              reject(new Error('QR code SVG not found'));
              return;
            }

            // Convert SVG to canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 240;
            canvas.height = 280;

            // Create a blob URL for the SVG
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            // Create an image from the SVG
            const img = document.createElement('img') as HTMLImageElement;
            img.onload = () => {
              if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 20, 20, 200, 200);
                
                // Add the QR code text
                ctx.fillStyle = '#000000';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(qrCodeData, canvas.width / 2, 250);
              }
              URL.revokeObjectURL(svgUrl);
              resolve(canvas);
            };
            img.onerror = () => {
              URL.revokeObjectURL(svgUrl);
              reject(new Error('Failed to load QR code image'));
            };
            img.src = svgUrl;
          }, 100);
        } catch (error) {
          reject(error);
        }
      });

      // Wait for QR code to be rendered and converted to canvas
      const canvas = await qrCodePromise;

      // Create download link
      const link = document.createElement('a');
      link.download = `visitrack-qr-${visitor.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // Cleanup
      document.body.removeChild(tempDiv);
      message.success('QR code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      message.error('Failed to download QR code');
    }
  };

  const handleDownloadPDF = async () => {
    if (!visitor || !event) return;
    try {
      // Fetch badge template for this event
      const templates = await fetchApi(`badge-templates?eventId=${event._id}`);
      if (!Array.isArray(templates) || templates.length === 0) {
        message.error('No badge template found for this event.');
        return;
      }
      const templateId = templates[0]._id;

      // Prepare visitor data with IDs
      const visitorData = {
        ...visitor,
        visitorId: visitor._id,
        eventId: event._id,
        eventStartDate: formatDate(visitor.eventStartDate),
        eventEndDate: formatDate(visitor.eventEndDate),
        eventDate: visitor.eventEndDate ? `${formatDate(visitor.eventStartDate)} - ${formatDate(visitor.eventEndDate)}` : formatDate(visitor.eventStartDate),
        registrationDate: formatDateTime(visitor.createdAt)
      };

      // Use fetchApi to get the PDF blob directly
      const pdfBlob = await fetchApi('badge-templates/download', {
        method: 'POST',
        body: JSON.stringify({
          templateId,
          visitorData
        })
      });

      // Create download link for the blob
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `visitrack-badge-${visitor.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('Badge downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      message.error(error instanceof Error ? error.message : 'Failed to download PDF');
    }
  };

  const handlePrint = () => {
    // Implementation for printing the badge
    console.log('Printing badge');
  };

  // Helper function to format date
  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      // If it's already a string in DD-MM-YYYY format, return it as is
      if (typeof dateString === 'string' && /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/.test(dateString)) {
        return dateString;
      }
      
      // If it's already a string in DD-MM-YY format, convert to DD-MM-YYYY
      if (typeof dateString === 'string' && /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2}$/.test(dateString)) {
        const [day, month, year] = dateString.split('-');
        const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        return `${day}-${month}-${fullYear}`;
      }
      
      // If it's a Date object or other format, convert to DD-MM-YYYY
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid date';
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear());
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateString);
      return 'Invalid date';
    }
  };

  // Helper function to format date and time
  const formatDateTime = (dateString: string | Date | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      // If it's already a string in DD-MM-YY format, convert to DD-MM-YYYY for display
      if (typeof dateString === 'string' && /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2}$/.test(dateString)) {
        const [day, month, year] = dateString.split('-');
        const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        return `${day}-${month}-${fullYear}`;
      }
      
      // If it's already a string in DD-MM-YYYY format, return it as is
      if (typeof dateString === 'string' && /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/.test(dateString)) {
        return dateString;
      }
      
      // If it's a Date object or other format, convert to DD-MM-YYYY
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid date';
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear());
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateString);
      return 'Invalid date';
    }
  };

  const renderStepContent = () => {
    if (!event) {
      return null;
    }

    switch (currentStep) {
      case 0:
        return (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            <div className="lg:w-1/2 text-center lg:text-left">
              <div className="mb-6">
                <Image
                  src="/images/email-verification.svg"
                  alt="Email Verification"
                  width={300}
                  height={300}
                  className="mx-auto lg:mx-0"
                  onError={(e) => {
                    // Fallback to a placeholder if image doesn't exist
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='150' y='150' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='16'%3EEmail Verification%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Email Verification</h3>
              <p className="text-gray-600 mb-6">
                Enter your email address to receive a one-time password (OTP) for secure registration.
              </p>
            </div>
            <div className="lg:w-1/2">
              <Form
                form={form}
                onFinish={handleSendOTP}
                layout="vertical"
                className="w-full max-w-sm"
              >
                <Form.Item
                  name="email"
                  label={<div className="text-center">Email</div>}
                  rules={[
                    { required: true, message: 'Please enter your email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input prefix={<MailOutlined />} placeholder="Enter your email" />
                </Form.Item>
                <Form.Item className="text-center">
                  <Button type="primary" htmlType="submit" loading={loading} block>
                    Send OTP
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            <div className="lg:w-1/2 text-center lg:text-left">
              <div className="mb-6">
                <Image
                  src="/images/otp-verification.svg"
                  alt="OTP Verification"
                  width={300}
                  height={300}
                  className="mx-auto lg:mx-0"
                  onError={(e) => {
                    // Fallback to a placeholder if image doesn't exist
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='150' y='150' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='16'%3EOTP Verification%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">OTP Verification</h3>
              <p className="text-gray-600 mb-6">
                Check your email for the 6-digit verification code and enter it below to continue.
              </p>
            </div>
            <div className="lg:w-1/2">
              <Form
                form={form}
                onFinish={handleVerifyOTP}
                layout="vertical"
                className="w-full max-w-sm"
              >
                <Form.Item
                  name="otp"
                  label={<div className="text-center">Enter OTP</div>}
                  rules={[
                    { required: true, message: 'Please enter the OTP' },
                    { 
                      pattern: /^\d{6}$/,
                      message: 'Please enter a valid 6-digit OTP'
                    }
                  ]}
                >
                  <Input
                    prefix={<SafetyOutlined />}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    autoComplete="one-time-code"
                    disabled={isVerifying}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      if (value && !/^\d{6}$/.test(value)) {
                        form.setFields([{
                          name: 'otp',
                          errors: ['Please enter a valid 6-digit OTP']
                        }]);
                      } else {
                        form.setFields([{
                          name: 'otp',
                          errors: []
                        }]);
                      }
                    }}
                  />
                </Form.Item>

                <Form.Item className="text-center">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={isVerifying}
                    block
                    disabled={isVerifying}
                  >
                    {isVerifying ? 'Verifying...' : 'Verify OTP'}
                  </Button>
                </Form.Item>

                <div className="text-center">
                  <Button
                    type="link"
                    onClick={() => {
                      form.resetFields(['otp']);
                      setCurrentStep(0);
                    }}
                    disabled={isVerifying}
                  >
                    Back to Email
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        );

      case 2:
        if (!event.form) {
          return (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
              <div className="lg:w-1/2 text-center lg:text-left">
                <div className="mb-6">
                  <Image
                    src="/images/registration-form.svg"
                    alt="Registration Form"
                    width={300}
                    height={300}
                    className="mx-auto lg:mx-0"
                    onError={(e) => {
                      // Fallback to a placeholder if image doesn't exist
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='150' y='150' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='16'%3ERegistration Form%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Registration Details</h3>
                <p className="text-gray-600 mb-6">
                  Please fill in your personal and professional details to complete your registration.
                </p>
              </div>
              <div className="lg:w-1/2">
                <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email ID *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="interestedIn" className="block text-sm font-medium text-gray-700 mb-1">
                        Interested In *
                      </label>
                      <select
                        id="interestedIn"
                        name="interestedIn"
                        value={formData.interestedIn}
                        onChange={handleInputChange}
                        className="visitrack-input"
                        required
                      >
                        <option value="">Select an interest</option>
                        {interests.map((interest) => (
                          <option key={interest} value={interest}>
                            {interest}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                        Address *
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <select
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="visitrack-input"
                        required
                      >
                        <option value="">Select a country</option>
                        {countries.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        id="pinCode"
                        name="pinCode"
                        value={formData.pinCode}
                        onChange={handleInputChange}
                        className="visitrack-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[#4f46e5] hover:text-[#4338ca] font-medium"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="visitrack-button"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        }

        return (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            <div className="lg:w-1/2 text-center lg:text-left">
              <div className="mb-6">
                <Image
                  src="/images/registration-form.svg"
                  alt="Registration Form"
                  width={300}
                  height={300}
                  className="mx-auto lg:mx-0"
                  onError={(e) => {
                    // Fallback to a placeholder if image doesn't exist
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='150' y='150' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='16'%3ERegistration Form%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Registration Details</h3>
              <p className="text-gray-600 mb-6">
                Please fill in your personal and professional details to complete your registration.
              </p>
            </div>
            <div className="lg:w-1/2">
              <Form
                form={form}
                onFinish={handleRegistration}
                layout="vertical"
                className="registration-form"
                preserve={false}
                initialValues={{ source: 'Website' }}
              >
                <Form.Item name="source" hidden>
                  <Input />
                </Form.Item>

                <DynamicForm
                  template={{
                    id: 'registration-form',
                    name: 'Registration Form',
                    description: 'Please fill in your details',
                    fields: event.form.fields
                      .filter(field => field.id !== 'source')
                      .map(field => {
                        let fieldType: FormField['type'] = 'text';
                        const fieldTypeStr = field.type as string;
                        
                        switch (fieldTypeStr) {
                          case 'phone':
                          case 'tel':
                            fieldType = 'phone';
                            break;
                          case 'textarea':
                            fieldType = 'textarea';
                            break;
                          case 'number':
                            fieldType = 'number';
                            break;
                          case 'email':
                            fieldType = 'email';
                            break;
                          case 'date':
                            fieldType = 'date';
                            break;
                          case 'select':
                            fieldType = 'select';
                            break;
                          default:
                            fieldType = 'text';
                        }

                        return {
                          id: field.id,
                          label: field.label,
                          type: fieldType,
                          required: field.required,
                          placeholder: field.placeholder,
                          options: field.options ? field.options.map(opt => ({
                            label: String(opt),
                            value: String(opt)
                          })) : undefined,
                          validation: field.validation ? {
                            min: field.validation.min,
                            max: field.validation.max,
                            maxLength: field.validation.maxLength,
                            pattern: field.validation.pattern,
                            message: field.validation.message,
                          } : undefined
                        };
                      })
                  }}
                  form={form}
                  onFinish={handleRegistration}
                />
                
                <div className="text-center mt-6 space-x-4">
                  <Button
                    type="default"
                    onClick={() => {
                      form.resetFields();
                      setCurrentStep(1);
                    }}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isSubmitting) {
                        form.validateFields()
                          .then(validatedValues => {
                            console.log('Form validation successful, values:', validatedValues);
                            handleRegistration(validatedValues);
                          })
                          .catch(errorInfo => {
                            console.error('Form validation failed:', errorInfo);
                            message.error('Please fill in all required fields correctly');
                          });
                      }
                    }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                  </Button>
                </div>
              </Form>
            </div>
          </div>
        );

      case 3:
        if (!visitor) {
          return (
            <Result
              status="error"
              title="Visitor information not found"
              subTitle="Please try registering again."
            />
          );
        }
        return (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
            <div className="lg:w-1/2 text-center lg:text-left">
              <div className="mb-6">
                <Image
                  src="/images/registration-success.svg"
                  alt="Registration Success"
                  width={300}
                  height={300}
                  className="mx-auto lg:mx-0"
                  onError={(e) => {
                    // Fallback to a placeholder if image doesn't exist
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%23f3f4f6'/%3E%3Ctext x='150' y='150' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='16'%3ERegistration Success%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Registration Complete!</h3>
              <p className="text-gray-600 mb-6">
                Congratulations! You have successfully registered for {event.title}. Your QR code and badge are ready for download.
              </p>
            </div>
            <div className="lg:w-1/2">
              <div className="text-center">
                <Result
                  status="success"
                  title="Registration Successful!"
                  subTitle={`You have successfully registered for ${event.title}`}
                />
                <div className="mt-8">
                  <RegistrationDetails visitor={visitor} />
                </div>
                <div className="mt-4">
                  <Space size="middle">
                    <Button type="primary" onClick={handleDownloadQR} icon={<DownloadOutlined />}>
                      Download QR Code
                    </Button>
                    <Button onClick={handleDownloadPDF} icon={<DownloadOutlined />}>
                      Download Badge
                    </Button>
                  </Space>
                </div>
                <div className="mt-4">
                  <Space size="middle">
                    <Button
                      type="primary"
                      icon={<HomeOutlined />}
                      onClick={() => router.push('/events')}
                    >
                      Return to Events
                    </Button>
                  </Space>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate all fields
    if (!formData.name || !formData.email || !formData.companyName || !formData.address || 
        !formData.city || !formData.state || !formData.country || !formData.pinCode || 
        !formData.interestedIn) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    router.push('/badge');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen">
        <Head>
          <title>Register - Visitrack</title>
          <meta name="description" content="Register for our events" />
        </Head>
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="mt-4 h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Error - {event?.title || 'Event Registration'}</title>
        </Head>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <Result
              status="error"
              title="Failed to load event"
              subTitle={error}
              extra={[
                <Button
                  key="retry"
                  type="primary"
                  onClick={() => {
                    setError(null);
                    if (eventId) {
                      fetchEventDetails();
                    }
                  }}
                >
                  Try Again
                </Button>
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Loading - Event Registration</title>
        </Head>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <div className="text-center">
              <Spin size="large" />
              <div className="mt-4">Loading...</div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Event Not Found</title>
        </Head>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <Result
              status="404"
              title="Event not found"
              subTitle="The event you are looking for does not exist."
            />
          </Card>
        </div>
      </div>
    );
  }

  if (isAlreadyRegistered && visitor && event) {
    const eventTitle = event?.title || 'Event';
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Already Registered - {eventTitle}</title>
        </Head>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <Result
              status="info"
              title="Already Registered"
              subTitle={`You have already registered for ${eventTitle}`}
              icon={<SafetyOutlined style={{ color: '#1890ff' }} />}
              extra={[
                <div key="details" className="text-center">
                  <div className="mb-8">
                    <Title level={4}>Your QR Code</Title>
                    <div className="my-6 p-4 bg-white rounded-lg shadow-sm inline-block">
                      <QRCode value={visitor._id} size={200} />
                    </div>
                  </div>
                  
                  <div className="mb-8 text-left">
                    <Title level={4}>Registration Details</Title>
                    <Divider />
                    <Space direction="vertical" size="middle" style={{ width: '100%' }} className="p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Text type="secondary">Name</Text>
                        <div><Text strong>{visitor.name}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Email</Text>
                        <div><Text strong>{visitor.email}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Phone</Text>
                        <div><Text strong>{visitor.phone}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Event</Text>
                        <div><Text strong>{visitor.eventName}</Text></div>
                      </div>
                      <div>
                        <Text type="secondary">Location</Text>
                        <div><Text strong>{visitor.eventLocation}</Text></div>
                      </div>
                      {visitor.eventStartDate && visitor.eventEndDate && (
                        <div>
                          <Text type="secondary">Event Date</Text>
                          <div><Text strong>{formatDate(visitor.eventStartDate)} - {formatDate(visitor.eventEndDate)}</Text></div>
                        </div>
                      )}
                      {visitor.eventStartDate && !visitor.eventEndDate && (
                        <div>
                          <Text type="secondary">Event Date</Text>
                          <div><Text strong>{formatDate(visitor.eventStartDate)}</Text></div>
                        </div>
                      )}
                      <div>
                        <Text type="secondary">Registration Date</Text>
                        <div><Text strong>{formatDateTime(visitor.createdAt)}</Text></div>
                      </div>
                      {visitor.company && (
                        <div>
                          <Text type="secondary">Company</Text>
                          <div><Text strong>{visitor.company}</Text></div>
                        </div>
                      )}
                    </Space>
                  </div>
                  
                  <Space size="middle">
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadQR}
                      size="large"
                    >
                      Download QR Code
                    </Button>
                    <Button
                      type="default"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadPDF}
                      size="large"
                    >
                      Download Badge
                    </Button>
                  </Space>
                  
                  <div className="mt-4">
                    <Button
                      type="primary"
                      icon={<HomeOutlined />}
                      onClick={() => router.push('/events')}
                      size="large"
                    >
                      Return to Events
                    </Button>
                  </div>
                </div>
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Head>
        <title>Register - {event.title}</title>
        <meta name="description" content={`Register for ${event.title}`} />
      </Head>

      {/* Event Banner */}
      <div className="relative h-[400px] w-full">
        <div className="absolute inset-0">
          <div className="relative w-full h-full">
            <Image
              src={event.banner || "/images/event-banner.jpg"}
              alt="Event Banner"
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-90"
              priority
              onError={(e) => {
                // Fallback to default banner if event banner fails to load
                e.currentTarget.src = "/images/event-banner.jpg";
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 to-indigo-600 opacity-75"></div>
        </div>
        <div className="relative max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center w-full">
            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
              {event.title}
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-indigo-100 sm:max-w-3xl">
              {event.description || `Join us for ${event.title} featuring cutting-edge innovations and industry leaders.`}
            </p>
            <div className="mt-4 text-indigo-100">
              <p className="text-lg">
                {formatDate(event.startDate)} - {formatDate(event.endDate)}
              </p>
              {event.location && (
                <p className="text-lg mt-2">
                  📍 {event.location}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              {currentStep === 0 ? 'Email Verification' : 
               currentStep === 1 ? 'OTP Verification' : 
               currentStep === 2 ? 'Registration Details' : 'Registration Complete'}
            </h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              {currentStep === 0 ? 'Enter your email to receive a one-time password (OTP) for secure registration' : 
               currentStep === 1 ? 'Check your email for the 6-digit verification code and enter it below to continue' : 
               currentStep === 2 ? 'Complete your registration details to finalize your event registration' : 
               'Your registration has been completed successfully! You can now download your QR code and badge.'}
            </p>
          </div>

          <div className="bg-white shadow-xl rounded-xl p-6 sm:p-8 lg:p-12">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {currentStep < 3 && (
              <div className="mb-8">
                <Steps current={currentStep} className="max-w-2xl mx-auto">
                  <Step title="Email" icon={<MailOutlined />} />
                  <Step title="Verify" icon={<SafetyOutlined />} />
                  <Step title="Details" icon={<UserOutlined />} />
                  <Step title="Complete" icon={<UserOutlined />} />
                </Steps>
              </div>
            )}

            {renderStepContent()}
          </div>
        </div>
      </div>
      {contextHolder}
    </div>
  );
}