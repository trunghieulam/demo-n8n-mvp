import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';

export class SetNode extends BaseNode {
  name = 'n8n-nodes-base.set';
  displayName = 'Set';
  description = 'Set or transform data values';
  icon = 'edit';
  inputs: string[] = ['main'];
  outputs: string[] = ['main'];

  properties = [
    {
      displayName: 'Values',
      name: 'values',
      type: 'json',
      required: true,
      description: 'Key-value pairs to set',
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    const params = node.parameters as { values: Record<string, unknown> | string };
    const inputItems = this.getInputData(inputData);

    let values: Record<string, unknown>;
    if (typeof params.values === 'string') {
      values = JSON.parse(params.values);
    } else {
      values = params.values;
    }

    const results = inputItems.map((item) => ({
      ...(item.json as Record<string, unknown>),
      ...values,
    }));

    return this.createOutput(results);
  }
}
