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
];
