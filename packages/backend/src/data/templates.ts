import type { INode, IConnections } from '@shared/types';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: INode[];
  connections: IConnections;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'weather-alert',
    name: 'Weather Alert',
    description: 'Fetch weather data from an API and extract forecast information',
    nodes: [
      {
        id: 'trigger_1',
        name: 'Manual Trigger',
        type: 'n8n-nodes-base.webhook',
        position: { x: 250, y: 100 },
        parameters: {
          method: 'POST',
          path: `webhook/weather-${Date.now()}`,
        },
      },
      {
        id: 'http_1',
        name: 'Get Weather',
        type: 'n8n-nodes-base.http',
        position: { x: 250, y: 250 },
        parameters: {
          url: 'https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&daily=temperature_2m_max&timezone=auto',
          method: 'GET',
        },
      },
      {
        id: 'set_1',
        name: 'Extract Forecast',
        type: 'n8n-nodes-base.set',
        position: { x: 250, y: 400 },
        parameters: {
          values: JSON.stringify({
            alert: 'Tomorrow\'s Weather Forecast',
            date: '{{body.daily.time[1]}}',
            temperature: '{{body.daily.temperature_2m_max[1]}}',
            unit: '°C',
            forecast: '{{body.daily.temperature_2m_max[1]}}°C tomorrow',
          }),
        },
      },
      {
        id: 'output_1',
        name: 'Log Result',
        type: 'n8n-nodes-base.noOp',
        position: { x: 250, y: 550 },
        parameters: {},
      },
    ],
    connections: {
      trigger_1: {
        main: [[{ node: 'http_1', type: 'main', index: 0 }]],
      },
      http_1: {
        main: [[{ node: 'set_1', type: 'main', index: 0 }]],
      },
      set_1: {
        main: [[{ node: 'output_1', type: 'main', index: 0 }]],
      },
    },
  },
  {
    id: 'data-processing-pipeline',
    name: 'Data Processing Pipeline',
    description: 'Process and transform data with custom code, loops, and structured output',
    nodes: [
      {
        id: 'schedule_1',
        name: 'Scheduled Trigger',
        type: 'n8n-nodes-base.schedule',
        position: { x: 250, y: 100 },
        parameters: {
          cron: '0 9 * * *', // Every day at 9 AM
        },
      },
      {
        id: 'function_1',
        name: 'Generate Sample Data',
        type: 'n8n-nodes-base.function',
        position: { x: 250, y: 250 },
        parameters: {
          jsCode: `// Generate sample product data
var products = [
  { id: 1, name: 'Widget A', price: 29.99, quantity: 100 },
  { id: 2, name: 'Widget B', price: 49.99, quantity: 50 },
  { id: 3, name: 'Widget C', price: 19.99, quantity: 200 },
];

return [{ products: products, generatedAt: '2026-02-03' }];`,
        },
      },
      {
        id: 'loop_1',
        name: 'Iterate Products',
        type: 'n8n-nodes-base.loop',
        position: { x: 250, y: 400 },
        parameters: {
          arrayField: 'products',
        },
      },
      {
        id: 'set_1',
        name: 'Calculate Total Value',
        type: 'n8n-nodes-base.set',
        position: { x: 250, y: 550 },
        parameters: {
          values: JSON.stringify({
            productId: '{{_item.id}}',
            productName: '{{_item.name}}',
            unitPrice: '{{_item.price}}',
            stock: '{{_item.quantity}}',
            totalValue: '{{_item.price * _item.quantity}}',
          }),
        },
      },
      {
        id: 'output_1',
        name: 'Output Results',
        type: 'n8n-nodes-base.noOp',
        position: { x: 250, y: 700 },
        parameters: {},
      },
    ],
    connections: {
      schedule_1: {
        main: [[{ node: 'function_1', type: 'main', index: 0 }]],
      },
      function_1: {
        main: [[{ node: 'loop_1', type: 'main', index: 0 }]],
      },
      loop_1: {
        main: [[{ node: 'set_1', type: 'main', index: 0 }]],
      },
      set_1: {
        main: [[{ node: 'output_1', type: 'main', index: 0 }]],
      },
    },
  },
  {
    id: 'api-conditional-routing',
    name: 'API Gateway with Conditional Routing',
    description: 'Fetch data from API and route based on response status using conditional branching',
    nodes: [
      {
        id: 'webhook_1',
        name: 'API Gateway',
        type: 'n8n-nodes-base.webhook',
        position: { x: 350, y: 100 },
        parameters: {
          method: 'POST',
          path: `webhook/gateway-${Date.now()}`,
        },
      },
      {
        id: 'http_1',
        name: 'Fetch User Data',
        type: 'n8n-nodes-base.http',
        position: { x: 350, y: 250 },
        parameters: {
          url: 'https://httpbin.org/json',
          method: 'GET',
        },
      },
      {
        id: 'if_1',
        name: 'Check Response Status',
        type: 'n8n-nodes-base.if',
        position: { x: 350, y: 400 },
        parameters: {
          condition: '{{statusCode}} === 200',
        },
      },
      {
        id: 'set_success',
        name: 'Format Success Response',
        type: 'n8n-nodes-base.set',
        position: { x: 150, y: 550 },
        parameters: {
          values: JSON.stringify({
            status: 'success',
            message: 'API responded successfully',
            title: '{{body.slideshow.title}}',
            author: '{{body.slideshow.author}}',
          }),
        },
      },
      {
        id: 'set_error',
        name: 'Format Error Response',
        type: 'n8n-nodes-base.set',
        position: { x: 550, y: 550 },
        parameters: {
          values: JSON.stringify({
            status: 'error',
            message: 'API request failed',
            errorCode: 'API_ERROR',
          }),
        },
      },
      {
        id: 'output_success',
        name: 'Success Output',
        type: 'n8n-nodes-base.noOp',
        position: { x: 150, y: 700 },
        parameters: {},
      },
      {
        id: 'output_error',
        name: 'Error Output',
        type: 'n8n-nodes-base.noOp',
        position: { x: 550, y: 700 },
        parameters: {},
      },
    ],
    connections: {
      webhook_1: {
        main: [[{ node: 'http_1', type: 'main', index: 0 }]],
      },
      http_1: {
        main: [[{ node: 'if_1', type: 'main', index: 0 }]],
      },
      if_1: {
        true: [[{ node: 'set_success', type: 'main', index: 0 }]],
        false: [[{ node: 'set_error', type: 'main', index: 0 }]],
      },
      set_success: {
        main: [[{ node: 'output_success', type: 'main', index: 0 }]],
      },
      set_error: {
        main: [[{ node: 'output_error', type: 'main', index: 0 }]],
      },
    },
  },
];
