import { AppDataSource } from '../config/database.js';
import { Execution } from '../entities/Execution.js';
import { Workflow } from '../entities/Workflow.js';
import { NodeRegistry } from '../nodes/NodeRegistry.js';
import { CredentialService } from './CredentialService.js';
import type { INode, IConnections, ExecutionContext, ExecutionData, WorkflowSnapshot } from '@shared/types';

export class WorkflowExecutor {
  private executionRepository = AppDataSource.getRepository(Execution);
  private credentialService = new CredentialService();

  async execute(
    workflow: Workflow,
    userId: string,
    mode: 'manual' | 'trigger' | 'webhook' | 'test',
    inputData?: unknown
  ): Promise<Execution> {
    // Create execution record
    const execution = this.executionRepository.create({
      workflowId: workflow.id,
      userId,
      mode,
      status: 'running',
      startedAt: new Date(),
      executionData: {
        resultData: {
          runData: {},
        },
      },
      workflowData: {
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
      },
    });

    await this.executionRepository.save(execution);

    try {
      // Build execution context
      const context: ExecutionContext = {
        workflowData: execution.workflowData,
        executionData: execution.executionData,
        variables: {
          userId,
          executionId: execution.id,
          workflowId: workflow.id,
        },
      };

      // Execute workflow graph
      const result = await this.executeGraph(workflow.nodes, workflow.connections, context, inputData);

      // Update execution with results
      execution.executionData = result.executionData;
      execution.status = result.status;
      execution.finishedAt = new Date();

      await this.executionRepository.save(execution);

      return execution;
    } catch (error: any) {
      // Mark execution as error
      execution.status = 'error';
      execution.finishedAt = new Date();
      execution.executionData.resultData.runData._error = [
        {
          startTime: Date.now(),
          executionTime: Date.now() - execution.startedAt.getTime(),
          source: [],
          executionStatus: 'error',
          data: {
            main: [
              {
                json: {
                  error: error.message,
                  stack: error.stack,
                },
              },
            ],
          },
          error: {
            message: error.message,
            stack: error.stack,
          },
        },
      ];

      await this.executionRepository.save(execution);

      return execution;
    }
  }

  private async executeGraph(
    nodes: INode[],
    connections: IConnections,
    context: ExecutionContext,
    initialInput?: unknown
  ): Promise<{ executionData: ExecutionData; status: 'success' | 'error' }> {
    // Topological sort nodes
    const sortedNodes = this.topologicalSort(nodes, connections);

    // Node execution results
    const nodeResults: Record<string, unknown> = {};
    // Track input data for each node
    const nodeInputs: Record<string, unknown> = {};

    // Find trigger nodes (nodes with no inputs)
    const triggerNodes = sortedNodes.filter((node) => {
      // Check if any connection points to this node
      const hasInput = Object.values(connections).some((connMap) =>
        Object.values(connMap).some((connArray) =>
          connArray.some((connGroup) => connGroup.some((conn) => conn.node === node.id))
        )
      );
      return !hasInput;
    });

    // Execute trigger nodes first
    for (const node of triggerNodes) {
      const input = initialInput || {};
      nodeInputs[node.id] = input;
      const result = await this.executeNode(node, context, input);
      nodeResults[node.id] = result;
    }

    // Execute remaining nodes in topological order
    for (const node of sortedNodes) {
      if (triggerNodes.includes(node)) continue; // Already executed

      // Get input from connected nodes
      const input = this.getNodeInput(node.id, connections, nodeResults);
      nodeInputs[node.id] = input;

      const result = await this.executeNode(node, context, input);

      // Check for errors
      if (result.error && result.error.length > 0) {
        // Try error path if exists
        const errorPath = connections[node.id]?.error;
        if (errorPath && errorPath.length > 0) {
          // Execute error path
          for (const errorConnGroup of errorPath) {
            for (const errorConn of errorConnGroup) {
              const errorResult = await this.executeNode(
                nodes.find((n) => n.id === errorConn.node)!,
                context,
                result.error[0].json
              );
              nodeResults[errorConn.node] = errorResult;
            }
          }
        } else {
          // No error path, mark as error
          return {
            executionData: this.buildExecutionData(nodeResults, nodeInputs, node.id, result),
            status: 'error',
          };
        }
      }

      nodeResults[node.id] = result;
    }

    return {
      executionData: this.buildExecutionData(nodeResults, nodeInputs),
      status: 'success',
    };
  }

  private topologicalSort(nodes: INode[], connections: IConnections): INode[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: INode[] = [];

    const visit = (nodeId: string) => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node: ${nodeId}`);
      }
      if (visited.has(nodeId)) return;

      visiting.add(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Visit dependencies first
      const deps = this.getDependencies(nodeId, connections);
      for (const dep of deps) {
        visit(dep);
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      result.push(node);
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    }

    return result;
  }

  private getDependencies(nodeId: string, connections: IConnections): string[] {
    const deps: string[] = [];
    for (const [sourceId, connMap] of Object.entries(connections)) {
      for (const connArray of Object.values(connMap)) {
        for (const connGroup of connArray) {
          for (const conn of connGroup) {
            if (conn.node === nodeId) {
              deps.push(sourceId);
            }
          }
        }
      }
    }
    return deps;
  }

  private getNodeInput(nodeId: string, connections: IConnections, nodeResults: Record<string, unknown>): unknown {
    const inputs: unknown[] = [];

    for (const [sourceId, connMap] of Object.entries(connections)) {
      const mainConnections = connMap.main;
      if (mainConnections) {
        for (const connGroup of mainConnections) {
          for (const conn of connGroup) {
            if (conn.node === nodeId && nodeResults[sourceId]) {
              const result = nodeResults[sourceId] as { main?: Array<{ json: unknown }> };
              if (result.main) {
                inputs.push(...result.main.map((item) => item.json));
              }
            }
          }
        }
      }
    }

    return inputs.length === 1 ? inputs[0] : inputs;
  }

  private async executeNode(node: INode, context: ExecutionContext, inputData: unknown): Promise<any> {
    const startTime = Date.now();

    try {
      if (node.disabled) {
        // Pass through input if node is disabled
        return {
          main: Array.isArray(inputData)
            ? inputData.map((item) => ({ json: item }))
            : [{ json: inputData }],
        };
      }

      const nodeType = NodeRegistry.getNodeType(node.type);
      if (!nodeType) {
        throw new Error(`Unknown node type: ${node.type}`);
      }

      const result = await nodeType.execute(context, node, inputData);
      const executionTime = Date.now() - startTime;

      return {
        ...result,
        _execution: {
          startTime,
          executionTime,
          executionStatus: 'success',
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      return {
        error: [
          {
            json: {
              error: error.message,
              stack: error.stack,
            },
          },
        ],
        _execution: {
          startTime,
          executionTime,
          executionStatus: 'error',
        },
      };
    }
  }

  private buildExecutionData(
    nodeResults: Record<string, unknown>,
    nodeInputs: Record<string, unknown> = {},
    errorNodeId?: string,
    errorResult?: any
  ): ExecutionData {
    const runData: Record<string, any[]> = {};

    // Helper to format input data
    const formatInputData = (input: unknown): Array<{ json: unknown }> => {
      if (Array.isArray(input)) {
        return input.map((item) => ({ json: item }));
      }
      return [{ json: input }];
    };

    for (const [nodeId, result] of Object.entries(nodeResults)) {
      const execResult = result as any;
      const inputData = nodeInputs[nodeId];
      runData[nodeId] = [
        {
          startTime: execResult._execution?.startTime || Date.now(),
          executionTime: execResult._execution?.executionTime || 0,
          source: inputData ? formatInputData(inputData) : [],
          executionStatus: execResult._execution?.executionStatus || 'success',
          data: {
            main: execResult.main || [],
            error: execResult.error || [],
            // Include all output types dynamically
            ...Object.fromEntries(
              Object.entries(execResult).filter(
                ([key]) => key !== '_execution' && key !== 'main' && key !== 'error'
              )
            ),
          },
          error: execResult.error?.[0]?.json || undefined,
        },
      ];
    }

    if (errorNodeId && errorResult) {
      const inputData = nodeInputs[errorNodeId];
      runData[errorNodeId] = [
        {
          startTime: errorResult._execution?.startTime || Date.now(),
          executionTime: errorResult._execution?.executionTime || 0,
          source: inputData ? formatInputData(inputData) : [],
          executionStatus: 'error',
          data: {
            error: errorResult.error || [],
          },
          error: errorResult.error?.[0]?.json || undefined,
        },
      ];
    }

    return {
      resultData: {
        runData,
      },
    };
  }
}
