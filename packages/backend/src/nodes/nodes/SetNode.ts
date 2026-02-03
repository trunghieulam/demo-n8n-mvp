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

    // Helper function to extract nested values using dot notation (e.g., "body.daily.temperature_2m_max[1]")
    const extractValue = (path: string, data: unknown): unknown => {
      if (!path || typeof path !== 'string') return path;
      
      // Parse path like "body.daily.temperature_2m_max[1]" into parts
      const parts: Array<string | number> = [];
      let current = '';
      
      for (let i = 0; i < path.length; i++) {
        const char = path[i];
        if (char === '.') {
          if (current) {
            parts.push(current);
            current = '';
          }
        } else if (char === '[') {
          if (current) {
            parts.push(current);
            current = '';
          }
          // Find the closing bracket
          let indexStr = '';
          i++;
          while (i < path.length && path[i] !== ']') {
            indexStr += path[i];
            i++;
          }
          if (indexStr && !isNaN(Number(indexStr))) {
            parts.push(parseInt(indexStr, 10));
          }
        } else {
          current += char;
        }
      }
      if (current) {
        parts.push(current);
      }
      
      // Navigate through the data structure
      let result: any = data;
      for (const part of parts) {
        if (result === null || result === undefined) return undefined;
        result = result[part];
      }
      
      return result;
    };

    // Helper to evaluate template expressions in strings (e.g., "{{path}}°C tomorrow")
    const evaluateTemplate = (template: string, rootData: unknown): string => {
      // Find all {{...}} expressions in the string using regex
      const regex = /\{\{([^}]+)\}\}/g;
      let result = template;
      let match;
      
      // Reset regex lastIndex to ensure we start from the beginning
      regex.lastIndex = 0;
      
      while ((match = regex.exec(template)) !== null) {
        const fullMatch = match[0]; // e.g., "{{body.daily.temperature_2m_max[1]}}"
        const path = match[1].trim(); // e.g., "body.daily.temperature_2m_max[1]"
        
        // Handle $json prefix
        let cleanPath = path.startsWith('$json.') ? path.slice(6) : path;
        
        // Determine the root object to extract from
        let dataRoot: unknown = rootData;
        
        // If path starts with "body.", extract from body property (HTTP response structure)
        if (cleanPath.startsWith('body.')) {
          dataRoot = (rootData as Record<string, unknown>)?.body || rootData;
          cleanPath = cleanPath.slice(5); // Remove "body." prefix
        }
        
        const extracted = extractValue(cleanPath, dataRoot);
        const replacement = extracted !== undefined && extracted !== null ? String(extracted) : '';
        
        // Replace the template expression with the extracted value
        result = result.replace(fullMatch, replacement);
      }
      
      return result;
    };

    const results = inputItems.map((item) => {
      const inputJson = item.json as Record<string, unknown>;
      // Only output the specified fields, not the entire input
      const output: Record<string, unknown> = {};
      
      // Determine root data (prefer body for HTTP responses)
      const rootData = inputJson.body || inputJson;
      
      // Process each value
      for (const [key, value] of Object.entries(values)) {
        if (typeof value === 'string') {
          // Check if it contains template expressions
          if (value.includes('{{') && value.includes('}}')) {
            // Evaluate template expressions within the string
            output[key] = evaluateTemplate(value, rootData);
          } else {
            // No template expressions, use as-is
            output[key] = value;
          }
        } else {
          // Non-string value, use as-is
          output[key] = value;
        }
      }
      
      return output;
    });

    return this.createOutput(results);
  }
}
