import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, Spin, message } from 'antd';

interface Visitor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  eventName: string;
  eventLocation: string;
  eventStartDate: Date;
  eventEndDate: Date;
  status: 'registered' | 'checked_in' | 'checked_out' | 'cancelled';
  checkInTime?: Date;
  checkOutTime?: Date;
}

export default function VisitorDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisitor = async () => {
      if (!id) return;

      try {
        const response = await fetch(`/api/visitors/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            message.error('Visitor not found');
          } else {
            throw new Error('Failed to fetch visitor details');
          }
          return;
        }
        const data = await response.json();
        setVisitor(data);
      } catch (error) {
        console.error('Error fetching visitor:', error);
        message.error('Failed to load visitor details');
      } finally {
        setLoading(false);
      }
    };

    fetchVisitor();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <p className="text-center text-gray-600">Visitor not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card className="shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{visitor.name}</h1>
            <p className="text-gray-600">{visitor.eventName}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="mt-1 text-gray-900">{visitor.phone}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="mt-1 text-gray-900">{visitor.email}</p>
            </div>

            {visitor.age && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Age</label>
                <p className="mt-1 text-gray-900">{visitor.age}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-500">Event Location</label>
              <p className="mt-1 text-gray-900">{visitor.eventLocation}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Event Date</label>
              <p className="mt-1 text-gray-900">
                {new Date(visitor.eventStartDate).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500">Status</label>
              <p className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${visitor.status === 'checked_in' ? 'bg-green-100 text-green-800' :
                    visitor.status === 'checked_out' ? 'bg-red-100 text-red-800' :
                    visitor.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'}`}>
                  {visitor.status.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </span>
              </p>
            </div>

            {visitor.checkInTime && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Check-in Time</label>
                <p className="mt-1 text-gray-900">
                  {new Date(visitor.checkInTime).toLocaleString()}
                </p>
              </div>
            )}

            {visitor.checkOutTime && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Check-out Time</label>
                <p className="mt-1 text-gray-900">
                  {new Date(visitor.checkOutTime).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
} 