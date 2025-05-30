import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, Input, Button, message, Steps, Form, Typography, Space, Divider, Result } from 'antd';
import { MailOutlined, SafetyOutlined, UserOutlined, QrcodeOutlined, PrinterOutlined, DownloadOutlined } from '@ant-design/icons';
import { QRCodeComponent } from '../../../lib/qrcode';
import { jsPDF } from 'jspdf';
import DynamicForm from '../../../components/DynamicForm';
import { Event } from '../../../types/event';
import { Visitor } from '../../../types/visitor';
import ReactDOM from 'react-dom/client';

const { Title, Text } = Typography;
const { Step } = Steps;

export default function EventRegistration() {
  const router = useRouter();
  const { eventId } = router.query;
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [form] = Form.useForm();

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
      } else {
        console.log('No form data available');
      }
    }
  }, [currentStep, event]);

  const fetchEventDetails = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch event details');
      const data = await response.json();
      console.log('Event data received:', data);
      if (!data.form) {
        console.error('No form data in event response');
        message.error('This event has no registration form');
        return;
      }
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      message.error('Failed to load event details');
    }
  };

  const handleSendOTP = async (values: { email: string }) => {
    setLoading(true);
    try {
      // First check if user is already registered
      const checkResponse = await fetch('/api/visitors/check-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, eventId }),
      });

      if (!checkResponse.ok) throw new Error('Failed to check registration status');
      
      const { isRegistered, visitor: existingVisitor } = await checkResponse.json();
      
      if (isRegistered) {
        setVisitor(existingVisitor);
        setIsAlreadyRegistered(true);
        setCurrentStep(3); // Skip to QR code step
        message.info('You are already registered for this event');
        return;
      }

      // If not registered, proceed with OTP
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      });

      if (!response.ok) throw new Error('Failed to send OTP');
      
      setCurrentStep(1);
      message.success('OTP sent to your email');
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (values: { otp: string }) => {
    setLoading(true);
    try {
      const email = form.getFieldValue('email');
      console.log('Verifying OTP for email:', email);
      console.log('OTP value:', values.otp);

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: values.otp,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('OTP verification failed:', data);
        throw new Error(data.message || 'Failed to verify OTP');
      }
      
      if (!event?.form) {
        console.error('No form data available for event:', event);
        message.error('This event has no registration form');
        return;
      }
      
      console.log('OTP verified successfully, proceeding to registration form');
      setCurrentStep(2);
      message.success('OTP verified successfully');
    } catch (error) {
      console.error('Error in OTP verification:', error);
      if (error instanceof Error) {
        if (error.message.includes('No valid OTP found')) {
          message.error('OTP has expired. Please request a new OTP.');
        } else if (error.message.includes('Too many failed attempts')) {
          message.error('Too many failed attempts. Please request a new OTP.');
        } else if (error.message.includes('Invalid OTP')) {
          message.error('Invalid OTP. Please try again.');
        } else {
          message.error(error.message);
        }
      } else {
        message.error('Failed to verify OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (values: any) => {
    setLoading(true);
    try {
      // Format form data to match the expected structure
      const formData = Object.entries(values).reduce((acc, [key, value]) => {
        // Find the field definition to get the label
        const field = event?.form?.fields.find(f => f.id === key);
        if (field) {
          acc[key] = {
            label: field.label,
            value: value
          };
        }
        return acc;
      }, {} as Record<string, { label: string; value: any }>);

      // Extract name and phone from form data
      const name = formData.name?.value || '';
      const phone = formData.phone?.value || '';

      const response = await fetch('/api/visitors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name,
          email: form.getFieldValue('email'),
          phone,
          formData
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register');
      }
      
      const data = await response.json();
      setVisitor(data.visitor);
      setCurrentStep(3);
      message.success('Registration successful!');
    } catch (error) {
      console.error('Error:', error);
      message.error(error instanceof Error ? error.message : 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!visitor) return;

    try {
      // Create a temporary div to render QR code
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '200px';
      tempDiv.style.height = '200px';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.background = '#ffffff';
      document.body.appendChild(tempDiv);

      // Create QR code container
      const qrContainer = document.createElement('div');
      qrContainer.id = 'qr-code-container';
      tempDiv.appendChild(qrContainer);

      // Create a promise that resolves when the QR code is rendered
      const qrCodePromise = new Promise<HTMLCanvasElement>((resolve, reject) => {
        // Render QR code using ReactDOM
        const root = ReactDOM.createRoot(qrContainer);
        root.render(
          <QRCodeComponent
            data={{
              visitorId: visitor._id,
              eventId: visitor.eventId,
              registrationId: visitor.registrationId,
              name: visitor.name,
              company: visitor.company,
              eventName: visitor.eventName
            }}
            size={200}
          />
        );

        // Function to convert SVG to canvas
        const convertSVGToCanvas = (svgElement: SVGElement): Promise<HTMLCanvasElement> => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Failed to get canvas context');

          // Set canvas size
          canvas.width = 200;
          canvas.height = 200;

          // Create an image from the SVG
          const img = new Image();
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          return new Promise((resolveCanvas, rejectCanvas) => {
            img.onload = () => {
              // Draw the image on canvas
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              URL.revokeObjectURL(url);
              resolveCanvas(canvas);
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              rejectCanvas(new Error('Failed to load SVG image'));
            };
            img.src = url;
          });
        };

        // Function to check for SVG and convert it
        const checkAndConvertSVG = async () => {
          const svgElement = qrContainer.querySelector('svg');
          if (svgElement) {
            try {
              const canvas = await convertSVGToCanvas(svgElement);
              resolve(canvas);
            } catch (error) {
              reject(error);
            }
          } else {
            // Try again after a short delay
            setTimeout(checkAndConvertSVG, 50);
          }
        };

        // Start checking for SVG
        checkAndConvertSVG();

        // Set a timeout to reject if SVG doesn't appear
        setTimeout(() => {
          reject(new Error('QR code generation timed out'));
        }, 5000); // 5 second timeout
      });

      // Wait for QR code to be rendered and converted to canvas
      const canvas = await qrCodePromise;

      // Create download link
      const link = document.createElement('a');
      link.download = `visitrack-qr-${visitor.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      // Cleanup
      const root = (tempDiv as any)._reactRootContainer;
      if (root) {
        root.unmount();
      }
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      message.error(error instanceof Error ? error.message : 'Failed to download QR code');
    }
  };

  const handlePrintPDF = async () => {
    if (!visitor || !event) return;

    try {
      // Create a temporary div to render QR code
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '200px';
      tempDiv.style.height = '200px';
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.background = '#ffffff';
      document.body.appendChild(tempDiv);

      // Create QR code container
      const qrContainer = document.createElement('div');
      qrContainer.id = 'qr-code-container';
      tempDiv.appendChild(qrContainer);

      // Create a promise that resolves when the QR code is rendered
      const qrCodePromise = new Promise<HTMLCanvasElement>((resolve, reject) => {
        // Render QR code using ReactDOM
        const root = ReactDOM.createRoot(qrContainer);
        root.render(
          <QRCodeComponent
            data={{
              visitorId: visitor._id,
              eventId: visitor.eventId,
              registrationId: visitor.registrationId,
              name: visitor.name,
              company: visitor.company,
              eventName: visitor.eventName
            }}
            size={200}
          />
        );

        // Function to convert SVG to canvas
        const convertSVGToCanvas = (svgElement: SVGElement): Promise<HTMLCanvasElement> => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Failed to get canvas context');

          // Set canvas size
          canvas.width = 200;
          canvas.height = 200;

          // Create an image from the SVG
          const img = new Image();
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          return new Promise((resolveCanvas, rejectCanvas) => {
            img.onload = () => {
              // Draw the image on canvas
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              URL.revokeObjectURL(url);
              resolveCanvas(canvas);
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              rejectCanvas(new Error('Failed to load SVG image'));
            };
            img.src = url;
          });
        };

        // Function to check for SVG and convert it
        const checkAndConvertSVG = async () => {
          const svgElement = qrContainer.querySelector('svg');
          if (svgElement) {
            try {
              const canvas = await convertSVGToCanvas(svgElement);
              resolve(canvas);
            } catch (error) {
              reject(error);
            }
          } else {
            // Try again after a short delay
            setTimeout(checkAndConvertSVG, 50);
          }
        };

        // Start checking for SVG
        checkAndConvertSVG();

        // Set a timeout to reject if SVG doesn't appear
        // Set a timeout to reject if canvas doesn't appear
        setTimeout(() => {
          reject(new Error('QR code generation timed out'));
        }, 5000); // 5 second timeout
      });

      // Wait for QR code to be rendered
      const canvas = await qrCodePromise;

      // Create PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Add event name at the top
      doc.setFontSize(24);
      doc.text(event.title, pageWidth / 2, 30, { align: 'center' as const });
      
      // Add QR code in the middle
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - 150) / 2, 50, 150, 150);
      
      // Add VISITRACK text at the bottom
      doc.setFontSize(20);
      doc.text('VISITRACK', pageWidth / 2, pageHeight - 30, { align: 'center' as const });
      
      // Add visitor details in small text
      doc.setFontSize(10);
      const visitorDetails = [
        `Name: ${visitor.name}`,
        `Email: ${visitor.email}`,
        `Phone: ${visitor.phone}`,
        `Event: ${visitor.eventName}`,
        `Location: ${visitor.eventLocation}`,
        `Date: ${new Date(visitor.eventStartDate).toLocaleDateString()}`,
        `Registration Date: ${new Date(visitor.createdAt).toLocaleString()}`
      ];

      visitorDetails.forEach((detail, index) => {
        doc.text(detail, 20, pageHeight - 50 + (index * 5));
      });
      
      doc.save(`visitrack-${event.title}-${visitor.name}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error(error instanceof Error ? error.message : 'Failed to generate PDF');
    } finally {
      // Cleanup
      const tempDiv = document.getElementById('qr-code-container')?.parentElement;
      if (tempDiv) {
        const root = (tempDiv as any)._reactRootContainer;
        if (root) {
          root.unmount();
        }
        document.body.removeChild(tempDiv);
      }
    }
  };

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isAlreadyRegistered && visitor) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Head>
          <title>Already Registered - {event.title}</title>
        </Head>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-lg">
            <Result
              status="info"
              title="Already Registered"
              subTitle={`You have already registered for ${event.title}`}
              extra={[
                <div key="qr" className="text-center">
                  <div className="mb-8 qr-code">
                    <QRCodeComponent
                      data={{
                        visitorId: visitor._id,
                        eventId: visitor.eventId,
                        registrationId: visitor.registrationId,
                        name: visitor.name,
                        company: visitor.company,
                        eventName: visitor.eventName
                      }}
                      size={200}
                    />
                  </div>
                  <div className="mb-8 text-left">
                    <Title level={4}>Registration Details</Title>
                    <Divider />
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text><strong>Name:</strong> {visitor.name}</Text>
                      <Text><strong>Email:</strong> {visitor.email}</Text>
                      <Text><strong>Phone:</strong> {visitor.phone}</Text>
                      <Text><strong>Event:</strong> {visitor.eventName}</Text>
                      <Text><strong>Location:</strong> {visitor.eventLocation}</Text>
                      <Text><strong>Date:</strong> {new Date(visitor.eventStartDate).toLocaleDateString()}</Text>
                      <Text><strong>Registration Date:</strong> {new Date(visitor.createdAt).toLocaleString()}</Text>
                    </Space>
                  </div>
                  <Space>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadQR}
                      size="large"
                    >
                      Download QR Code
                    </Button>
                    <Button
                      icon={<PrinterOutlined />}
                      onClick={handlePrintPDF}
                      type="primary"
                      size="large"
                    >
                      Print PDF
                    </Button>
                  </Space>
                </div>
              ]}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Head>
        <title>Register for {event?.title || 'Event'} - Visitrack</title>
      </Head>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <div className="text-center mb-8">
            <Title level={2}>{event.title}</Title>
            <Text type="secondary">{event.description}</Text>
            <div className="mt-4">
              <Text type="secondary">
                Location: {event.location} | 
                Date: {new Date(event.startDate).toLocaleDateString()} | 
                Capacity: {event.visitors}/{event.capacity}
              </Text>
            </div>
          </div>

          <Steps current={currentStep} className="mb-8">
            <Step title="Email" icon={<MailOutlined />} />
            <Step title="Verify" icon={<SafetyOutlined />} />
            <Step title="Register" icon={<UserOutlined />} />
            <Step title="QR Code" icon={<QrcodeOutlined />} />
          </Steps>

          {currentStep === 0 && (
            <Form form={form} onFinish={handleSendOTP} layout="vertical">
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Enter your email" size="large" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  Send OTP
                </Button>
              </Form.Item>
            </Form>
          )}

          {currentStep === 1 && (
            <Form form={form} onFinish={handleVerifyOTP} layout="vertical">
              <Form.Item
                name="otp"
                label="OTP"
                rules={[
                  { required: true, message: 'Please enter the OTP' },
                  { len: 6, message: 'OTP must be 6 digits' },
                ]}
              >
                <Input prefix={<SafetyOutlined />} placeholder="Enter 6-digit OTP" size="large" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  Verify OTP
                </Button>
              </Form.Item>
            </Form>
          )}

          {currentStep === 2 && (
            <>
              {event?.form ? (
                <Form form={form} onFinish={handleRegistration} layout="vertical">
                  <DynamicForm fields={event.form.fields} form={form} />
                  <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block size="large">
                      Complete Registration
                    </Button>
                  </Form.Item>
                </Form>
              ) : (
                <div className="text-center py-8">
                  <Result
                    status="error"
                    title="Registration Form Not Available"
                    subTitle="This event does not have a registration form configured."
                  />
                </div>
              )}
            </>
          )}

          {currentStep === 3 && visitor && (
            <div className="text-center">
              <div className="mb-8 qr-code">
                <QRCodeComponent
                  data={{
                    visitorId: visitor._id,
                    eventId: visitor.eventId,
                    registrationId: visitor.registrationId,
                    name: visitor.name,
                    company: visitor.company,
                    eventName: visitor.eventName
                  }}
                  size={200}
                />
              </div>
              <div className="mb-8 text-left">
                <Title level={4}>Registration Details</Title>
                <Divider />
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text><strong>Name:</strong> {visitor.name}</Text>
                  <Text><strong>Email:</strong> {visitor.email}</Text>
                  <Text><strong>Phone:</strong> {visitor.phone}</Text>
                  <Text><strong>Event:</strong> {visitor.eventName}</Text>
                  <Text><strong>Location:</strong> {visitor.eventLocation}</Text>
                  <Text><strong>Date:</strong> {new Date(visitor.eventStartDate).toLocaleDateString()}</Text>
                  <Text><strong>Registration Date:</strong> {new Date(visitor.createdAt).toLocaleString()}</Text>
                </Space>
              </div>
              <Space size="middle">
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadQR}
                  size="large"
                >
                  Download QR Code
                </Button>
                <Button
                  icon={<PrinterOutlined />}
                  onClick={handlePrintPDF}
                  type="primary"
                  size="large"
                >
                  Print PDF
                </Button>
              </Space>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 