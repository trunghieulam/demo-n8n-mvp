import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';
import { VM } from 'vm2';

export class FunctionNode extends BaseNode {
  name = 'n8n-nodes-base.function';
  displayName = 'Function';
  description = 'Execute JavaScript code';
  icon = 'code';
  inputs: string[] = ['main'];
  outputs: string[] = ['main', 'error'];

  properties = [
    {
      displayName: 'JavaScript Code',
      name: 'jsCode',
      type: 'code',
      required: true,
      description: 'JavaScript code to execute',
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    try {
      const params = node.parameters as { jsCode: string };
      const inputItems = this.getInputData(inputData);

      // Create VM with limited access
      const vm = new VM({
        timeout: 5000,
        sandbox: {
          data: inputItems.map((item) => item.json),
          $input: inputItems.map((item) => item.json),
        },
      });

      // Execute code
      const result = vm.run(`
        (function() {
          ${params.jsCode}
          return typeof $input !== 'undefined' ? $input : data;
        })()
      `);

      // Ensure result is an array
      const results = Array.isArray(result) ? result : [result];

      return this.createOutput(results);
    } catch (error: any) {
      return this.createErrorOutput(error);
    }
  }
}
