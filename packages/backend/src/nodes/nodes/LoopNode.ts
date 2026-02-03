import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';

export class LoopNode extends BaseNode {
  name = 'n8n-nodes-base.loop';
  displayName = 'Loop';
  description = 'Iterate over array items';
  icon = 'loop';
  inputs: string[] = ['main'];
  outputs: string[] = ['main'];

  properties = [
    {
      displayName: 'Array Field',
      name: 'arrayField',
      type: 'string',
      required: true,
      description: 'Field name containing array to iterate',
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    const params = node.parameters as { arrayField: string };
    const inputItems = this.getInputData(inputData);

    const results: unknown[] = [];

    for (const item of inputItems) {
      const data = item.json as Record<string, unknown>;
      const array = data[params.arrayField];

      if (Array.isArray(array)) {
        for (let i = 0; i < array.length; i++) {
          results.push({
            ...data,
            [params.arrayField]: array[i],
            _index: i,
            _item: array[i],
          });
        }
      } else {
        // If not an array, pass through
        results.push(item.json);
      }
    }

    return this.createOutput(results);
  }
}
