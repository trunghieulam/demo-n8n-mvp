import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';

export class MergeNode extends BaseNode {
  name = 'n8n-nodes-base.merge';
  displayName = 'Merge';
  description = 'Combine data from multiple inputs';
  icon = 'merge';
  inputs: string[] = ['main', 'main'];
  outputs: string[] = ['main'];

  properties = [
    {
      displayName: 'Mode',
      name: 'mode',
      type: 'options',
      required: true,
      default: 'merge',
      options: [
        { name: 'Merge', value: 'merge' },
        { name: 'Append', value: 'append' },
      ],
      description: 'How to combine inputs',
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    const params = node.parameters as { mode: string };
    
    // For MVP, merge mode combines objects, append mode combines arrays
    // In a real implementation, this would handle multiple input connections
    const inputItems = this.getInputData(inputData);

    if (params.mode === 'append') {
      return this.createOutput(inputItems.map((item) => item.json));
    }

    // Merge mode - combine all objects
    const merged = inputItems.reduce((acc, item) => {
      return { ...acc, ...(item.json as Record<string, unknown>) };
    }, {});

    return this.createOutput([merged]);
  }
}
