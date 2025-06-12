import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { connectToDatabase } from '../../../lib/mongodb';
import Visitor from '../../../models/Visitor';
import Event from '../../../models/Event';
import BadgeTemplate from '../../../models/BadgeTemplate';

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
    const { visitorId, testMode } = req.body;

    if (!visitorId && !testMode) {
      return res.status(400).json({ message: 'Visitor ID is required' });
    }

    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Gmail credentials not configured:', {
        GMAIL_USER: process.env.GMAIL_USER ? 'Set' : 'Not Set',
        GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? 'Set' : 'Not Set'
      });
      return res.status(500).json({ message: 'Email service not configured' });
    }

    console.log('Email service configuration check passed');

    // Test mode for email verification
    if (testMode) {
      const testMailOptions = {
        from: `"Visitrack" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER, // Send to self for testing
        subject: 'Visitrack Email Service Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Email Service Test</h2>
            <p>This is a test email to verify that the Visitrack email service is working correctly.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Environment:</strong> ${process.env.NODE_ENV}</p>
          </div>
        `
      };

      try {
        await transporter.sendMail(testMailOptions);
        console.log('Test email sent successfully');
        return res.status(200).json({ 
          message: 'Test email sent successfully',
          timestamp: new Date().toISOString()
        });
      } catch (testError: unknown) {
        console.error('Test email failed:', testError);
        return res.status(500).json({ 
          message: 'Test email failed',
          error: process.env.NODE_ENV === 'development' ? (testError instanceof Error ? testError.message : 'Unknown error') : undefined
        });
      }
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

    // Generate PDF badge
    let pdfAttachment = null;
    try {
      console.log('Attempting to generate PDF badge for visitor:', visitor._id);
      
      // Get badge template for this event
      const templates = await BadgeTemplate.find({ eventId: visitor.eventId });
      console.log('Found badge templates:', templates.length);
      
      if (templates.length > 0) {
        const templateId = templates[0]._id;
        console.log('Using badge template:', templateId);
        
        // Prepare visitor data for PDF generation
        const visitorData = {
          ...visitor,
          visitorId: visitor._id,
          eventId: visitor.eventId,
          eventName: visitor.eventName,
          eventLocation: visitor.eventLocation,
          eventStartDate: visitor.eventStartDate,
          eventEndDate: visitor.eventEndDate,
          _id: visitor._id
        };

        // Generate PDF using the badge download API
        const pdfResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/badge-templates/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templateId,
            visitorData
          }),
        });

        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          pdfAttachment = {
            filename: `visitrack-badge-${visitor.name}.pdf`,
            content: Buffer.from(pdfBuffer),
            contentType: 'application/pdf'
          };
          console.log('PDF badge generated successfully');
        } else {
          console.error('Failed to generate PDF badge:', {
            status: pdfResponse.status,
            statusText: pdfResponse.statusText
          });
        }
      } else {
        console.log('No badge templates found for event:', visitor.eventId);
      }
    } catch (pdfError) {
      console.error('Error generating PDF badge:', pdfError);
      // Continue without PDF attachment if generation fails
    }

    // Build email HTML content
    let emailHtml = `
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
          </div>`;

    // Add PDF attachment section if available
    if (pdfAttachment) {
      emailHtml += `
          <div style="background: #E0F2FE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0288D1;">
            <h3 style="color: #01579B; margin-top: 0;">📎 Attachment</h3>
            <p style="color: #0277BD; margin: 10px 0;">
              Your event badge has been attached to this email. Please save it for easy access during the event.
            </p>
          </div>`;
    }

    // Close the email HTML
    emailHtml += `
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px; text-align: center;">
            If you have any questions, please contact the event organizers.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6B7280; font-size: 12px;">
          <p>This is an automated message from Visitrack. Please do not reply to this email.</p>
          <p>© 2024 Visitrack. All rights reserved.</p>
        </div>
      </div>`;

    // Send success email
    const mailOptions = {
      from: `"Visitrack" <${process.env.GMAIL_USER}>`,
      to: visitor.email,
      subject: `Your Registration is Complete Successfully - ${eventData.title}`,
      html: emailHtml,
      attachments: pdfAttachment ? [pdfAttachment] : undefined
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log('Registration success email sent to:', visitor.email, 'for event:', eventData.title, {
        visitorId: visitor._id,
        pdfAttached: !!pdfAttachment,
        emailSize: emailHtml.length
      });
      res.status(200).json({ 
        message: 'Registration success email sent successfully',
        visitorId: visitor._id,
        eventTitle: eventData.title,
        pdfAttached: !!pdfAttachment,
        emailSent: true
      });
    } catch (emailError) {
      console.error('Error sending registration success email:', {
        error: emailError,
        visitorId: visitor._id,
        visitorEmail: visitor.email,
        eventTitle: eventData.title
      });
      
      // Try sending without PDF attachment as fallback
      if (pdfAttachment) {
        try {
          console.log('Attempting to send email without PDF attachment as fallback...');
          const fallbackMailOptions = {
            ...mailOptions,
            attachments: undefined,
            html: emailHtml.replace(/📎 Attachment.*?<\/div>/s, '') // Remove attachment section
          };
          
          await transporter.sendMail(fallbackMailOptions);
          console.log('Fallback email sent successfully without PDF attachment');
          res.status(200).json({ 
            message: 'Registration success email sent successfully (without PDF attachment)',
            visitorId: visitor._id,
            eventTitle: eventData.title,
            pdfAttached: false,
            emailSent: true,
            fallbackUsed: true
          });
          return;
        } catch (fallbackError) {
          console.error('Fallback email also failed:', fallbackError);
        }
      }
      
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