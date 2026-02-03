import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { TagService } from '../services/TagService.js';

const tagService = new TagService();

const createTagSchema = z.object({
  name: z.string().min(1),
});

const updateWorkflowTagsSchema = z.object({
  add: z.array(z.string()).optional(),
  remove: z.array(z.string()).optional(),
});

export class TagController {
  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const tags = await tagService.list(req.userId);

      res.json({ data: tags });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = createTagSchema.parse(req.body);
      const tag = await tagService.create(req.userId, data.name);

      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await tagService.delete(req.params.id, req.userId);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateWorkflowTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = updateWorkflowTagsSchema.parse(req.body);
      const workflowId = req.params.id;

      if (data.add && data.add.length > 0) {
        // Get current tags and merge with new ones
        const currentTags = await tagService.list(req.userId);
        const currentWorkflowTags = currentTags.filter((t) =>
          data.add?.includes(t.id)
        );
        const tagIds = currentWorkflowTags.map((t) => t.id);
        await tagService.addToWorkflow(workflowId, tagIds, req.userId);
      }

      if (data.remove && data.remove.length > 0) {
        await tagService.removeFromWorkflow(workflowId, data.remove, req.userId);
      }

      // Return updated workflow with tags
      const { WorkflowService } = await import('../services/WorkflowService.js');
      const workflowService = new WorkflowService();
      const workflow = await workflowService.getById(workflowId, req.userId);

      res.json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
