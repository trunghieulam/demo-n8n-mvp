import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';

export class ScheduleNode extends BaseNode {
  name = 'n8n-nodes-base.schedule';
  displayName = 'Schedule';
  description = 'Trigger workflow on schedule';
  icon = 'schedule';
  inputs: string[] = [];
  outputs: string[] = ['main'];

  properties = [
    {
      displayName: 'Cron Expression',
      name: 'cron',
      type: 'string',
      required: true,
      default: '0 * * * *',
      description: 'Cron expression (e.g., "0 * * * *" for hourly)',
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    // Schedule nodes are triggers - they don't execute during normal workflow runs
    // They're handled by a scheduler service
    // For MVP, return current timestamp
    return this.createOutput([
      {
        timestamp: new Date().toISOString(),
        triggered: true,
      },
    ]);
  }
}
