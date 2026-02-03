import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { Webhook } from '../entities/Webhook.js';
import { ExecutionService } from './ExecutionService.js';
import crypto from 'crypto';

export class WebhookService {
  private webhookRepository: Repository<Webhook>;
  private executionService: ExecutionService;

  constructor() {
    this.webhookRepository = AppDataSource.getRepository(Webhook);
    this.executionService = new ExecutionService();
  }

  async register(
    workflowId: string,
    nodeId: string,
    path: string,
    method: string
  ): Promise<Webhook> {
    // Generate unique path if not provided
    const webhookPath = path || `/webhook/${crypto.randomBytes(16).toString('hex')}`;

    const webhook = this.webhookRepository.create({
      workflowId,
      nodeId,
      webhookPath,
      method: method.toUpperCase(),
      isActive: false,
    });

    return await this.webhookRepository.save(webhook);
  }

  async unregister(workflowId: string, nodeId: string): Promise<void> {
    await this.webhookRepository.delete({ workflowId, nodeId });
  }

  async route(
    method: string,
    path: string,
    body: unknown,
    headers: Record<string, string>
  ): Promise<void> {
    const webhook = await this.webhookRepository.findOne({
      where: { webhookPath: path, method: method.toUpperCase(), isActive: true },
      relations: ['workflow'],
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Trigger workflow execution
    await this.executionService.start(
      webhook.workflowId,
      webhook.workflow.userId,
      'webhook',
      {
        body,
        headers,
        method,
        path,
      }
    );
  }

  async testCapture(workflowId: string, nodeId: string): Promise<{
    method: string;
    body: unknown;
    headers: Record<string, string>;
    timestamp: string;
  }> {
    // For MVP, store last request in memory (in production, use database)
    // This is a simplified implementation
    return {
      method: 'POST',
      body: {},
      headers: {},
      timestamp: new Date().toISOString(),
    };
  }

  async list(workflowId?: string): Promise<Webhook[]> {
    const where: any = {};
    if (workflowId) {
      where.workflowId = workflowId;
    }

    return await this.webhookRepository.find({
      where,
      relations: ['workflow'],
    });
  }

  async getByWorkflowAndNode(workflowId: string, nodeId: string): Promise<Webhook | null> {
    return await this.webhookRepository.findOne({
      where: { workflowId, nodeId },
    });
  }
}
