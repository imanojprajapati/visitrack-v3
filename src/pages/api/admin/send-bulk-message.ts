import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

interface Recipient {
  email: string;
  name: string;
  subject?: string; // Optional personalized subject
  message?: string; // Optional personalized message
}

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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipients, channel, subject, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients provided' });
    }

    if (!channel) {
      return res.status(400).json({ error: 'Channel is required' });
    }

    if (channel !== 'email') {
      return res.status(400).json({ error: 'Only email channel is currently supported' });
    }

    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('Gmail credentials not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    // Validate recipient emails
    const validRecipients = recipients.filter((recipient: Recipient) => 
      recipient.email && typeof recipient.email === 'string' && 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)
    );

    if (validRecipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipient emails found' });
    }

    // Check if we have personalized messages or use global subject/message
    const hasPersonalizedMessages = validRecipients.some((recipient: Recipient) => 
      recipient.subject || recipient.message
    );

    // If not personalized, ensure we have global subject and message
    if (!hasPersonalizedMessages && (!subject || !message)) {
      return res.status(400).json({ error: 'Subject and message are required for bulk messages' });
    }

    // Send emails to all recipients
    const emailPromises = validRecipients.map(async (recipient: Recipient) => {
      // Use personalized subject/message if available, otherwise use global ones
      const emailSubject = recipient.subject || subject;
      const emailMessage = recipient.message || message;

      const mailOptions = {
        from: `"Visitrack" <${process.env.GMAIL_USER}>`,
        to: recipient.email,
        subject: emailSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Visitrack Message</h2>
            <p>Dear ${recipient.name || 'Visitor'},</p>
            <div style="margin: 20px 0;">
              ${emailMessage.replace(/\n/g, '<br>')}
            </div>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;" />
            <p style="color: #6B7280; font-size: 12px;">
              This is an automated message from Visitrack. Please do not reply to this email.
            </p>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        return { 
          email: recipient.email, 
          name: recipient.name,
          status: 'success',
          subject: emailSubject,
          personalized: !!(recipient.subject || recipient.message)
        };
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        return { 
          email: recipient.email, 
          name: recipient.name,
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Failed to send email',
          subject: emailSubject,
          personalized: !!(recipient.subject || recipient.message)
        };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const personalizedCount = results.filter(r => r.personalized).length;

    if (successful === 0) {
      return res.status(500).json({
        error: 'Failed to send any messages',
        results
      });
    }

    const messageType = personalizedCount > 0 ? 
      (personalizedCount === successful ? 'personalized' : 'mixed') : 
      'bulk';

    res.status(200).json({
      message: `Successfully sent ${successful} ${messageType} message${successful !== 1 ? 's' : ''}${failed > 0 ? `. Failed to send ${failed} message${failed !== 1 ? 's' : ''}.` : '.'}`,
      results,
      stats: {
        total: validRecipients.length,
        successful,
        failed,
        personalized: personalizedCount,
        messageType
      }
    });
  } catch (error) {
    console.error('Error in send-bulk-message:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
} 