'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';

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

const Register = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const [events, setEvents] = useState([
    {
      id: '1',
      name: 'Tech Conference 2024',
      date: 'March 15-17, 2024',
      location: 'San Francisco, CA',
      image: '/images/events/tech-conference.jpg',
    },
    {
      id: '2',
      name: 'Marketing Summit',
      date: 'April 5-7, 2024',
      location: 'New York, NY',
      image: '/images/events/marketing-summit.jpg',
    },
    {
      id: '3',
      name: 'Startup Expo',
      date: 'May 10-12, 2024',
      location: 'Austin, TX',
      image: '/images/events/startup-expo.jpg',
    },
  ]);

  useEffect(() => {
    setMounted(true);
    const { event } = router.query;
    if (event) {
      setFormData(prev => ({ ...prev, eventId: event as string }));
    }
  }, [router.query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      setLoading(false);
      return;
    }

    // Simulate OTP sending
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStep(2);
    setLoading(false);
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      setLoading(false);
      return;
    }

    // Simulate OTP verification
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStep(3);
    setLoading(false);
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

  return (
    <div className="flex flex-col">
      <Head>
        <title>Register - Visitrack</title>
        <meta name="description" content="Register for your next event" />
      </Head>

      {/* Event Banner */}
      <div className="relative h-[400px] w-full">
        <div className="absolute inset-0">
          <div className="relative w-full h-full">
            <Image
              src="/images/event-banner.jpg"
              alt="Event Banner"
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-90"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 to-indigo-600 opacity-75"></div>
        </div>
        <div className="relative max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center w-full">
            <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl">
              Tech Expo 2024
            </h1>
            <p className="mt-6 max-w-lg mx-auto text-xl text-indigo-100 sm:max-w-3xl">
              Join the biggest tech event of the year featuring cutting-edge innovations and industry leaders.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-grow max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-extrabold text-gray-900">
              {step === 1 ? 'Phone Verification' : step === 2 ? 'OTP Verification' : 'Registration'}
            </h1>
            <p className="mt-4 text-gray-600">
              {step === 1 ? 'Enter your phone number to receive OTP' : 
               step === 2 ? 'Enter the 6-digit OTP sent to your phone' : 
               'Complete your registration details'}
            </p>
          </div>

          <div className="bg-white shadow-lg rounded-lg p-6 sm:p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div className="max-w-2xl mx-auto">
                  <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="visitrack-input"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div className="max-w-2xl mx-auto">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full visitrack-button"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleOTPSubmit} className="space-y-6">
                <div className="max-w-2xl mx-auto">
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                    OTP
                  </label>
                  <input
                    type="text"
                    id="otp"
                    name="otp"
                    value={formData.otp}
                    onChange={handleInputChange}
                    className="visitrack-input"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    required
                  />
                </div>
                <div className="max-w-2xl mx-auto">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full visitrack-button"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </form>
            )}

            {step === 3 && (
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
                    onClick={() => setStep(2)}
                    className="text-[#4f46e5] hover:text-[#4338ca] font-medium"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="visitrack-button"
                  >
                    {loading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 