import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { WorkflowService } from '../services/WorkflowService.js';
import { WORKFLOW_TEMPLATES } from '../data/templates.js';
import type { INode, IConnections, WorkflowSettings } from '@shared/types';

const workflowService = new WorkflowService();

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  connections: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

const duplicateWorkflowSchema = z.object({
  name: z.string().min(1),
});

export class WorkflowController {
  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const tagFilter = req.query.tag as string | undefined;
      const searchQuery = req.query.search as string | undefined;

      const { workflows, total } = await workflowService.list(
        req.userId,
        tagFilter,
        searchQuery,
        limit,
        offset
      );

      res.json({
        data: workflows,
        pagination: {
          total,
          limit,
          offset,
        },
      });
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

      const data = createWorkflowSchema.parse(req.body);
      const workflow = await workflowService.create(req.userId, data.name, data.description);

      res.status(201).json(workflow);
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

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const workflow = await workflowService.getById(req.params.id, req.userId);

      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      res.json(workflow);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = updateWorkflowSchema.parse(req.body);
      const workflow = await workflowService.update(req.params.id, req.userId, data);

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
        if (error.message.includes('already exists') || error.message.includes('references')) {
          res.status(400).json({ error: error.message });
          return;
        }
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

      await workflowService.delete(req.params.id, req.userId);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }

        // Surface validation-like errors as 400 instead of generic 500
        if (error.message.includes('executions') || error.message.includes('references')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async duplicate(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = duplicateWorkflowSchema.parse(req.body);
      const workflow = await workflowService.duplicate(req.params.id, req.userId, data.name);

      res.status(201).json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async activate(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const workflow = await workflowService.activate(req.params.id, req.userId);

      res.json(workflow);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message.includes('must have') || error.message.includes('references')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async deactivate(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const workflow = await workflowService.deactivate(req.params.id, req.userId);

      res.json(workflow);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async listTemplates(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Return templates without full node/connection details (just metadata)
      const templates = WORKFLOW_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        nodeCount: template.nodes.length,
      }));

      res.json({ data: templates });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createFromTemplate(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = z
        .object({
          templateId: z.string(),
          name: z.string().min(1),
          description: z.string().optional(),
        })
        .parse(req.body);

      const template = WORKFLOW_TEMPLATES.find((t) => t.id === data.templateId);

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      // Generate unique node IDs based on timestamp
      const timestamp = Date.now();
      const nodeIdMap: Record<string, string> = {};
      const nodes: INode[] = template.nodes.map((node, index) => {
        const newId = `node_${timestamp}_${index}`;
        nodeIdMap[node.id] = newId;
        return {
          ...node,
          id: newId,
        };
      });

      // Update connections with new node IDs
      const connections: IConnections = {};
      for (const [sourceId, connMap] of Object.entries(template.connections)) {
        const newSourceId = nodeIdMap[sourceId];
        if (newSourceId) {
          connections[newSourceId] = {};
          for (const [connType, connArray] of Object.entries(connMap)) {
            connections[newSourceId][connType] = connArray.map((connGroup) =>
              connGroup.map((conn) => ({
                ...conn,
                node: nodeIdMap[conn.node] || conn.node,
              }))
            );
          }
        }
      }

      const workflow = await workflowService.create(req.userId, data.name, data.description);

      // Update workflow with template nodes and connections
      const updatedWorkflow = await workflowService.update(workflow.id, req.userId, {
        nodes,
        connections,
      });

      res.status(201).json(updatedWorkflow);
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
}
