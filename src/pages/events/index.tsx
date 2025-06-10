import { useEffect, useState } from 'react';
import { Event } from '../../types/event';
import Link from 'next/link';
import Image from 'next/image';
import { message, Modal } from 'antd';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data);
    } catch (err) {
      setError('Error loading events. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = (event: Event) => {
    const now = new Date();
    const registrationDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
    
    // Check if registration deadline has passed
    if (registrationDeadline && now > registrationDeadline) {
      Modal.info({
        title: 'Registration Closed',
        content: 'On-site registration will be available at the event venue on the event date. Entry will require payment for an entry badge.',
        okText: 'OK',
      });
      return;
    }
    
    // If registration is still open, proceed to registration page
    window.location.href = `/events/${event._id}/register`;
  };

  const isRegistrationClosed = (event: Event) => {
    const now = new Date();
    const registrationDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;
    return registrationDeadline && now > registrationDeadline;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Loading events...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <Link
            href="/events/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create New Event
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No events found. Create your first event!
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <div
                key={event._id}
                className="bg-white overflow-hidden shadow rounded-lg"
              >                {event.banner && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={event.banner}
                      alt={event.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {event.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(event.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="mt-4">
                    <div className="text-sm text-gray-500">
                      <p>Location: {event.location}</p>
                      <p>Organizer: {event.organizer}</p>
                      {event.registrationDeadline && (
                        <p>Registration Deadline: {new Date(event.registrationDeadline).toLocaleDateString()}</p>
                      )}
                    </div>
                    <div className="mt-4">
                      {isRegistrationClosed(event) ? (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 