import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { connectToDatabase } from '../../../lib/mongodb';
import OTP from '../../../models/OTP';
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
    const { email, eventId } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Gmail credentials not configured');
      return res.status(500).json({ message: 'Email service not configured' });
    }

    // Connect to database
    await connectToDatabase();

    // Get event details if eventId is provided
    let eventName = 'Visitrack Event';
    if (eventId) {
      try {
        const event = await Event.findById(eventId).select('title').lean();
        if (event && 'title' in event && event.title) {
          eventName = event.title;
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
        // Continue with default event name if there's an error
      }
    }

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store OTP in database
    await OTP.create({
      email,
      otp,
      expires,
      attempts: 0
    });

    // Send email
    const mailOptions = {
      from: `"Visitrack" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Registration Verify for ${eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Visitrack Registration</h2>
          <p>Your OTP for registration to <strong>${eventName}</strong> is:</p>
          <h1 style="font-size: 32px; color: #4F46E5; letter-spacing: 5px; text-align: center; padding: 20px; background: #F3F4F6; border-radius: 8px;">
            ${otp}
          </h1>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
          <p style="color: #6B7280; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('OTP sent successfully to:', email, 'for event:', eventName);
      res.status(200).json({ message: 'OTP sent successfully' });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Remove the OTP from database if email sending fails
      await OTP.deleteOne({ email });
      throw new Error('Failed to send email');
    }
  } catch (error: unknown) {
    console.error('Error in send-OTP endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ 
      message: 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
} 