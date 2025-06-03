import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

interface Recipient {
  email: string;
  name: string;
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

    if (!channel || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
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

    // Send emails to all recipients
    const emailPromises = validRecipients.map(async (recipient: Recipient) => {
      const mailOptions = {
        from: `"Visitrack" <${process.env.GMAIL_USER}>`,
        to: recipient.email,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Visitrack Message</h2>
            <p>Dear Visitors,</p>
            <div style="margin: 20px 0;">
              ${message.replace(/\n/g, '<br>')}
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
        return { email: recipient.email, status: 'success' };
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        return { 
          email: recipient.email, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Failed to send email' 
        };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    if (successful === 0) {
      return res.status(500).json({
        error: 'Failed to send any messages',
        results
      });
    }

    res.status(200).json({
      message: `Successfully sent ${successful} message${successful !== 1 ? 's' : ''}${failed > 0 ? `. Failed to send ${failed} message${failed !== 1 ? 's' : ''}.` : '.'}`,
      results
    });
  } catch (error) {
    console.error('Error in send-bulk-message:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
} 