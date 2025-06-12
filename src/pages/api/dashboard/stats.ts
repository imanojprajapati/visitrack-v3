import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Event from '../../../models/Event';
import mongoose from 'mongoose';

// Helper function to parse DD-MM-YYYY or DD-MM-YY format to Date
const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Check if it's in DD-MM-YYYY format
  const ddMMYYYYRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{4}$/;
  if (ddMMYYYYRegex.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Check if it's in DD-MM-YY format
  const ddMMYYRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-[0-9]{2}$/;
  if (ddMMYYRegex.test(dateStr)) {
    const [day, month, yearStr] = dateStr.split('-');
    const yearNum = parseInt(yearStr, 10);
    const year = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum;
    return new Date(year, parseInt(month) - 1, parseInt(day));
  }
  
  // Try ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  return null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await connectToDatabase();

  try {
    const { eventId, startDate, endDate } = req.query;

    // Build query filters
    const query: any = {};
    
    if (eventId) {
      query.eventId = new mongoose.Types.ObjectId(eventId as string);
    }

    // Get basic statistics
    const [
      totalVisitors,
      visitedVisitors,
      upcomingEvents,
      totalEvents,
      allVisitors,
      eventStatsData
    ] = await Promise.all([
      // Total visitors
      Visitor.countDocuments(query),
      
      // Visited visitors
      Visitor.countDocuments({ ...query, status: 'Visited' }),
      
      // Upcoming events (events starting today or in the future)
      Event.countDocuments({
        startDate: { $gte: new Date() }
      }),
      
      // Total events
      Event.countDocuments(),
      
      // Get all visitors for monthly analysis
      Visitor.find(query).lean(),
      
      // Event statistics
      Visitor.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'events',
            localField: 'eventId',
            foreignField: '_id',
            as: 'event'
          }
        },
        { $unwind: '$event' },
        {
          $group: {
            _id: '$event.title',
            registrations: { $sum: 1 },
            visits: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Visited'] }, 1, 0]
              }
            }
          }
        },
        { $sort: { registrations: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Generate real monthly data for the last 12 months
    const monthlyRegistrations = [];
    const currentDate = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    console.log('Generating monthly data for', allVisitors.length, 'visitors');
    
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = monthNames[targetDate.getMonth()];
      const year = targetDate.getFullYear();
      
      // Count registrations for this month
      let monthCount = 0;
      
      for (const visitor of allVisitors) {
        const registrationDate = parseDateString(visitor.createdAt);
        if (registrationDate) {
          const visitorYear = registrationDate.getFullYear();
          const visitorMonth = registrationDate.getMonth();
          
          if (visitorYear === year && visitorMonth === targetDate.getMonth()) {
            monthCount++;
          }
        }
      }
      
      const monthData = {
        month: `${monthKey} ${year}`,
        count: monthCount
      };
      
      monthlyRegistrations.push(monthData);
      console.log('Month data:', monthData);
    }

    // Transform data for charts
    const eventStats = eventStatsData.flatMap(event => [
      {
        event: event._id.length > 20 ? event._id.substring(0, 20) + '...' : event._id,
        type: 'Registrations',
        value: event.registrations
      },
      {
        event: event._id.length > 20 ? event._id.substring(0, 20) + '...' : event._id,
        type: 'Visited',
        value: event.visits
      }
    ]);

    // Prepare response
    const dashboardStats = {
      totalVisitors,
      totalEvents,
      visitedVisitors,
      upcomingEvents,
      monthlyRegistrations,
      eventStats
    };

    res.status(200).json(dashboardStats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
} 