'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

const CheckinManagement = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen">
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
    <div className="min-h-screen">
      <Head>
        <title>Check-in Management - Visitrack</title>
        <meta name="description" content="Efficient check-in process with QR code scanning and real-time attendance tracking" />
      </Head>

      {/* Hero Section */}
      <div className="relative h-[500px] w-full">
        <Image
          src="/images/features/checkin.jpg"
          alt="Check-in Management"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Check-in Management
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-6">
              Streamline event check-ins with QR code scanning and real-time tracking
            </p>
            <Link href="/demo" className="visitrack-button text-lg px-8 py-3">
              Get Started
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
              Effortless Event Check-ins
            </h2>
            <p className="text-lg text-gray-500 mb-6">
              Transform your event check-in process with our advanced QR code scanning system. Say goodbye to long queues and manual processes, and hello to instant, accurate attendance tracking.
            </p>
            <p className="text-lg text-gray-500 mb-8">
              Our check-in management system provides real-time attendance monitoring, automated badge printing, and comprehensive reporting to make your event operations seamless.
            </p>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-600">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="ml-3 text-base text-gray-500">
                  Lightning-fast QR code scanning for instant check-ins
                </p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-600">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="ml-3 text-base text-gray-500">
                  Real-time attendance tracking and analytics
                </p>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-green-100 text-green-600">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <p className="ml-3 text-base text-gray-500">
                  Automated badge printing and digital credentials
                </p>
              </li>
            </ul>
          </div>
          <div className="relative h-[400px] rounded-lg overflow-hidden shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
              alt="QR Code Check-in"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Check-in Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V4a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1zm12 0h2a1 1 0 001-1V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v3a1 1 0 001 1zM5 20h2a1 1 0 001-1v-3a1 1 0 00-1-1H5a1 1 0 00-1 1v3a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">QR Code Scanning</h3>
              <p className="text-gray-500">
                Advanced QR code scanning technology for instant attendee check-ins using smartphones or dedicated scanners.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Real-time Tracking</h3>
              <p className="text-gray-500">
                Monitor attendance in real-time with live dashboards showing check-in rates, capacity, and attendee flow.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v2a1 1 0 01-1 1h-1v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8H3a1 1 0 01-1-1V5a1 1 0 011-1h4zM9 3v1h6V3H9zm3 6a1 1 0 011 1v6a1 1 0 11-2 0v-6a1 1 0 011-1z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Badge Printing</h3>
              <p className="text-gray-500">
                Automatic badge printing upon check-in with customizable templates and attendee information.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Security Validation</h3>
              <p className="text-gray-500">
                Secure check-in process with attendee verification and duplicate detection to prevent unauthorized access.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Mobile-First Design</h3>
              <p className="text-gray-500">
                Optimized for mobile devices allowing staff to manage check-ins from anywhere at the event venue.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
              <p className="text-gray-500">
                Comprehensive analytics and reporting on check-in patterns, peak times, and attendance metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Process Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate QR Codes</h3>
              <p className="text-gray-500">
                Unique QR codes are automatically generated for each registered attendee and sent via email.
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Scan at Event</h3>
              <p className="text-gray-500">
                Staff scan QR codes using mobile devices or dedicated scanners for instant check-in verification.
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track & Report</h3>
              <p className="text-gray-500">
                Real-time tracking of all check-ins with instant reporting and analytics available on your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-[#00B2E3] to-[#4f46e5] rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Transform Your Event Check-in Experience
          </h2>
          <p className="text-xl text-white mb-6">
            Eliminate queues and streamline your event operations with our advanced check-in system.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/demo" className="bg-white text-[#4f46e5] px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors">
              Get Demo
            </Link>
            <Link href="/contact" className="border-2 border-white text-white px-8 py-3 rounded-md font-semibold hover:bg-white hover:text-[#4f46e5] transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckinManagement; 