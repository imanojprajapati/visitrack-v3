'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';

const Badge = () => {
  const [mounted, setMounted] = useState(false);
  const [badgeData, setBadgeData] = useState({
    name: 'John Doe',
    eventName: 'Tech Conference 2024',
    role: 'Attendee',
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VISITRACK-BADGE-123', // Using a QR code generator service
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col">
        <Head>
          <title>Print Badge - Visitrack</title>
          <meta name="description" content="Print your event badge" />
        </Head>
        <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <title>Print Badge - Visitrack</title>
        <meta name="description" content="Print your event badge" />
      </Head>

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
              Your Event Badge
            </h1>
            <p className="mt-4 text-xl text-gray-600">
              Print or download your badge for the event
            </p>
          </div>

          {/* Badge Preview */}
          <div className="bg-white p-8 rounded-lg shadow-lg border-2 border-gray-200 max-w-md mx-auto">
            <div className="relative bg-white aspect-[3/4] flex flex-col items-center justify-between p-6">
              {/* Logo and Name Section */}
              <div className="text-center w-full">
                <div className="relative w-48 h-12 mx-auto mb-8">
                  <Image
                    src="/images/logo.png"
                    alt="Visitrack"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {badgeData.name}
                </h2>
                <p className="text-xl text-gray-600 mb-4">{badgeData.role}</p>
                <h3 className="text-2xl font-semibold text-[#4f46e5]">
                  {badgeData.eventName}
                </h3>
              </div>

              {/* QR Code Section */}
              <div className="mt-8 relative w-40 h-40">
                <Image
                  src={badgeData.qrCode}
                  alt="QR Code"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => window.print()}
              className="px-6 py-2 bg-[#4f46e5] text-white rounded-md hover:bg-[#4338ca] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f46e5] transition-colors duration-200"
            >
              Print Badge
            </button>
            <button
              onClick={() => {/* Handle download */}}
              className="px-6 py-2 border-2 border-[#4f46e5] text-[#4f46e5] rounded-md hover:bg-[#4f46e5] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f46e5] transition-colors duration-200"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Badge; 