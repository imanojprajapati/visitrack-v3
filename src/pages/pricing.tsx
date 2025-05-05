'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const Pricing = () => {
  const [mounted, setMounted] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    setMounted(true);
  }, []);

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for small events and startups',
      monthlyPrice: 49,
      yearlyPrice: 490,
      features: [
        'Up to 100 attendees',
        'Basic event management',
        'Email support',
        'QR code badges',
        'Basic analytics',
      ],
    },
    {
      name: 'Professional',
      description: 'Ideal for growing businesses',
      monthlyPrice: 99,
      yearlyPrice: 990,
      features: [
        'Up to 500 attendees',
        'Advanced event management',
        'Priority support',
        'Custom branding',
        'Advanced analytics',
        'API access',
      ],
      popular: true,
    },
    {
      name: 'Enterprise',
      description: 'For large organizations and events',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      features: [
        'Unlimited attendees',
        'Full event management suite',
        '24/7 support',
        'Custom integrations',
        'White-label solution',
        'Dedicated account manager',
      ],
    },
  ];

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
    <div className="flex flex-col">
      <Head>
        <title>Pricing - Visitrack</title>
        <meta name="description" content="Choose the right plan for your needs" />
      </Head>

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-xl text-gray-500">
            Choose the plan that's right for you
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="relative bg-white rounded-lg p-0.5 flex">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`relative w-1/2 rounded-md py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:z-10 sm:w-auto sm:px-8 ${
                billingCycle === 'monthly'
                  ? 'bg-[#4f46e5] text-white'
                  : 'text-gray-900'
              }`}
            >
              Monthly billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`relative w-1/2 rounded-md py-2 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:z-10 sm:w-auto sm:px-8 ${
                billingCycle === 'yearly'
                  ? 'bg-[#4f46e5] text-white'
                  : 'text-gray-900'
              }`}
            >
              Yearly billing
            </button>
          </div>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 ${
                plan.popular ? 'border-[#4f46e5]' : ''
              }`}
            >
              <div className="p-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  {plan.name}
                </h2>
                <p className="mt-4 text-sm text-gray-500">{plan.description}</p>
                <p className="mt-8">
                  <span className="text-4xl font-extrabold text-gray-900">
                    ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-base font-medium text-gray-500">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </p>
                <Link
                  href="/register"
                  className="mt-8 block w-full bg-[#4f46e5] border border-transparent rounded-md py-2 text-sm font-semibold text-white text-center hover:bg-[#4338ca]"
                >
                  Get started
                </Link>
              </div>
              <div className="px-6 pt-6 pb-8">
                <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
                  What's included
                </h3>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex space-x-3">
                      <svg
                        className="flex-shrink-0 h-5 w-5 text-[#4f46e5]"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-gray-500">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing; 