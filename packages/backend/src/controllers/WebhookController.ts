import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { WebhookService } from '../services/WebhookService.js';

const webhookService = new WebhookService();

export class WebhookController {
  static async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const workflowId = req.query.workflowId as string | undefined;
      const webhooks = await webhookService.list(workflowId);

      res.json({ data: webhooks });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getByWorkflowAndNode(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workflowId, nodeId } = req.params;
      const webhook = await webhookService.getByWorkflowAndNode(workflowId, nodeId);

      if (!webhook) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      res.json(webhook);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async testCapture(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { workflowId, nodeId } = req.params;
      const result = await webhookService.testCapture(workflowId, nodeId);

      res.json({ success: true, capturedRequest: result });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Public webhook endpoint (no auth required)
  static async receiveWebhook(req: Request, res: Response): Promise<void> {
    try {
      const path = req.path;
      const method = req.method;

      await webhookService.route(method, path, req.body, req.headers as Record<string, string>);

      res.json({ success: true });
    } catch (error: any) {
      res.status(404).json({ error: error.message || 'Webhook not found' });
    }
  }
}
