import { useEffect, useState } from 'react';
import { Event } from '../../types/event';
import Link from 'next/link';
import Image from 'next/image';
import { message, Modal } from 'antd';
import BadgeDownloadModal from '../../components/BadgeDownloadModal';
import RegistrationClosedModal from '../../components/RegistrationClosedModal';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [registrationClosedModalVisible, setRegistrationClosedModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      console.log('Fetching all events...');
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
      setError('Error loading events. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationClosedClick = (event: Event) => {
    setSelectedEvent(event);
    setRegistrationClosedModalVisible(true);
  };

  const handleDownloadBadgeClick = () => {
    setRegistrationClosedModalVisible(false);
    setBadgeModalVisible(true);
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
      setSelectedEvent(event);
      setRegistrationClosedModalVisible(true);
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
          <div className="space-y-12">
            {/* Upcoming Events */}
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Events</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((event) => (
                    <div
                      key={event._id}
                      className="bg-white overflow-hidden shadow rounded-lg"
                    >
                      {event.banner && (
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.status === 'cancelled' 
                              ? 'bg-red-100 text-red-800' 
                              : event.status === 'upcoming' 
                              ? 'bg-green-100 text-green-800'
                              : event.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {event.status === 'cancelled' ? 'Cancelled' : 
                             event.status === 'upcoming' ? 'Upcoming' :
                             event.status === 'draft' ? 'Draft' : 'Published'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {event.startDate} - {event.endDate}
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
                              <p>Registration Deadline: {event.registrationDeadline}</p>
                            )}
                          </div>
                          <div className="mt-4">
                            {event.status === 'cancelled' ? (
                              <button
                                onClick={() => handleRegisterClick(event)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 cursor-pointer"
                              >
                                Event Cancelled
                              </button>
                            ) : isRegistrationClosed(event) ? (
                              <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                  onClick={() => handleRegistrationClosedClick(event)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                              >
                                Registration Closed
                              </button>
                                <button
                                  onClick={() => handleRegisterClick(event)}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                                >
                                  Download Badge
                                </button>
                              </div>
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
              </div>
            )}

            {/* Ongoing Events */}
            {ongoing.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Ongoing Events</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {ongoing.map((event) => (
                    <div
                      key={event._id}
                      className="bg-white overflow-hidden shadow rounded-lg"
                    >
                      {event.banner && (
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.status === 'cancelled' 
                              ? 'bg-red-100 text-red-800' 
                              : event.status === 'upcoming' 
                              ? 'bg-green-100 text-green-800'
                              : event.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {event.status === 'cancelled' ? 'Cancelled' : 
                             event.status === 'upcoming' ? 'Upcoming' :
                             event.status === 'draft' ? 'Draft' : 'Published'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {event.startDate} - {event.endDate}
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
                              <p>Registration Deadline: {event.registrationDeadline}</p>
                            )}
                          </div>
                          <div className="mt-4">
                            {event.status === 'cancelled' ? (
                              <button
                                onClick={() => handleRegisterClick(event)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 cursor-pointer"
                              >
                                Event Cancelled
                              </button>
                            ) : isRegistrationClosed(event) ? (
                              <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                  onClick={() => handleRegistrationClosedClick(event)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 cursor-pointer"
                              >
                                Registration Closed
                              </button>
                                <button
                                  onClick={() => handleRegisterClick(event)}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                                >
                                  Download Badge
                                </button>
                              </div>
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
              </div>
            )}

            {/* Past Events */}
            {past.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Past Events</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {past.map((event) => (
                    <div
                      key={event._id}
                      className="bg-white overflow-hidden shadow rounded-lg opacity-75"
                    >
                      {event.banner && (
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.status === 'cancelled' 
                              ? 'bg-red-100 text-red-800' 
                              : event.status === 'upcoming' 
                              ? 'bg-green-100 text-green-800'
                              : event.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {event.status === 'cancelled' ? 'Cancelled' : 
                             event.status === 'upcoming' ? 'Upcoming' :
                             event.status === 'draft' ? 'Draft' : 'Published'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {event.startDate} - {event.endDate}
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
                              <p>Registration Deadline: {event.registrationDeadline}</p>
                            )}
                          </div>
                          <div className="mt-4">
                            <button
                              disabled
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-400 cursor-not-allowed"
                            >
                              Event Ended
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Registration Closed Modal */}
        {selectedEvent && (
          <RegistrationClosedModal
            visible={registrationClosedModalVisible}
            onCancel={() => setRegistrationClosedModalVisible(false)}
            onDownloadBadge={handleDownloadBadgeClick}
            event={selectedEvent}
          />
        )}

        {/* Badge Download Modal */}
        {selectedEvent && (
          <BadgeDownloadModal
            visible={badgeModalVisible}
            onCancel={() => setBadgeModalVisible(false)}
            event={selectedEvent}
          />
        )}
      </div>
    </div>
  );
} 