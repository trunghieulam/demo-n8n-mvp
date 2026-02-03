import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';

export class WebhookNode extends BaseNode {
  name = 'n8n-nodes-base.webhook';
  displayName = 'Webhook';
  description = 'Receive HTTP requests';
  icon = 'webhook';
  inputs: string[] = [];
  outputs: string[] = ['main'];

  properties = [
    {
      displayName: 'Path',
      name: 'path',
      type: 'string',
      required: true,
      description: 'Webhook path',
    },
    {
      displayName: 'Method',
      name: 'method',
      type: 'options',
      required: true,
      default: 'POST',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'DELETE', value: 'DELETE' },
      ],
      description: 'HTTP method',
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    // Webhook nodes are triggers - they receive data from external requests
    // The inputData comes from the webhook request
    // For MVP, we'll pass through the webhook data
    const webhookData = inputData || {};

    return this.createOutput([webhookData]);
  }
}
