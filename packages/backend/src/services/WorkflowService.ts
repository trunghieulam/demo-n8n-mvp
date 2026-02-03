import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { Workflow } from '../entities/Workflow.js';
import { Execution } from '../entities/Execution.js';
import type { INode, IConnections, WorkflowSettings } from '@shared/types';

export class WorkflowService {
  private workflowRepository: Repository<Workflow>;
  private executionRepository: Repository<Execution>;

  constructor() {
    this.workflowRepository = AppDataSource.getRepository(Workflow);
    this.executionRepository = AppDataSource.getRepository(Execution);
  }

  async create(userId: string, name: string, description?: string): Promise<Workflow> {
    // Check for duplicate name per user
    const existing = await this.workflowRepository.findOne({
      where: { userId, name },
    });

    if (existing) {
      throw new Error('Workflow with this name already exists');
    }

    // Create a default trigger node (Webhook) for every new workflow
    const defaultTriggerNode: INode = {
      id: `node_${Date.now()}`,
      name: 'Start',
      type: 'n8n-nodes-base.webhook',
      position: { x: 250, y: 200 },
      parameters: {
        method: 'POST',
        path: `webhook/${Date.now()}`,
      },
    };

    const workflow = this.workflowRepository.create({
      userId,
      name,
      description,
      nodes: [defaultTriggerNode],
      connections: {},
      isActive: false,
    });

    return await this.workflowRepository.save(workflow);
  }

  async list(
    userId: string,
    tagFilter?: string,
    searchQuery?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ workflows: Workflow[]; total: number }> {
    const queryBuilder = this.workflowRepository
      .createQueryBuilder('workflow')
      .where('workflow.userId = :userId', { userId })
      .leftJoinAndSelect('workflow.tags', 'tag');

    if (tagFilter) {
      queryBuilder.andWhere('tag.name = :tagName', { tagName: tagFilter });
    }

    if (searchQuery) {
      queryBuilder.andWhere(
        '(workflow.name LIKE :search OR workflow.description LIKE :search)',
        { search: `%${searchQuery}%` }
      );
    }

    const [workflows, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .orderBy('workflow.updatedAt', 'DESC')
      .getManyAndCount();

    return { workflows, total };
  }

  async getById(workflowId: string, userId: string): Promise<Workflow | null> {
    return await this.workflowRepository.findOne({
      where: { id: workflowId, userId },
      relations: ['tags'],
    });
  }

  async update(
    workflowId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      nodes?: INode[];
      connections?: IConnections;
      settings?: WorkflowSettings;
    }
  ): Promise<Workflow> {
    const workflow = await this.getById(workflowId, userId);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Validate workflow structure if nodes/connections are provided
    if (updates.nodes || updates.connections) {
      this.validateWorkflow(updates.nodes || workflow.nodes, updates.connections || workflow.connections);
    }

    if (updates.name) {
      // Check for duplicate name
      const existing = await this.workflowRepository.findOne({
        where: { userId, name: updates.name },
      });
      if (existing && existing.id !== workflowId) {
        throw new Error('Workflow with this name already exists');
      }
      workflow.name = updates.name;
    }

    if (updates.description !== undefined) {
      workflow.description = updates.description;
    }

    if (updates.nodes) {
      workflow.nodes = updates.nodes;
    }

    if (updates.connections) {
      workflow.connections = updates.connections;
    }

    if (updates.settings) {
      workflow.settings = updates.settings;
    }

    return await this.workflowRepository.save(workflow);
  }

  async delete(workflowId: string, userId: string): Promise<void> {
    const workflow = await this.getById(workflowId, userId);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Prevent deleting workflows that still have execution history
    const executionCount = await this.executionRepository.count({
      where: { workflowId },
    });

    if (executionCount > 0) {
      throw new Error('Cannot delete workflow: it has existing executions');
    }

    await this.workflowRepository.remove(workflow);
  }

  async duplicate(workflowId: string, userId: string, newName: string): Promise<Workflow> {
    const workflow = await this.getById(workflowId, userId);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const newWorkflow = this.workflowRepository.create({
      userId,
      name: newName,
      description: workflow.description,
      nodes: JSON.parse(JSON.stringify(workflow.nodes)), // Deep clone
      connections: JSON.parse(JSON.stringify(workflow.connections)), // Deep clone
      settings: workflow.settings ? JSON.parse(JSON.stringify(workflow.settings)) : undefined,
      isActive: false,
    });

    return await this.workflowRepository.save(newWorkflow);
  }

  async activate(workflowId: string, userId: string): Promise<Workflow> {
    const workflow = await this.getById(workflowId, userId);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Validate workflow before activation
    this.validateWorkflow(workflow.nodes, workflow.connections);

    workflow.isActive = true;
    return await this.workflowRepository.save(workflow);
  }

  async deactivate(workflowId: string, userId: string): Promise<Workflow> {
    const workflow = await this.getById(workflowId, userId);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    workflow.isActive = false;
    return await this.workflowRepository.save(workflow);
  }

  private validateWorkflow(nodes: INode[], connections: IConnections): void {
    if (!nodes || nodes.length === 0) {
      throw new Error('Workflow must have at least one node');
    }

    // Validate all connections reference existing nodes
    const nodeIds = new Set(nodes.map((n) => n.id));

    for (const [sourceId, connectionMap] of Object.entries(connections)) {
      if (!nodeIds.has(sourceId)) {
        throw new Error(`Connection references non-existent source node: ${sourceId}`);
      }

      for (const connectionArray of Object.values(connectionMap)) {
        for (const connectionGroup of connectionArray) {
          for (const connection of connectionGroup) {
            if (!nodeIds.has(connection.node)) {
              throw new Error(`Connection references non-existent target node: ${connection.node}`);
            }
          }
        }
      }
    }
  }
}
