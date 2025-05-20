import EventForm from '../../components/EventForm';
import Link from 'next/link';

export default function CreateEventPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            href="/events"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Back to Events
          </Link>
        </div>
        <EventForm />
      </div>
    </div>
  );
} 