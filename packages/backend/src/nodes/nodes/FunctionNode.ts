import { BaseNode } from '../base/BaseNode.js';
import type { INodeOutput, ExecutionContext, INode } from '@shared/types';
import ivm from 'isolated-vm';
import { logger } from '../../utils/logger.js';

export class FunctionNode extends BaseNode {
  name = 'n8n-nodes-base.function';
  displayName = 'Function';
  description = 'Execute JavaScript code';
  icon = 'code';
  inputs: string[] = ['main'];
  outputs: string[] = ['main', 'error'];

  properties = [
    {
      displayName: 'JavaScript Code',
      name: 'jsCode',
      type: 'code',
      required: true,
      description: 'JavaScript code to execute',
    },
  ];

  async execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput> {
    const executionId = context.variables?.executionId || 'unknown';
    const sandboxId = `${executionId}:${node.id}`;
    
    try {
      const params = node.parameters as { jsCode: string };
      const inputItems = this.getInputData(inputData);

      logger.sandbox('Executing FunctionNode', executionId as string, node.id, sandboxId);

      // Create isolated VM with memory limits
      const isolate = new ivm.Isolate({
        memoryLimit: 128, // 128MB memory limit
      });

      const sandboxContext = await isolate.createContext();
      
      // Set up sandbox environment with limited access
      const jail = sandboxContext.global;
      const inputDataArray = inputItems.map((item) => item.json);
      
      // Use ExternalCopy to pass data into the isolate - must use copyInto() to transfer actual values
      const dataCopy = new ivm.ExternalCopy(inputDataArray);
      const inputCopy = new ivm.ExternalCopy(inputDataArray);
      
      await jail.set('data', dataCopy.copyInto());
      await jail.set('$input', inputCopy.copyInto());

      // Compile and run code with timeout
      const script = await isolate.compileScript(`
        (function() {
          ${params.jsCode}
          return typeof $input !== 'undefined' ? $input : data;
        })()
      `);

      const startTime = Date.now();
      const result = await script.run(sandboxContext, { timeout: 5000 });
      const executionTime = Date.now() - startTime;

      // Clean up isolate
      isolate.dispose();

      logger.sandbox(`FunctionNode completed in ${executionTime}ms`, executionId as string, node.id, sandboxId);

      // Copy result from isolate (result is already a JavaScript value)
      // Use ExternalCopy to transfer the result out
      let resultValue: unknown;
      if (result instanceof ivm.Reference) {
        resultValue = await result.copy();
      } else {
        // Result is already a primitive or was copied automatically
        resultValue = result;
      }

      // Ensure result is an array
      const results = Array.isArray(resultValue) ? resultValue : [resultValue];

      return this.createOutput(results);
    } catch (error: any) {
      logger.error('FunctionNode execution failed', error, {
        component: 'SANDBOX',
        executionId: executionId as string,
        nodeId: node.id,
        sandboxId,
      });
      return this.createErrorOutput(error);
    }
  }
}
