import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';

export class NoOpNode extends BaseNode {
  name = 'n8n-nodes-base.noOp';
  displayName = 'NoOp';
  description = 'Pass data through without modification';
  icon = 'passthrough';
  inputs: string[] = ['main'];
  outputs: string[] = ['main'];

  properties: any[] = [];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    const inputItems = this.getInputData(inputData);
    return this.createOutput(inputItems.map((item) => item.json));
  }
}
