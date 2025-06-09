import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Event from '../../../models/Event';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { visitorId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ message: 'Visitor ID is required' });
    }

    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Gmail credentials not configured');
      return res.status(500).json({ message: 'Email service not configured' });
    }

    // Connect to database
    await connectToDatabase();

    // Get visitor details
    const visitor = await Visitor.findById(visitorId).lean();
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor not found' });
    }

    // Get event details
    const event = await Event.findById(visitor.eventId).lean();
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Type assertion for event
    const eventData = event as any;

    // Send success email
    const mailOptions = {
      from: `"Visitrack" <${process.env.GMAIL_USER}>`,
      to: visitor.email,
      subject: `Your Registration is Complete Successfully - ${eventData.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Registration Complete!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Welcome to ${eventData.title}</p>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1F2937; margin-bottom: 20px;">Hello ${visitor.name}!</h2>
            
            <p style="color: #374151; line-height: 1.6; margin-bottom: 20px;">
              Congratulations! Your registration for <strong>${eventData.title}</strong> has been completed successfully.
            </p>
            
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1F2937; margin-top: 0;">📅 Event Details</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                  <strong style="color: #4F46E5;">Event:</strong><br>
                  ${eventData.title}
                </div>
                <div>
                  <strong style="color: #4F46E5;">Location:</strong><br>
                  ${eventData.location || 'TBD'}
                </div>
                <div>
                  <strong style="color: #4F46E5;">Date:</strong><br>
                  ${visitor.eventStartDate}${visitor.eventEndDate && visitor.eventEndDate !== visitor.eventStartDate ? ` - ${visitor.eventEndDate}` : ''}
                </div>
                <div>
                  <strong style="color: #4F46E5;">Time:</strong><br>
                  ${visitor.eventStartTime || 'TBD'}${visitor.eventEndTime ? ` - ${visitor.eventEndTime}` : ''}
                </div>
              </div>
            </div>
            
            <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
              <h3 style="color: #065F46; margin-top: 0;">✅ What's Next?</h3>
              <ul style="color: #047857; margin: 10px 0; padding-left: 20px;">
                <li>Download your QR code from the registration page</li>
                <li>Save your badge for easy access</li>
                <li>Arrive 15 minutes before the event starts</li>
                <li>Have your QR code ready for check-in</li>
              </ul>
            </div>
            
            <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <h3 style="color: #92400E; margin-top: 0;">📱 Important Information</h3>
              <p style="color: #B45309; margin: 10px 0;">
                <strong>Visitor ID:</strong> ${visitor._id}<br>
                <strong>Registration Date:</strong> ${visitor.createdAt}<br>
                <strong>Status:</strong> ${visitor.status}
              </p>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin-top: 30px; text-align: center;">
              If you have any questions, please contact the event organizers.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
            <p>This is an automated message from Visitrack. Please do not reply to this email.</p>
            <p>© 2024 Visitrack. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Registration success email sent to:', visitor.email, 'for event:', eventData.title);
      res.status(200).json({ 
        message: 'Registration success email sent successfully',
        visitorId: visitor._id,
        eventTitle: eventData.title
      });
    } catch (emailError) {
      console.error('Error sending registration success email:', emailError);
      throw new Error('Failed to send registration success email');
    }
  } catch (error: unknown) {
    console.error('Error in send-registration-success endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ 
      message: 'Failed to send registration success email',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
} 