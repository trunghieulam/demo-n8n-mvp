export interface INode {
    id: string;
    name: string;
    type: string;
    position: {
        x: number;
        y: number;
    };
    parameters: Record<string, unknown>;
    credentials?: Record<string, string>;
    disabled?: boolean;
    notes?: string;
}
export interface IConnection {
    node: string;
    type: string;
    index: number;
}
export interface IConnections {
    [sourceNodeId: string]: {
        [connectionType: string]: IConnection[][];
    };
}
export interface WorkflowSettings {
    timeout?: number;
    maxConcurrentExecutions?: number;
}
export interface WorkflowSnapshot {
    nodes: INode[];
    connections: IConnections;
    settings?: WorkflowSettings;
}
export type ExecutionMode = "manual" | "trigger" | "webhook" | "test";
export type ExecutionStatus = "running" | "success" | "error" | "waiting";
export interface NodeExecutionData {
    startTime: number;
    executionTime: number;
    source: unknown[];
    executionStatus: "success" | "error";
    data: {
        main?: Array<{
            json: unknown;
            binary?: unknown;
        }>;
        error?: Array<{
            json: unknown;
            binary?: unknown;
        }>;
    };
    error?: {
        message: string;
        stack?: string;
    };
}
export interface ExecutionData {
    resultData: {
        runData: {
            [nodeId: string]: NodeExecutionData[];
        };
    };
}
export interface INodeProperty {
    displayName: string;
    name: string;
    type: string;
    required?: boolean;
    description?: string;
    default?: unknown;
    options?: Array<{
        name: string;
        value: string;
    }>;
}
export interface ICredentialType {
    name: string;
    displayName: string;
    properties: INodeProperty[];
}
export interface INodeType {
    name: string;
    displayName: string;
    description: string;
    icon: string;
    inputs: string[];
    outputs: string[];
    properties: INodeProperty[];
    credentials?: ICredentialType[];
}
export interface ExecutionContext {
    workflowData: WorkflowSnapshot;
    executionData: ExecutionData;
    variables: Record<string, unknown>;
}
export interface INodeOutput {
    [outputType: string]: Array<{
        json: unknown;
        binary?: unknown;
    }>;
}
//# sourceMappingURL=index.d.ts.map