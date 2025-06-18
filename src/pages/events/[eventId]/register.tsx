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

// QR Code component with error boundary
const QRCode: React.FC<{ value: string; size?: number }> = ({ value, size = 80 }) => {
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
  const [formRenderKey, setFormRenderKey] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, any>>({
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

  useEffect(() => {
    console.log('formData changed:', formData);
  }, [formData]);

  // Simple debugging useEffect that doesn't cause infinite loops
  useEffect(() => {
    console.log('=== STATE CHANGE DEBUG ===');
    console.log('currentStep:', currentStep);
    console.log('visitor:', visitor ? 'SET' : 'NULL');
    console.log('isAlreadyRegistered:', isAlreadyRegistered);
    console.log('==================');
  }, [currentStep, visitor, isAlreadyRegistered]);

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
        throw new Error('Event not found - please check the event URL');
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
      console.log('Event set successfully:', eventData.title);
    } catch (error) {
      console.error('Error fetching event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load event details';
      setError(errorMessage);
      messageApi.error(errorMessage);
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
      console.log('Current formData:', formData);
      if (event?.form) {
        console.log('Form fields:', event.form.fields);
        console.log('Form field IDs:', event.form.fields.map(f => f.id));
        console.log('Form field types:', event.form.fields.map(f => ({ id: f.id, type: f.type })));
      } else {
        console.log('No form data available');
      }
    }
  }, [currentStep, event, formData]);

  // Restore focus after form re-render
  useEffect(() => {
    if (focusedField && currentStep === 2) {
      const element = document.getElementById(focusedField);
      if (element) {
        element.focus();
        // Set cursor position to end of input (only for text inputs that support selection)
        if (element instanceof HTMLInputElement) {
          const inputType = element.type;
          // Only set selection range for text inputs that support it
          if (inputType === 'text' || inputType === 'password' || inputType === 'search' || inputType === 'tel' || inputType === 'url') {
            const length = element.value.length;
            element.setSelectionRange(length, length);
          }
        } else if (element instanceof HTMLTextAreaElement) {
          const length = element.value.length;
          element.setSelectionRange(length, length);
        }
      }
    }
  }, [formData, focusedField, currentStep]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInputFocus = (fieldName: string) => {
    setFocusedField(fieldName);
  };

  const handleInputBlur = () => {
    setFocusedField(null);
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
        console.log('=== ALREADY REGISTERED USER ===');
        console.log('checkResponse:', checkResponse);
        console.log('visitor object:', checkResponse.visitor);
        
        // Validate visitor object before proceeding
        if (!checkResponse.visitor || !checkResponse.visitor._id) {
          console.log('❌ ERROR: Invalid visitor object in check response');
          console.log('Proceeding with normal registration flow instead');
          // Don't set currentStep to 3, continue with normal flow
        } else {
          console.log('✅ Valid visitor object, setting currentStep to 3');
          setVisitor(checkResponse.visitor);
          setIsAlreadyRegistered(true);
          setCurrentStep(3); // Move to the final step
          messageApi.info('You are already registered for this event');
          return;
        }
        console.log('==================');
      }

      // If not registered, proceed with OTP
      await fetchApi('auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email: values.email, eventId }),
      });
      
      // Set email in formData for later use
      setFormData(prev => ({ ...prev, email: values.email }));
      
      setCurrentStep(1);
      messageApi.success('OTP sent to your email');
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process request');
      messageApi.error(error instanceof Error ? error.message : 'Failed to process request');
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

      // Get email from formData
      const email = formData.email;
      if (!email) {
        setError('Email is required');
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

      // OTP verification successful - now fetch center data
      try {
        const centerResponse = await fetchApi('centers/find-by-email', {
          method: 'POST',
          body: JSON.stringify({ email })
        });

        if (centerResponse.found && centerResponse.center) {
          // Populate form with center data
          const centerData = centerResponse.center;
          console.log('Center data found:', centerData);
          
          const updatedFormData = {
            ...formData,
            name: centerData.name,
            email: centerData.email,
            phone: centerData.phone,
            phoneNumber: centerData.phone,
            company: centerData.company,
            companyName: centerData.company,
            city: centerData.city,
            state: centerData.state,
            country: centerData.country,
            pincode: centerData.pincode,
            pinCode: centerData.pincode,
            source: 'Website'
          };
          
          console.log('Updated form data:', updatedFormData);
          setFormData(updatedFormData);
          setFormRenderKey(prev => prev + 1); // Force form re-render only when center data is found
          
          // Add a small delay to ensure state updates properly
          setTimeout(() => {
            console.log('Form data should now be updated, checking current state...');
          }, 100);
          
          messageApi.success('OTP verified successfully! Your information has been pre-filled from our database.');
        } else {
          console.log('No center data found for email:', email);
          // Don't update formRenderKey when no center data is found to prevent form re-rendering
          messageApi.success('OTP verified successfully! Please fill in your details.');
        }
      } catch (centerError) {
        console.error('Error fetching center data:', centerError);
        // Continue with registration even if center data fetch fails
        messageApi.success('OTP verified successfully! Please fill in your details.');
      }

      // Move to registration form step
      console.log('=== OTP VERIFICATION SUCCESS ===');
      console.log('Setting currentStep to 2 (registration form)');
      console.log('Current formData:', formData);
      console.log('Ensuring visitor is null before showing form...');
      setVisitor(null); // Ensure visitor is null for new registration
      setIsAlreadyRegistered(false); // Ensure this is false for new registration
      console.log('==================');
      setCurrentStep(2);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Failed to verify OTP');
      messageApi.error(error instanceof Error ? error.message : 'Failed to verify OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegistration = async (formValues: any) => {
    if (isSubmitting) {
      console.log('Registration already in progress');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Add debug logging
      console.log('Form values received:', formValues);
      console.log('Event form fields:', event?.form?.fields);
      console.log('Event ID:', eventId);

      // Use formValues directly instead of getting from Ant Design form
      console.log('Using form values:', formValues);

      // Extract required fields from formValues with better field mapping
      const name = formValues.name || formValues.fullName;
      const email = formValues.email || formValues.emailId;
      const phone = formValues.phone || formValues.phoneNumber || formValues.phoneNumber;
      const source = 'Website'; // Always set source to Website

      console.log('Extracted values:', { name, email, phone, source });

      if (!name || name.trim() === '') {
        throw new Error('Name is required');
      }

      if (!email || email.trim() === '') {
        throw new Error('Email is required');
      }

      // Phone validation - make it more flexible
      if (!phone || phone.trim() === '') {
        throw new Error('Phone Number is required');
      }

      // Create form data structure based on whether event has form configuration or not
      let formData: Record<string, any> = {};

      if (event?.form?.fields) {
        // Use dynamic form configuration
        formData = event.form.fields.reduce((acc: Record<string, any>, field) => {
          // For source field, always use 'Website'
          if (field.id === 'source') {
            acc[field.id] = {
              label: field.label,
              value: source
            };
            return acc;
          }

          // Map form field IDs to formValues with multiple possible field names
          let value;
          switch (field.id) {
            case 'name':
            case 'fullName':
              value = formValues.name || formValues.fullName;
              break;
            case 'email':
            case 'emailId':
              value = formValues.email || formValues.emailId;
              break;
            case 'phone':
            case 'phoneNumber':
              value = formValues.phone || formValues.phoneNumber;
              break;
            case 'company':
            case 'companyName':
              value = formValues.company || formValues.companyName;
              break;
            case 'city':
              value = formValues.city;
              break;
            case 'state':
              value = formValues.state;
              break;
            case 'country':
              value = formValues.country;
              break;
            case 'pincode':
            case 'pinCode':
              value = formValues.pincode || formValues.pinCode;
              break;
            case 'address':
              value = formValues.address;
              break;
            case 'interestedIn':
              value = formValues.interestedIn;
              break;
            default:
              value = formValues[field.id];
          }
          
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
      } else {
        // Use basic form structure for events without form configuration
        formData = {
          name: {
            label: 'Full Name',
            value: name
          },
          email: {
            label: 'Email',
            value: email
          },
          phone: {
            label: 'Phone Number',
            value: phone
          },
          company: {
            label: 'Company Name',
            value: formValues.company || formValues.companyName || ''
          },
          city: {
            label: 'City',
            value: formValues.city || ''
          },
          state: {
            label: 'State',
            value: formValues.state || ''
          },
          country: {
            label: 'Country',
            value: formValues.country || ''
          },
          pincode: {
            label: 'PIN Code',
            value: formValues.pincode || formValues.pinCode || ''
          },
          address: {
            label: 'Address',
            value: formValues.address || ''
          },
          interestedIn: {
            label: 'Interested In',
            value: formValues.interestedIn || ''
          }
        };
      }

      // Add source field if not already present
      if (!formData.source) {
        formData.source = {
          label: 'Source',
          value: source
        };
      }

      console.log('Formatted form data:', formData);
      console.log('Submitting registration with eventId:', eventId);

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

      console.log('Registration response:', response);

      if (!response.visitor) {
        throw new Error('Failed to create visitor registration');
      }

      setVisitor(response.visitor);
      console.log('=== REGISTRATION SUCCESS ===');
      console.log('Setting visitor:', response.visitor);
      console.log('Setting currentStep to 3 (success)');
      console.log('==================');
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
      // Create badge image instead of PDF
      await generateBadgeImage();
    } catch (error) {
      console.error('Error downloading badge:', error);
      message.error(error instanceof Error ? error.message : 'Failed to download badge');
    }
  };

  const generateBadgeImage = async () => {
    if (!visitor || !event) return;

    try {
      // Create canvas with specified dimensions
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Set badge dimensions: 288px width, 384px height
      canvas.width = 288;
      canvas.height = 384;

      // Fill background with white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add border
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      // ROW 1: Event Banner (height: 80px, width: 100%) - Image only
      const bannerHeight = 80;
      
      console.log('Event banner URL:', event.banner); // Debug log
      
      // Try to load banner image with better error handling
      let bannerLoaded = false;
      if (event.banner && event.banner.trim() !== '') {
        try {
          // Use HTMLImageElement instead of Image to avoid Next.js conflict
          const bannerImg = document.createElement('img') as HTMLImageElement;
          
          // Set up the image loading promise
          const imageLoadPromise = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              console.log('Banner image load timeout');
              resolve(false);
            }, 5000); // 5 second timeout
            
            bannerImg.onload = () => {
              clearTimeout(timeout);
              console.log('Banner image loaded successfully');
              try {
                // Draw the banner image to fill the entire banner area
                ctx.drawImage(bannerImg, 0, 0, canvas.width, bannerHeight);
                bannerLoaded = true;
                resolve(true);
              } catch (drawError) {
                console.error('Error drawing banner image:', drawError);
                resolve(false);
              }
            };
            
            bannerImg.onerror = (error) => {
              clearTimeout(timeout);
              console.error('Banner image failed to load:', error);
              resolve(false);
            };
            
            // Set the image source
            bannerImg.crossOrigin = 'anonymous';
            bannerImg.src = event.banner || '';
          });
          
          bannerLoaded = await imageLoadPromise;
        } catch (error) {
          console.error('Error in banner image loading:', error);
          bannerLoaded = false;
        }
      }
      
      // If banner didn't load, draw fallback
      if (!bannerLoaded) {
        console.log('Drawing fallback banner');
        ctx.fillStyle = '#4338ca';
        ctx.fillRect(0, 0, canvas.width, bannerHeight);
        
        // Add event title on fallback banner
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        const eventTitle = event.title.length > 35 ? event.title.substring(0, 35) + '...' : event.title;
        ctx.fillText(eventTitle, canvas.width / 2, bannerHeight / 2 + 5);
      }

      // ROW 2: QR Code (80px x 80px, centered) - Use actual QR library
      const qrSize = 80;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = bannerHeight + 15;
      const qrCodeValue = visitor._id ? visitor._id.toString() : visitor.email;
      
      console.log('Generating QR code for value:', qrCodeValue); // Debug log
      
      try {
        // Import QR code library dynamically
        const QRCode = (await import('qrcode')).default;
        
        // Generate QR code as data URL
        const qrDataUrl = await QRCode.toDataURL(qrCodeValue, {
          width: qrSize,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Create image from QR code data URL using HTMLImageElement
        const qrImg = document.createElement('img') as HTMLImageElement;
        
        const qrLoadPromise = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            console.log('QR code load timeout');
            resolve(false);
          }, 3000);
          
          qrImg.onload = () => {
            clearTimeout(timeout);
            console.log('QR code image loaded successfully');
            try {
              ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
              resolve(true);
            } catch (drawError) {
              console.error('Error drawing QR code:', drawError);
              resolve(false);
            }
          };
          
          qrImg.onerror = (error) => {
            clearTimeout(timeout);
            console.error('QR code image failed to load:', error);
            resolve(false);
          };
          
          qrImg.src = qrDataUrl;
        });
        
        const qrLoaded = await qrLoadPromise;
        
        if (!qrLoaded) {
          // Fallback: draw simple QR placeholder
          console.log('Drawing QR code fallback');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(qrX, qrY, qrSize, qrSize);
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2;
          ctx.strokeRect(qrX, qrY, qrSize, qrSize);
          ctx.fillStyle = '#000000';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('QR CODE', qrX + qrSize/2, qrY + qrSize/2);
        }
        
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
        // Draw fallback QR placeholder
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX, qrY, qrSize, qrSize);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(qrX, qrY, qrSize, qrSize);
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR CODE', qrX + qrSize/2, qrY + qrSize/2);
      }

      // ROW 3: Registration Details with Visitor ID
      const detailsStartY = qrY + qrSize + 20;
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'left';
      ctx.font = '12px Arial'; // Increased from 10px to 12px
      
      let currentY = detailsStartY;
      const leftMargin = 15;
      const lineHeight = 14; // Increased line height for better spacing

      // Visitor ID (new field) - Show full ID
      ctx.fillStyle = '#6b7280';
      ctx.fillText('ID:', leftMargin, currentY);
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 10px Arial'; // Smaller font for full ID to fit
      const visitorId = visitor._id ? visitor._id.toString() : 'N/A';
      ctx.fillText(visitorId, leftMargin + 25, currentY);
      currentY += lineHeight;

      // Name
      ctx.font = '12px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('Name:', leftMargin, currentY);
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 12px Arial';
      const visitorName = visitor.name.length > 28 ? visitor.name.substring(0, 28) + '...' : visitor.name;
      ctx.fillText(visitorName, leftMargin + 40, currentY);
      currentY += lineHeight;

      // Email
      ctx.font = '12px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('Email:', leftMargin, currentY);
      ctx.fillStyle = '#1f2937';
      const email = visitor.email.length > 26 ? visitor.email.substring(0, 26) + '...' : visitor.email;
      ctx.fillText(email, leftMargin + 40, currentY);
      currentY += lineHeight;

      // Phone
      if (visitor.phone) {
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Phone:', leftMargin, currentY);
        ctx.fillStyle = '#1f2937';
        ctx.fillText(visitor.phone, leftMargin + 40, currentY);
        currentY += lineHeight;
      }

      // Company
      if (visitor.company) {
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Company:', leftMargin, currentY);
        ctx.fillStyle = '#1f2937';
        const company = visitor.company.length > 23 ? visitor.company.substring(0, 23) + '...' : visitor.company;
        ctx.fillText(company, leftMargin + 55, currentY);
        currentY += lineHeight;
      }

      // Event Name
      ctx.fillStyle = '#6b7280';
      ctx.fillText('Event:', leftMargin, currentY);
      ctx.fillStyle = '#1f2937';
      const eventName = (visitor.eventName || event.title || 'Event').length > 26 ? 
        (visitor.eventName || event.title || 'Event').substring(0, 26) + '...' : 
        (visitor.eventName || event.title || 'Event');
      ctx.fillText(eventName, leftMargin + 40, currentY);
      currentY += lineHeight;

      // Location
      if (visitor.eventLocation) {
        ctx.fillStyle = '#6b7280';
        ctx.fillText('Location:', leftMargin, currentY);
        ctx.fillStyle = '#1f2937';
        const location = visitor.eventLocation.length > 23 ? visitor.eventLocation.substring(0, 23) + '...' : visitor.eventLocation;
        ctx.fillText(location, leftMargin + 55, currentY);
        currentY += lineHeight;
      }

      // Event Date
      ctx.fillStyle = '#6b7280';
      ctx.fillText('Date:', leftMargin, currentY);
      ctx.fillStyle = '#1f2937';
      const eventDate = visitor.eventEndDate ? 
        `${formatDate(visitor.eventStartDate)} - ${formatDate(visitor.eventEndDate)}` : 
        formatDate(visitor.eventStartDate);
      const dateText = eventDate.length > 26 ? eventDate.substring(0, 26) + '...' : eventDate;
      ctx.fillText(dateText, leftMargin + 40, currentY);
      currentY += lineHeight;

      // Registration Date
      ctx.fillStyle = '#6b7280';
      ctx.fillText('Registered:', leftMargin, currentY);
      ctx.fillStyle = '#1f2937';
      const regDate = formatDateTime(visitor.createdAt);
      ctx.fillText(regDate, leftMargin + 65, currentY);

      // ROW 4: VISITOR text at bottom (28px font size, centered)
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#1f2937';
      ctx.textAlign = 'center';
      ctx.fillText('VISITOR', canvas.width / 2, canvas.height - 15);

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `visitrack-badge-${visitor.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
          messageApi.success('Badge downloaded successfully');
        }
      }, 'image/png');

    } catch (error) {
      console.error('Error generating badge image:', error);
      messageApi.error('Failed to generate badge image');
    }
  };

  const handlePrint = () => {
    // Implementation for printing the badge
    console.log('Printing badge');
  };

  const handleReturnToEvent = () => {
    window.location.href = 'https://www.visitrack.in/events';
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
              <Text type="secondary">Visitor ID</Text>
              <div><Text strong style={{ fontFamily: 'monospace', fontSize: '12px' }}>{visitor._id}</Text></div>
            </div>
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

  const renderStepContent = () => {
    if (!event) {
      console.log('renderStepContent: No event data available');
      return null;
    }

    console.log('renderStepContent: Rendering step', currentStep, 'for event:', event.title);
    console.log('renderStepContent: Event form configuration:', event.form);
    console.log('renderStepContent: Current formData:', formData);

    switch (currentStep) {
      case 0:
        console.log('renderStepContent: Rendering email verification step');
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-6">
              <Image
                src="/images/email-verification.svg"
                alt="Email Verification"
                width={50}
                height={50}
                className="mx-auto"
                onError={(e) => {
                  // Fallback to a placeholder if image doesn't exist
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23f3f4f6'/%3E%3Ctext x='25' y='25' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='8'%3EEmail%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Email Verification</h3>
            <p className="text-gray-600 mb-6">
              Enter your email address to receive a one-time password (OTP) for secure registration.
            </p>
            <div className="w-full max-w-sm">
              <Form
                form={form}
                onFinish={handleSendOTP}
                layout="vertical"
                className="w-full"
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
        console.log('renderStepContent: Rendering OTP verification step');
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-6">
              <Image
                src="/images/otp-verification.svg"
                alt="OTP Verification"
                width={50}
                height={50}
                className="mx-auto"
                onError={(e) => {
                  // Fallback to a placeholder if image doesn't exist
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23f3f4f6'/%3E%3Ctext x='25' y='25' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='8'%3EOTP%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">OTP Verification</h3>
            <p className="text-gray-600 mb-6">
              Check your email for the 6-digit verification code and enter it below to continue.
            </p>
            <div className="w-full max-w-sm">
              <Form
                form={form}
                onFinish={handleVerifyOTP}
                layout="vertical"
                className="w-full"
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
        console.log('renderStepContent: Rendering registration form step');
        console.log('renderStepContent: Event form configuration:', event.form);
        console.log('renderStepContent: Form data to be displayed:', formData);
        
        if (!event.form) {
          console.log('renderStepContent: Using basic form (no event.form configuration)');
          return (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-6">
                <Image
                  src="/images/registration-form.svg"
                  alt="Registration Form"
                  width={50}
                  height={50}
                  className="mx-auto"
                  onError={(e) => {
                    // Fallback to a placeholder if image doesn't exist
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23f3f4f6'/%3E%3Ctext x='25' y='25' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='8'%3EForm%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Registration Details</h3>
              <p className="text-gray-600 mb-6">
                Please fill in your personal and professional details to complete your registration.
              </p>
              <div className="w-full max-w-2xl text-left">
                <form onSubmit={handleFormSubmit} className="space-y-6" key={`form-${formRenderKey}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('name')}
                        onBlur={handleInputBlur}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        id="companyName"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('companyName')}
                        onBlur={handleInputBlur}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        Email ID *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('email')}
                        onBlur={handleInputBlur}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('phoneNumber')}
                        onBlur={handleInputBlur}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="interestedIn" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        Interested In *
                      </label>
                      <select
                        id="interestedIn"
                        name="interestedIn"
                        value={formData.interestedIn}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('interestedIn')}
                        onBlur={handleInputBlur}
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
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        Address *
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('address')}
                        onBlur={handleInputBlur}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        City *
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('city')}
                        onBlur={handleInputBlur}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        State *
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('state')}
                        onBlur={handleInputBlur}
                        className="visitrack-input"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        Country *
                      </label>
                      <select
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('country')}
                        onBlur={handleInputBlur}
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
                      <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        id="pinCode"
                        name="pinCode"
                        value={formData.pinCode}
                        onChange={handleInputChange}
                        onFocus={() => handleInputFocus('pinCode')}
                        onBlur={handleInputBlur}
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
        } else {
          console.log('renderStepContent: Using dynamic form (event.form configuration exists)');
          return (
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-6">
                <Image
                  src="/images/registration-form.svg"
                  alt="Registration Form"
                  width={50}
                  height={50}
                  className="mx-auto"
                  onError={(e) => {
                    // Fallback to a placeholder if image doesn't exist
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23f3f4f6'/%3E%3Ctext x='25' y='25' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='8'%3EForm%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Registration Details</h3>
              <p className="text-gray-600 mb-6">
                Please fill in your personal and professional details to complete your registration.
              </p>
              <div className="w-full max-w-2xl">
                <form onSubmit={handleFormSubmit} className="space-y-6" key={`dynamic-form-${formRenderKey}`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {event?.form?.fields?.map((field) => {
                      // Skip the source field - it should be automatically set to 'Website'
                      if (field.id === 'source') {
                        return null;
                      }
                      
                      const isFullWidth = field.type === 'textarea' || field.type === 'select';
                      
                      return (
                        <div 
                          key={field.id} 
                          className={isFullWidth ? 'col-span-1 md:col-span-2' : 'col-span-1'}
                        >
                          <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1 text-left">
                            {field.label} {field.required && '*'}
                          </label>
                          
                          {field.type === 'textarea' ? (
                            <textarea
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ''}
                              onChange={handleInputChange}
                              onFocus={() => handleInputFocus(field.id)}
                              onBlur={handleInputBlur}
                              className="visitrack-input"
                              rows={4}
                              required={field.required}
                              placeholder={field.placeholder}
                              readOnly={field.readOnly}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ''}
                              onChange={handleInputChange}
                              onFocus={() => handleInputFocus(field.id)}
                              onBlur={handleInputBlur}
                              className="visitrack-input"
                              required={field.required}
                              disabled={field.readOnly}
                            >
                              <option value="">Select {field.label.toLowerCase()}</option>
                              {field.options?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'email' ? (
                            <input
                              type="email"
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ''}
                              onChange={handleInputChange}
                              onFocus={() => handleInputFocus(field.id)}
                              onBlur={handleInputBlur}
                              className="visitrack-input"
                              required={field.required}
                              placeholder={field.placeholder}
                              readOnly={field.readOnly}
                            />
                          ) : field.type === 'phone' ? (
                            <input
                              type="tel"
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ''}
                              onChange={handleInputChange}
                              onFocus={() => handleInputFocus(field.id)}
                              onBlur={handleInputBlur}
                              className="visitrack-input"
                              required={field.required}
                              placeholder={field.placeholder}
                              readOnly={field.readOnly}
                            />
                          ) : field.type === 'number' ? (
                            <input
                              type="number"
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ''}
                              onChange={handleInputChange}
                              onFocus={() => handleInputFocus(field.id)}
                              onBlur={handleInputBlur}
                              className="visitrack-input"
                              required={field.required}
                              placeholder={field.placeholder}
                              readOnly={field.readOnly}
                              min={field.validation?.min}
                              max={field.validation?.max}
                            />
                          ) : field.type === 'date' ? (
                            <input
                              type="date"
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ''}
                              onChange={handleInputChange}
                              onFocus={() => handleInputFocus(field.id)}
                              onBlur={handleInputBlur}
                              className="visitrack-input"
                              required={field.required}
                              readOnly={field.readOnly}
                            />
                          ) : (
                            <input
                              type="text"
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ''}
                              onChange={handleInputChange}
                              onFocus={() => handleInputFocus(field.id)}
                              onBlur={handleInputBlur}
                              className="visitrack-input"
                              required={field.required}
                              placeholder={field.placeholder}
                              readOnly={field.readOnly}
                              maxLength={field.validation?.maxLength}
                            />
                          )}
                        </div>
                      );
                    })}
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

      case 3:
        console.log('=== CASE 3 DEBUG ===');
        console.log('Rendering case 3 (success step)');
        console.log('visitor:', visitor);
        console.log('currentStep:', currentStep);
        console.log('isAlreadyRegistered:', isAlreadyRegistered);
        console.log('event:', event);
        console.log('==================');
        
        // Only show success page if we have a valid visitor
        if (!visitor) {
          console.log('❌ ERROR: No visitor object in case 3!');
          console.log('This should not happen. The visitor should be set before reaching step 3.');
          
          // If we're not actually registered, redirect to registration form
          if (!isAlreadyRegistered) {
            console.log('User is not actually registered, redirecting to step 2 (registration form)');
            // Use setTimeout to avoid immediate state update during render
            setTimeout(() => {
              setCurrentStep(2);
            }, 0);
            return null; // Return null to prevent rendering while transitioning
          }
          
          // If we are marked as already registered but no visitor, show error
          console.log('User is marked as already registered but no visitor object. Showing error...');
          return (
            <div className="text-center">
              <Result
                status="error"
                title="Registration Error"
                subTitle="There was an issue with your registration. Please try again or contact support."
              />
              <div className="mt-6">
                <Space size="middle">
                  <Button 
                    type="primary"
                    onClick={() => {
                      console.log('User clicked to restart registration');
                      setCurrentStep(0);
                      setVisitor(null);
                      setIsAlreadyRegistered(false);
                    }}
                  >
                    Start Over
                  </Button>
                  <Button 
                    onClick={() => {
                      console.log('User clicked to go back to registration form');
                      setCurrentStep(2);
                    }}
                  >
                    Continue Registration
                  </Button>
                </Space>
              </div>
            </div>
          );
        }
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-6">
              <Image
                src="/images/registration-success.svg"
                alt="Registration Success"
                width={50}
                height={50}
                className="mx-auto"
                onError={(e) => {
                  // Fallback to a placeholder if image doesn't exist
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 50 50'%3E%3Crect width='50' height='50' fill='%23f3f4f6'/%3E%3Ctext x='25' y='25' text-anchor='middle' dy='.3em' fill='%236b7280' font-family='Arial' font-size='8'%3ERegistration%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Registration Complete!</h3>
            <p className="text-gray-600 mb-6">
              Congratulations! You have successfully registered for {event.title}. Your QR code and badge are ready for download.
            </p>
            <div className="mt-8">
              <RegistrationDetails visitor={visitor} />
            </div>
            {/* Action Buttons - Responsive Layout */}
            <div className="mt-6">
              <div className="mobile-button-container">
                <Button 
                  type="primary" 
                  onClick={handleDownloadQR} 
                  icon={<DownloadOutlined />}
                  size="large"
                  className="w-full sm:w-auto"
                >
                  Download QR Code
                </Button>
                <Button 
                  onClick={handleDownloadPDF} 
                  icon={<DownloadOutlined />}
                  size="large"
                  className="w-full sm:w-auto"
                >
                  Download Badge
                </Button>
                <Button
                  type="default"
                  icon={<HomeOutlined />}
                  onClick={handleReturnToEvent}
                  size="large"
                  className="w-full sm:w-auto"
                >
                  Return to Event
                </Button>
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
    
    // Clear any previous errors when starting form submission
    setError(null);
    
    // Call the actual registration function with formData
    await handleRegistration(formData);
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
                    setLoading(true);
                    if (eventId) {
                      fetchEventDetails();
                    }
                  }}
                >
                  Try Again
                </Button>,
                <Button
                  key="back"
                  onClick={() => router.push('/events')}
                >
                  Back to Events
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

  // Only show "Already Registered" page if user is actually registered AND we're not in the middle of registration
  if (isAlreadyRegistered && visitor && event && currentStep === 3) {
    const eventTitle = event?.title || 'Event';
    return (
      <div className="flex flex-col">
        <Head>
          <title>Already Registered - {eventTitle}</title>
        </Head>

        {/* Custom styles for mobile-responsive buttons */}
        <style jsx>{`
          @media (max-width: 640px) {
            .mobile-button-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%;
              max-width: 280px;
              margin: 0 auto;
            }
            
            .mobile-button-container .ant-btn {
              width: 100% !important;
              min-height: 48px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              font-weight: 500;
              margin-top: 10px;
            }
          }
          
          @media (min-width: 641px) {
            .mobile-button-container {
              display: flex;
              flex-direction: row;
              gap: 10px;
              align-items: center;
              justify-content: center;
              flex-wrap: wrap;
            }
          }
        `}</style>

        {/* Event Banner */}
        <div className="relative h-[350px] w-full">
          <div className="absolute inset-0">
            <div className="relative w-full h-full">
              <Image
                src={event?.banner || "/images/event-banner.jpg"}
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
                {event?.title || 'Event'}
              </h1>
              <p className="mt-6 max-w-lg mx-auto text-xl text-indigo-100 sm:max-w-3xl">
                {event?.description || `Join us for ${event?.title || 'Event'} featuring cutting-edge innovations and industry leaders.`}
              </p>
              <div className="mt-4 text-indigo-100">
                <p className="text-lg">
                  {formatDate(event?.startDate)} - {formatDate(event?.endDate)}
                </p>
                {event?.location && (
                  <p className="text-lg mt-2">
                    📍 {event.location}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-grow max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                      <QRCode value={visitor._id ? visitor._id.toString() : ''} size={200} />
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
                  
                  {/* Action Buttons - Responsive Layout */}
                  <div className="mobile-button-container">
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadQR}
                      size="large"
                      className="w-full sm:w-auto"
                    >
                      Download QR Code
                    </Button>
                    <Button
                      type="default"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadPDF}
                      size="large"
                      className="w-full sm:w-auto"
                    >
                      Download Badge
                    </Button>
                    <Button
                      type="default"
                      icon={<HomeOutlined />}
                      onClick={handleReturnToEvent}
                      size="large"
                      className="w-full sm:w-auto"
                    >
                      Return to Event
                    </Button>
                  </div>
                </div>
              ]}
            />
          </Card>
        </div>

        {/* Footer Banner */}
        <div className="relative h-[350px] w-full mt-8">
          <div className="absolute inset-0">
            <div className="relative w-full h-full">
              <Image
                src={event?.banner || "/images/event-banner.jpg"}
                alt="Event Footer Banner"
                fill
                style={{ objectFit: 'cover' }}
                className="opacity-80"
                priority
                onError={(e) => {
                  // Fallback to default banner if event banner fails to load
                  e.currentTarget.src = "/images/event-banner.jpg";
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 to-indigo-600 opacity-60"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Head>
        <title>Register - {event?.title || 'Event'}</title>
        <meta name="description" content={`Register for ${event?.title || 'Event'}`} />
      </Head>
      
      {/* Custom styles for mobile-responsive buttons */}
      <style jsx>{`
        @media (max-width: 640px) {
          .mobile-button-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-width: 280px;
            margin: 0 auto;
          }
          
          .mobile-button-container .ant-btn {
            width: 100% !important;
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 500;
            margin-top: 10px;
          }
        }
        
        @media (min-width: 641px) {
          .mobile-button-container {
            display: flex;
            flex-direction: row;
            gap: 10px;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
          }
        }
      `}</style>

      {/* Event Banner */}
      <div className="relative h-[350px] w-full">
        <div className="absolute inset-0">
          <div className="relative w-full h-full">
            <Image
              src={event?.banner || "/images/event-banner.jpg"}
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
              {event?.title || 'Event'}
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-indigo-100 sm:max-w-3xl">
              {event?.description || `Join us for ${event?.title || 'Event'} featuring cutting-edge innovations and industry leaders.`}
            </p>
            <div className="mt-4 text-indigo-100">
              <p className="text-lg">
                {formatDate(event?.startDate)} - {formatDate(event?.endDate)}
              </p>
              {event?.location && (
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

          {/* Progress Steps */}
          <div className="mb-8">
            <Steps current={currentStep} className="max-w-2xl mx-auto">
              <Steps.Step title="Email" description="Enter email" />
              <Steps.Step title="Verify" description="OTP verification" />
              <Steps.Step title="Details" description="Registration form" />
              <Steps.Step title="Complete" description="Registration done" />
            </Steps>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6">
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
              />
            </div>
          )}

          {/* Main Content */}
          <Card className="shadow-lg">
            {contextHolder}
            {renderStepContent()}
          </Card>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="relative h-[350px] w-full mt-8">
        <div className="absolute inset-0">
          <div className="relative w-full h-full">
            <Image
              src={event?.banner || "/images/event-banner.jpg"}
              alt="Event Footer Banner"
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-80"
              priority
              onError={(e) => {
                // Fallback to default banner if event banner fails to load
                e.currentTarget.src = "/images/event-banner.jpg";
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 to-indigo-600 opacity-60"></div>
        </div>
      </div>
    </div>
  );
}