import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';
import axios, { AxiosRequestConfig } from 'axios';
import { CredentialService } from '../../services/CredentialService.js';

export class HttpNode extends BaseNode {
  name = 'n8n-nodes-base.http';
  displayName = 'HTTP Request';
  description = 'Make HTTP requests';
  icon = 'http';
  inputs: string[] = ['main'];
  outputs: string[] = ['main', 'error'];

  properties = [
    {
      displayName: 'URL',
      name: 'url',
      type: 'string',
      required: true,
      description: 'Request URL',
    },
    {
      displayName: 'Method',
      name: 'method',
      type: 'options',
      required: true,
      default: 'GET',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'DELETE', value: 'DELETE' },
        { name: 'PATCH', value: 'PATCH' },
      ],
      description: 'HTTP method',
    },
    {
      displayName: 'Headers',
      name: 'headers',
      type: 'json',
      required: false,
      description: 'Request headers (JSON)',
    },
    {
      displayName: 'Body',
      name: 'body',
      type: 'json',
      required: false,
      description: 'Request body (JSON)',
    },
    {
      displayName: 'Timeout',
      name: 'timeout',
      type: 'number',
      required: false,
      default: 30000,
      description: 'Request timeout in milliseconds',
    },
  ];

  credentials = [
    {
      name: 'httpBasicAuth',
      displayName: 'HTTP Basic Auth',
      properties: [],
    },
    {
      name: 'httpBearerToken',
      displayName: 'HTTP Bearer Token',
      properties: [],
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    try {
      const params = node.parameters as {
        url: string;
        method: string;
        headers?: string | Record<string, string>;
        body?: string | unknown;
        timeout?: number;
      };

      const inputItems = this.getInputData(inputData);
      const results: unknown[] = [];

      for (const item of inputItems) {
        const config: AxiosRequestConfig = {
          method: params.method || 'GET',
          url: params.url,
          timeout: params.timeout || 30000,
        };

        // Parse headers
        if (params.headers) {
          if (typeof params.headers === 'string') {
            config.headers = JSON.parse(params.headers);
          } else {
            config.headers = params.headers;
          }
        }

        // Parse body
        if (params.body && ['POST', 'PUT', 'PATCH'].includes(params.method)) {
          if (typeof params.body === 'string') {
            try {
              config.data = JSON.parse(params.body);
            } catch {
              config.data = params.body;
            }
          } else {
            config.data = params.body;
          }
        }

        // Add credentials if specified
        if (node.credentials) {
          const credentialService = new CredentialService();
          
          if (node.credentials.httpBasicAuth) {
            const credData = await credentialService.getDecrypted(
              node.credentials.httpBasicAuth,
              context.variables.userId as string
            );
            config.auth = {
              username: credData.username as string,
              password: credData.password as string,
            };
          }

          if (node.credentials.httpBearerToken) {
            const credData = await credentialService.getDecrypted(
              node.credentials.httpBearerToken,
              context.variables.userId as string
            );
            if (!config.headers) config.headers = {};
            config.headers.Authorization = `Bearer ${credData.token as string}`;
          }
        }

        const response = await axios(config);

        results.push({
          statusCode: response.status,
          headers: response.headers,
          body: response.data,
        });
      }

      return this.createOutput(results);
    } catch (error: any) {
      return this.createErrorOutput(error);
    }
  }
}
