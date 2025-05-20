import type { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

type DemoRequestData = {
  companyName: string;
  name: string;
  email: string;
  phone: string;
  companySize: string;
  requirements: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      companyName,
      name,
      email,
      phone,
      companySize,
      requirements
    }: DemoRequestData = req.body;

    // Input validation
    if (!companyName || !name || !email || !phone || !companySize || !requirements) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Email content
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Send to yourself
      replyTo: email,
      subject: `Demo Request from ${companyName}`,
      text: `
        New Demo Request

        Company Details:
        ----------------
        Company Name: ${companyName}
        Company Size: ${companySize}

        Contact Information:
        -------------------
        Name: ${name}
        Email: ${email}
        Phone: ${phone}

        Requirements:
        ------------
        ${requirements}
      `,
      html: `
        <h2>New Demo Request</h2>

        <h3>Company Details:</h3>
        <p><strong>Company Name:</strong> ${companyName}</p>
        <p><strong>Company Size:</strong> ${companySize}</p>

        <h3>Contact Information:</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>

        <h3>Requirements:</h3>
        <p>${requirements.replace(/\n/g, '<br>')}</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Demo request sent successfully!' });
  } catch (error) {
    console.error('Demo request error:', error);
    res.status(500).json({ error: 'Failed to send demo request. Please try again later.' });
  }
}