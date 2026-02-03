import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { Execution } from '../entities/Execution.js';
import { Workflow } from '../entities/Workflow.js';
import { WorkflowExecutor } from './WorkflowExecutor.js';
import type { ExecutionMode, ExecutionStatus } from '@shared/types';

export class ExecutionService {
  private executionRepository = Repository<Execution>;
  private workflowRepository = Repository<Workflow>;
  private workflowExecutor = new WorkflowExecutor();

  constructor() {
    this.executionRepository = AppDataSource.getRepository(Execution);
    this.workflowRepository = AppDataSource.getRepository(Workflow);
  }

  async start(
    workflowId: string,
    userId: string,
    mode: ExecutionMode,
    testData?: unknown
  ): Promise<Execution> {
    const workflow = await this.workflowRepository.findOne({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Allow manual and test executions even if workflow is inactive
    // Only require active workflow for trigger/webhook modes
    if (mode !== 'test' && mode !== 'manual' && !workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    // Execute workflow asynchronously
    const execution = await this.workflowExecutor.execute(workflow, userId, mode, testData);

    return execution;
  }

  async getById(executionId: string, userId: string): Promise<Execution | null> {
    return await this.executionRepository.findOne({
      where: { id: executionId, userId },
      relations: ['workflow'],
    });
  }

  async list(
    userId: string,
    workflowId?: string,
    status?: ExecutionStatus,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ executions: Execution[]; total: number }> {
    const queryBuilder = this.executionRepository
      .createQueryBuilder('execution')
      .where('execution.userId = :userId', { userId })
      .leftJoinAndSelect('execution.workflow', 'workflow');

    if (workflowId) {
      queryBuilder.andWhere('execution.workflowId = :workflowId', { workflowId });
    }

    if (status) {
      queryBuilder.andWhere('execution.status = :status', { status });
    }

    const [executions, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .orderBy('execution.startedAt', 'DESC')
      .getManyAndCount();

    return { executions, total };
  }

  async stop(executionId: string, userId: string): Promise<Execution> {
    const execution = await this.getById(executionId, userId);

    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status !== 'running') {
      throw new Error('Execution is not running');
    }

    execution.status = 'error';
    execution.finishedAt = new Date();

    await this.executionRepository.save(execution);

    return execution;
  }

  async retry(executionId: string, userId: string): Promise<Execution> {
    const originalExecution = await this.getById(executionId, userId);

    if (!originalExecution) {
      throw new Error('Execution not found');
    }

    if (originalExecution.status === 'running') {
      throw new Error('Cannot retry a running execution');
    }

    // Get original workflow
    const workflow = await this.workflowRepository.findOne({
      where: { id: originalExecution.workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Get input data from original execution (from first trigger node)
    const triggerNodes = workflow.nodes.filter((node) => {
      const hasInput = Object.values(workflow.connections).some((connMap) =>
        Object.values(connMap).some((connArray) =>
          connArray.some((connGroup) => connGroup.some((conn) => conn.node === node.id))
        )
      );
      return !hasInput;
    });

    let inputData: unknown;
    if (triggerNodes.length > 0 && originalExecution.executionData.resultData.runData[triggerNodes[0].id]) {
      const nodeData = originalExecution.executionData.resultData.runData[triggerNodes[0].id][0];
      inputData = nodeData.data?.main?.[0]?.json;
    }

    // Create new execution
    const newExecution = await this.start(
      originalExecution.workflowId,
      userId,
      originalExecution.mode,
      inputData
    );

    // Link to original
    newExecution.retryOf = originalExecution.id;
    await this.executionRepository.save(newExecution);

    return newExecution;
  }

  async delete(executionId: string, userId: string): Promise<void> {
    const execution = await this.getById(executionId, userId);

    if (!execution) {
      throw new Error('Execution not found');
    }

    await this.executionRepository.remove(execution);
  }
}
