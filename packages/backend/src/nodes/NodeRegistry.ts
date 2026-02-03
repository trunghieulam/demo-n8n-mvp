import type { INodeType, ExecutionContext, INode, INodeOutput } from '@shared/types';
import { WebhookNode } from './nodes/WebhookNode.js';
import { HttpNode } from './nodes/HttpNode.js';
import { FunctionNode } from './nodes/FunctionNode.js';
import { SetNode } from './nodes/SetNode.js';
import { MergeNode } from './nodes/MergeNode.js';
import { ConditionalNode } from './nodes/ConditionalNode.js';
import { LoopNode } from './nodes/LoopNode.js';
import { ScheduleNode } from './nodes/ScheduleNode.js';
import { SlackNode } from './nodes/SlackNode.js';
import { NoOpNode } from './nodes/NoOpNode.js';

class NodeRegistryClass {
  private nodeTypes: Map<string, INodeType> = new Map();

  constructor() {
    this.registerNode(new WebhookNode());
    this.registerNode(new HttpNode());
    this.registerNode(new FunctionNode());
    this.registerNode(new SetNode());
    this.registerNode(new MergeNode());
    this.registerNode(new ConditionalNode());
    this.registerNode(new LoopNode());
    this.registerNode(new ScheduleNode());
    this.registerNode(new SlackNode());
    this.registerNode(new NoOpNode());
  }

  registerNode(nodeType: INodeType): void {
    this.nodeTypes.set(nodeType.name, nodeType);
  }

  getNodeType(name: string): INodeType | undefined {
    return this.nodeTypes.get(name);
  }

  getAllNodeTypes(): INodeType[] {
    return Array.from(this.nodeTypes.values());
  }

  async executeNode(
    nodeTypeName: string,
    context: ExecutionContext,
    node: INode,
    inputData: unknown
  ): Promise<INodeOutput> {
    const nodeType = this.getNodeType(nodeTypeName);

    if (!nodeType) {
      throw new Error(`Unknown node type: ${nodeTypeName}`);
    }

    return await nodeType.execute(context, node, inputData);
  }
}

export const NodeRegistry = new NodeRegistryClass();
