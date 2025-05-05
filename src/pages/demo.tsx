'use client';

import { useState } from 'react';
import Head from 'next/head';

const Demo = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    eventSize: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Demo request submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="flex flex-col">
      <Head>
        <title>Request Demo - Visitrack</title>
        <meta name="description" content="Schedule a demo of Visitrack" />
      </Head>

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Request a Demo
            </h1>
            <p className="mt-4 text-xl text-gray-600">
              See how Visitrack can transform your event management
            </p>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="visitrack-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Work Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="visitrack-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="company"
                    id="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="visitrack-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="visitrack-input"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="eventSize" className="block text-sm font-medium text-gray-700">
                    Expected Event Size
                  </label>
                  <select
                    name="eventSize"
                    id="eventSize"
                    value={formData.eventSize}
                    onChange={handleChange}
                    className="visitrack-input"
                    required
                  >
                    <option value="">Select event size</option>
                    <option value="small">Small (up to 100 attendees)</option>
                    <option value="medium">Medium (101-500 attendees)</option>
                    <option value="large">Large (501-1000 attendees)</option>
                    <option value="enterprise">Enterprise (1000+ attendees)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Additional Information
                  </label>
                  <textarea
                    name="message"
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    className="visitrack-input"
                    placeholder="Tell us about your event management needs"
                  />
                </div>
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  className="visitrack-button w-full sm:w-auto min-w-[200px]"
                >
                  Request Demo
                </button>
              </div>
            </form>
          </div>

          <div className="mt-12 text-center text-gray-600">
            <p className="text-sm">
              By requesting a demo, you agree to our{' '}
              <a href="/privacy" className="text-[#0066B3] hover:underline">Privacy Policy</a>{' '}
              and{' '}
              <a href="/terms" className="text-[#0066B3] hover:underline">Terms of Service</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demo; 