import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { ExecutionService } from '../services/ExecutionService.js';

const executionService = new ExecutionService();

const executeWorkflowSchema = z.object({
  testData: z.any().optional(),
});

export class ExecutionController {
  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const workflowId = req.query.workflowId as string | undefined;
      const status = req.query.status as string | undefined;

      const { executions, total } = await executionService.list(
        req.userId,
        workflowId,
        status as any,
        limit,
        offset
      );

      res.json({
        data: executions,
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

  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const execution = await executionService.getById(req.params.id, req.userId);

      if (!execution) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }

      res.json(execution);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async executeWorkflow(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = executeWorkflowSchema.parse(req.body);
      const execution = await executionService.start(
        req.params.id,
        req.userId,
        'manual',
        data.testData
      );

      res.status(202).json({
        executionId: execution.id,
        status: execution.status,
        mode: execution.mode,
        startedAt: execution.startedAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      if (error instanceof Error) {
        if (error.message.includes('not found') || error.message.includes('not active')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async stop(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const execution = await executionService.stop(req.params.id, req.userId);

      res.json(execution);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message.includes('not running')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async retry(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const execution = await executionService.retry(req.params.id, req.userId);

      res.status(202).json({
        executionId: execution.id,
        status: execution.status,
        retryOf: execution.retryOf,
        mode: execution.mode,
        startedAt: execution.startedAt,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message.includes('Cannot retry')) {
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

      await executionService.delete(req.params.id, req.userId);

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
