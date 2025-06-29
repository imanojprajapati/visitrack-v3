'use client';

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import VideoBackground from '../components/VideoBackground';
import { Event } from '../types/event';
import { message, Modal } from 'antd';

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface Client {
  name: string;
  logo: string;
}

const Home = () => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [features, setFeatures] = useState<Feature[]>([
    {
      title: 'Easy Registration',
      description: 'Streamline your event registration process with our user-friendly platform.',
      icon: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Real-time Analytics',
      description: 'Get instant insights into your event attendance and engagement.',
      icon: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    },
    {
      title: 'Quick Check-in',
      description: 'Efficient check-in process with QR code scanning and digital badges.',
      icon: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
    },
  ]);

  const [clients, setClients] = useState<Client[]>([
    { 
      name: 'Google', 
      logo: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    },
    { 
      name: 'Amazon', 
      logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    },
    { 
      name: 'Apple', 
      logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    },
    { 
      name: 'Microsoft', 
      logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    },
    { 
      name: 'Meta', 
      logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    },
    { 
      name: 'Netflix', 
      logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80',
    },
  ]);

  const testimonialsRef = useRef<HTMLDivElement>(null);
  const [openFAQs, setOpenFAQs] = useState<boolean[]>([false, false, false, false]);

  const toggleFAQ = (index: number) => {
    setOpenFAQs(prev => {
      const newState = [...prev];
      newState[index] = !newState[index];
      return newState;
    });
  };

  useEffect(() => {
    setMounted(true);
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      console.log('Fetching all events for home page...');
      const response = await fetch('/api/events?admin=true');
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      console.log('Fetched events:', data);
      console.log('Number of events:', data.length);
      // Handle new API response format with events and pagination
      const eventsData = data.events || data;
      // Filter out draft events for public display
      const filteredEvents = Array.isArray(eventsData) 
        ? eventsData.filter(event => event.status !== 'draft')
        : [];
      setEvents(filteredEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load upcoming events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = (event: Event) => {
    const now = new Date();
    let registrationDeadline = null;
    
    // Check if event is cancelled
    if (event.status === 'cancelled') {
      Modal.info({
        title: 'Event Cancelled',
        content: 'This event has been cancelled. Registration is not available.',
        okText: 'OK',
      });
      return;
    }
    
    // Parse registration deadline if it exists
    if (event.registrationDeadline) {
      try {
        // Parse DD-MM-YYYY format to Date object
        const [day, month, year] = event.registrationDeadline.split('-').map(Number);
        registrationDeadline = new Date(year, month - 1, day);
      } catch (error) {
        console.error('Error parsing registration deadline:', error);
      }
    }
    
    // Check if registration deadline has passed
    if (registrationDeadline && now > registrationDeadline) {
      Modal.info({
        title: 'Registration Closed',
        content: 'You are able to register for this event at the event location and event date with pay to entry badge.',
        okText: 'OK',
      });
      return;
    }
    
    // If registration is still open, proceed to registration page
    window.location.href = `/events/${event._id}/register`;
  };

  const isRegistrationClosed = (event: Event) => {
    const now = new Date();
    let registrationDeadline = null;
    
    // Parse registration deadline if it exists
    if (event.registrationDeadline) {
      try {
        // Parse DD-MM-YYYY format to Date object
        const [day, month, year] = event.registrationDeadline.split('-').map(Number);
        registrationDeadline = new Date(year, month - 1, day);
      } catch (error) {
        console.error('Error parsing registration deadline:', error);
      }
    }
    
    return registrationDeadline && now > registrationDeadline;
  };

  // Helper function to categorize events
  const categorizeEvents = (events: Event[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const upcoming: Event[] = [];
    const ongoing: Event[] = [];
    const past: Event[] = [];
    
    events.forEach(event => {
      try {
        // Parse event dates (DD-MM-YYYY format)
        const [startDay, startMonth, startYear] = event.startDate.split('-').map(Number);
        const [endDay, endMonth, endYear] = event.endDate.split('-').map(Number);
        
        const eventStartDate = new Date(startYear, startMonth - 1, startDay);
        const eventEndDate = new Date(endYear, endMonth - 1, endDay);
        
        if (eventStartDate > today) {
          upcoming.push(event);
        } else if (eventEndDate >= today) {
          ongoing.push(event);
        } else {
          past.push(event);
        }
      } catch (error) {
        console.error('Error parsing event date:', error);
        // If date parsing fails, treat as upcoming
        upcoming.push(event);
      }
    });
    
    // Sort each category by start date (ascending order)
    const sortByDate = (a: Event, b: Event) => {
      try {
        const [aDay, aMonth, aYear] = a.startDate.split('-').map(Number);
        const [bDay, bMonth, bYear] = b.startDate.split('-').map(Number);
        const aDate = new Date(aYear, aMonth - 1, aDay);
        const bDate = new Date(bYear, bMonth - 1, bDay);
        return aDate.getTime() - bDate.getTime();
      } catch (error) {
        return 0;
      }
    };
    
    return { 
      upcoming: upcoming.sort(sortByDate), 
      ongoing: ongoing.sort(sortByDate), 
      past: past.sort(sortByDate) 
    };
  };

  const { upcoming, ongoing, past } = categorizeEvents(events);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Visitrack - Streamline Your Events</title>
        <meta name="description" content="Streamline your events with Visitrack. Easy registration, check-in, and analytics in one platform." />
      </Head>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <VideoBackground />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Streamline Your Events with Visitrack
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Simplify event management with our all-in-one platform. From registration to analytics, we've got you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register" className="btn btn-primary">
                Get Started
              </Link>
              <Link href="/events" className="btn btn-outline text-white border-white hover:bg-white/10">
                Browse Events
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
          Events
        </h2>
        {isLoading ? (
          <div className="text-center">Loading events...</div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : events.length === 0 ? (
          <div className="text-center text-gray-500">No events found</div>
        ) : (
          <div className="space-y-12">
            {/* Upcoming Events */}
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {upcoming.slice(0, 6).map((event) => (
                    <div
                      key={event._id}
                      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                    >
                      {event.banner && (
                        <div className="relative h-64">
                          <Image
                            src={event.banner}
                            alt={event.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Upcoming
                          </span>
                          <span className="text-sm text-gray-500">
                            {event.startDate} - {event.endDate}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {event.title}
                        </h3>
                        <p className="text-gray-600 mb-2">{event.location}</p>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                          {event.description}
                        </p>
                        {event.registrationDeadline && (
                          <p className="text-gray-500 text-sm mb-2">
                            Registration Deadline: {event.registrationDeadline}
                          </p>
                        )}
                        {event.status === 'cancelled' ? (
                          <button
                            onClick={() => handleRegisterClick(event)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 cursor-pointer"
                          >
                            Event Cancelled
                          </button>
                        ) : isRegistrationClosed(event) ? (
                          <button
                            onClick={() => handleRegisterClick(event)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                          >
                            Registration Closed
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRegisterClick(event)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#4338CA] hover:bg-[#3730A3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4338CA] cursor-pointer"
                          >
                            Register Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {upcoming.length > 6 && (
                  <div className="text-center mt-8">
                    <Link
                      href="/events"
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-[#4338CA] hover:bg-[#3730A3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4338CA]"
                    >
                      View All Events
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Ongoing Events */}
            {ongoing.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Ongoing Events</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {ongoing.slice(0, 3).map((event) => (
                    <div
                      key={event._id}
                      className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                    >
                      {event.banner && (
                        <div className="relative h-64">
                          <Image
                            src={event.banner}
                            alt={event.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Ongoing
                          </span>
                          <span className="text-sm text-gray-500">
                            {event.startDate} - {event.endDate}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {event.title}
                        </h3>
                        <p className="text-gray-600 mb-2">{event.location}</p>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                          {event.description}
                        </p>
                        {event.registrationDeadline && (
                          <p className="text-gray-500 text-sm mb-2">
                            Registration Deadline: {event.registrationDeadline}
                          </p>
                        )}
                        <button
                          onClick={() => handleRegisterClick(event)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#4338CA] hover:bg-[#3730A3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4338CA] cursor-pointer"
                        >
                          Register Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="relative h-64">
                  <Image
                    src={feature.icon}
                    alt={feature.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gray-50 py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            What Our Clients Say
          </h2>
          <div className="relative">
            <div className="flex overflow-x-hidden" ref={testimonialsRef}>
              <div className="flex space-x-8 animate-scroll">
                {[
                  {
                    name: "Sarah Johnson",
                    role: "Event Director",
                    company: "Tech Events Inc.",
                    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80",
                    quote: "Visitrack has revolutionized how we manage our events. The check-in process is seamless, and the analytics provide valuable insights."
                  },
                  {
                    name: "Michael Chen",
                    role: "Marketing Manager",
                    company: "Global Marketing Solutions",
                    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80",
                    quote: "The platform's ease of use and comprehensive features have made event management a breeze. Highly recommended!"
                  },
                  {
                    name: "Emily Rodriguez",
                    role: "Conference Organizer",
                    company: "Innovation Conferences",
                    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=200&q=80",
                    quote: "Visitrack's digital badges and real-time analytics have significantly improved our event experience. It's a game-changer!"
                  }
                ].map((testimonial, index) => (
                  <div key={index} className="flex-none w-[350px] bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex items-center mb-4">
                      <div className="relative h-12 w-12 rounded-full overflow-hidden mr-4">
                        <Image
                          src={testimonial.image}
                          alt={testimonial.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{testimonial.name}</h3>
                        <p className="text-sm text-gray-600">{testimonial.role}, {testimonial.company}</p>
                      </div>
                    </div>
                    <p className="text-gray-600 italic">"{testimonial.quote}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              question: "How does Visitrack handle event registration?",
              answer: "Visitrack provides a seamless registration process with customizable forms, payment integration, and automated confirmation emails. You can easily manage attendee information and track registration status in real-time."
            },
            {
              question: "Can I customize the check-in process?",
              answer: "Yes, Visitrack offers flexible check-in options including QR code scanning, manual check-in, and self-service kiosks. You can customize the process based on your event's needs."
            },
            {
              question: "What kind of analytics does Visitrack provide?",
              answer: "Visitrack provides comprehensive analytics including attendance tracking, engagement metrics, session popularity, and demographic data. All data is available in real-time and can be exported for further analysis."
            },
            {
              question: "Is Visitrack suitable for both small and large events?",
              answer: "Absolutely! Visitrack is designed to scale from small workshops to large conferences. The platform can handle any number of attendees while maintaining performance and reliability."
            }
          ].map((faq, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-lg">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left flex justify-between items-center"
              >
                <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                <svg
                  className={`w-6 h-6 transform transition-transform ${openFAQs[index] ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                className={`mt-4 text-gray-600 overflow-hidden transition-all duration-300 ${
                  openFAQs[index] ? 'max-h-96' : 'max-h-0'
                }`}
              >
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About Us Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[400px] rounded-lg overflow-hidden shadow-xl">
              <Image
                src="https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
                alt="About Visitrack"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                About Visitrack
              </h2>
              <p className="mt-4 text-lg text-gray-500">
                Visitrack is a leading event management platform that helps organizations streamline their event processes. Our mission is to make event management simple, efficient, and enjoyable for everyone involved.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-500">
                    Easy-to-use platform for event registration and management
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-500">
                    Real-time analytics and reporting for better decision making
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="ml-3 text-base text-gray-500">
                    Secure and reliable platform trusted by leading organizations
                  </p>
                </div>
              </div>
              <div className="mt-8">
                <Link
                  href="/about"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Section */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
          Trusted by
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {[
            { 
              name: 'Google', 
              logo: '/images/clients/google.svg',
            },
            { 
              name: 'Amazon', 
              logo: '/images/clients/amazon.svg',
            },
            { 
              name: 'Apple', 
              logo: '/images/clients/apple.svg',
            },
            { 
              name: 'Microsoft', 
              logo: '/images/clients/microsoft.svg',
            },
            { 
              name: 'Meta', 
              logo: '/images/clients/meta.svg',
            },
            { 
              name: 'Netflix', 
              logo: '/images/clients/netflix.svg',
            }
          ].map((client, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-300"
            >
              <div className="relative" style={{ width: 120, height: 40 }}>
                <Image
                  src={client.logo}
                  alt={client.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Home; 