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

      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl lg:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that's right for you and start managing events like a pro
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="relative bg-gray-100 rounded-lg p-1 flex w-full max-w-xs sm:max-w-sm">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`relative flex-1 rounded-md py-2 px-3 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:z-10 transition-all duration-200 ${
                billingCycle === 'monthly'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`relative flex-1 rounded-md py-2 px-3 text-sm font-medium whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:z-10 transition-all duration-200 ${
                billingCycle === 'yearly'
                  ? 'bg-[#4f46e5] text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="mt-12 space-y-6 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-5xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative border rounded-lg shadow-sm divide-y divide-gray-200 transition-all duration-200 hover:shadow-md ${
                plan.popular 
                  ? 'border-[#4f46e5] ring-2 ring-[#4f46e5] ring-opacity-20' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#4f46e5] text-white">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="p-6">
                <h2 className="text-xl leading-6 font-semibold text-gray-900">
                  {plan.name}
                </h2>
                <p className="mt-3 text-sm text-gray-500">{plan.description}</p>
                <div className="mt-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-extrabold text-gray-900">
                      ${billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                    </span>
                    <span className="ml-1 text-lg font-medium text-gray-500">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="mt-1 text-sm text-green-600 font-medium">
                      Save ${(plan.monthlyPrice * 12) - plan.yearlyPrice} per year
                    </p>
                  )}
                </div>
                <Link
                  href="/register"
                  className={`mt-6 block w-full border border-transparent rounded-md py-3 px-4 text-sm font-semibold text-center transition-all duration-200 ${
                    plan.popular
                      ? 'bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-sm'
                      : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  Get started
                </Link>
              </div>
              <div className="px-6 pt-4 pb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  What's included
                </h3>
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start space-x-3">
                      <svg
                        className="flex-shrink-0 h-4 w-4 text-[#4f46e5] mt-0.5"
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
                      <span className="text-sm text-gray-600 leading-5">{feature}</span>
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