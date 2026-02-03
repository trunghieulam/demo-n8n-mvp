import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';
import axios from 'axios';
import { CredentialService } from '../../services/CredentialService.js';

export class SlackNode extends BaseNode {
  name = 'n8n-nodes-base.slack';
  displayName = 'Slack';
  description = 'Send messages to Slack';
  icon = 'slack';
  inputs: string[] = ['main'];
  outputs: string[] = ['main', 'error'];

  properties = [
    {
      displayName: 'Channel',
      name: 'channel',
      type: 'string',
      required: true,
      description: 'Slack channel (e.g., #general)',
    },
    {
      displayName: 'Message',
      name: 'message',
      type: 'string',
      required: true,
      description: 'Message text',
    },
  ];

  credentials = [
    {
      name: 'slackOAuth2Api',
      displayName: 'Slack OAuth 2.0',
      properties: [],
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    try {
      const params = node.parameters as { channel: string; message: string };

      if (!node.credentials?.slackOAuth2Api) {
        throw new Error('Slack credential is required');
      }

      const credentialService = new CredentialService();
      const credData = await credentialService.getDecrypted(
        node.credentials.slackOAuth2Api,
        context.variables.userId as string
      );

      const inputItems = this.getInputData(inputData);
      const results: unknown[] = [];

      for (const item of inputItems) {
        // Replace placeholders in message
        let message = params.message;
        const data = item.json as Record<string, unknown>;
        
        message = message.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
          const value = expr.trim().split('.').reduce((obj: any, prop: string) => obj?.[prop], data);
          return String(value ?? match);
        });

        const response = await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: params.channel,
            text: message,
          },
          {
            headers: {
              Authorization: `Bearer ${credData.token as string}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.data.ok) {
          throw new Error(response.data.error || 'Failed to send Slack message');
        }

        results.push({
          success: true,
          ts: response.data.ts,
          channel: response.data.channel,
        });
      }

      return this.createOutput(results);
    } catch (error: any) {
      return this.createErrorOutput(error);
    }
  }
}
