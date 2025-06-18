import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import MessageTemplate from '../../../models/MessageTemplate';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectToDatabase();

    switch (req.method) {
      case 'GET':
        return await getTemplates(req, res);
      case 'POST':
        return await createTemplate(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Message template API error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
}

async function getTemplates(req: NextApiRequest, res: NextApiResponse) {
  try {
    const templates = await MessageTemplate.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({ error: 'Failed to fetch templates' });
  }
}

async function createTemplate(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name, subject, message, variables, createdBy } = req.body;

    // Validate required fields
    if (!name || !subject || !message) {
      return res.status(400).json({ 
        error: 'Name, subject, and message are required' 
      });
    }

    // Check if template with same name already exists
    const existingTemplate = await MessageTemplate.findOne({ name });
    if (existingTemplate) {
      return res.status(409).json({ 
        error: 'A template with this name already exists' 
      });
    }

    const template = new MessageTemplate({
      name,
      subject,
      message,
      variables: variables || [],
      createdBy
    });

    await template.save();

    return res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to create template' });
  }
} 