import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../../../lib/mongodb';
import MessageTemplate from '../../../models/MessageTemplate';
import mongoose from 'mongoose';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectToDatabase();

    const { templateId } = req.query;

    if (!templateId || typeof templateId !== 'string') {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    switch (req.method) {
      case 'GET':
        return await getTemplate(req, res, templateId);
      case 'PUT':
        return await updateTemplate(req, res, templateId);
      case 'DELETE':
        return await deleteTemplate(req, res, templateId);
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

async function getTemplate(req: NextApiRequest, res: NextApiResponse, templateId: string) {
  try {
    const template = await MessageTemplate.findById(templateId).lean();

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.status(200).json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    return res.status(500).json({ error: 'Failed to fetch template' });
  }
}

async function updateTemplate(req: NextApiRequest, res: NextApiResponse, templateId: string) {
  try {
    const { name, subject, message, variables } = req.body;

    // Validate required fields
    if (!name || !subject || !message) {
      return res.status(400).json({ 
        error: 'Name, subject, and message are required' 
      });
    }

    // Check if another template with same name exists (excluding current template)
    const existingTemplate = await MessageTemplate.findOne({ 
      name, 
      _id: { $ne: templateId } 
    });
    
    if (existingTemplate) {
      return res.status(409).json({ 
        error: 'A template with this name already exists' 
      });
    }

    const updatedTemplate = await MessageTemplate.findByIdAndUpdate(
      templateId,
      {
        name,
        subject,
        message,
        variables: variables || []
      },
      { new: true, runValidators: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.status(200).json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to update template' });
  }
}

async function deleteTemplate(req: NextApiRequest, res: NextApiResponse, templateId: string) {
  try {
    const deletedTemplate = await MessageTemplate.findByIdAndDelete(templateId);

    if (!deletedTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.status(200).json({ 
      message: 'Template deleted successfully',
      template: deletedTemplate
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ error: 'Failed to delete template' });
  }
} 