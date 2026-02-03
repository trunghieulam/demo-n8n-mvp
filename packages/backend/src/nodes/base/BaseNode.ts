import type { INodeType, ExecutionContext, INode, INodeOutput, INodeProperty } from '@shared/types';

export abstract class BaseNode implements INodeType {
  abstract name: string;
  abstract displayName: string;
  abstract description: string;
  abstract icon: string;
  abstract inputs: string[];
  abstract outputs: string[];
  abstract properties: INodeProperty[];

  abstract execute(context: ExecutionContext, node: INode, inputData: unknown): Promise<INodeOutput>;

  protected getInputData(inputData: unknown): Array<{ json: unknown }> {
    if (Array.isArray(inputData)) {
      return inputData.map((item) => ({ json: item }));
    }
    return [{ json: inputData }];
  }

  protected createOutput(data: unknown[]): INodeOutput {
    return {
      main: data.map((item) => ({ json: item })),
    };
  }

  protected createErrorOutput(error: Error): INodeOutput {
    return {
      error: [
        {
          json: {
            error: error.message,
            stack: error.stack,
          },
        },
      ],
    };
  }
}
