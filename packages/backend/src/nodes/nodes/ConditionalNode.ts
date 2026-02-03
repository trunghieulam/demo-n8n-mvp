import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';

export class ConditionalNode extends BaseNode {
  name = 'n8n-nodes-base.if';
  displayName = 'IF';
  description = 'Branch execution based on condition';
  icon = 'if';
  inputs: string[] = ['main'];
  outputs: string[] = ['true', 'false'];

  properties = [
    {
      displayName: 'Condition',
      name: 'condition',
      type: 'string',
      required: true,
      description: 'JavaScript expression that returns true/false',
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    try {
      const params = node.parameters as { condition: string };
      const inputItems = this.getInputData(inputData);

      const trueItems: unknown[] = [];
      const falseItems: unknown[] = [];

      for (const item of inputItems) {
        // Simple condition evaluation (in production, use a safer evaluator)
        const condition = params.condition.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
          // Evaluate expression with access to item data
          try {
            // Simple property access evaluation
            const value = expr.trim().split('.').reduce((obj: any, prop: string) => obj?.[prop], item.json);
            return String(value);
          } catch {
            return match;
          }
        });

        // Evaluate condition (simplified - in production use a proper expression evaluator)
        const result = eval(condition); // eslint-disable-line no-eval

        if (result) {
          trueItems.push(item.json);
        } else {
          falseItems.push(item.json);
        }
      }

      return {
        true: trueItems.map((item) => ({ json: item })),
        false: falseItems.map((item) => ({ json: item })),
      };
    } catch (error: any) {
      return this.createErrorOutput(error);
    }
  }
}
