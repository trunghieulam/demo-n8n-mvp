import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { ExecutionData, NodeExecutionData } from '@shared/types';

interface Execution {
  id: string;
  workflowId: string;
  status: string;
  mode: string;
  startedAt: string;
  finishedAt?: string;
  executionData: ExecutionData;
  workflowData?: {
    nodes: Array<{ id: string; name: string; type: string }>;
  };
}

interface ExecutionLogsPanelProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExecutionLogsPanel({ workflowId, isOpen, onClose }: ExecutionLogsPanelProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (isOpen && workflowId) {
      fetchExecutions();
      // Poll for updates every 2 seconds if auto-refresh is enabled
      const interval = autoRefresh
        ? setInterval(() => {
            fetchExecutions();
          }, 2000)
        : null;
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isOpen, workflowId, autoRefresh]);

  const fetchExecutions = async () => {
    try {
      const response = await apiClient.get('/executions', {
        params: { workflowId, limit: 10 },
      });
      setExecutions(response.data.data || []);
      
      // Auto-select the most recent execution if none is selected
      if (!selectedExecution && response.data.data && response.data.data.length > 0) {
        setSelectedExecution(response.data.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatExecutionTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatNodeData = (data: unknown): string => {
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    }
    return String(data);
  };

  const renderNodeLog = (nodeId: string, nodeData: NodeExecutionData[], nodeName?: string) => {
    const latestData = nodeData[nodeData.length - 1];
    const isError = latestData.executionStatus === 'error';

    return (
      <div key={nodeId} className="mb-4 border rounded-lg overflow-hidden">
        <div
          className={`px-4 py-2 font-semibold ${
            isError ? 'bg-red-50 text-red-900' : 'bg-gray-50 text-gray-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>{nodeName || nodeId}</span>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`px-2 py-1 rounded text-xs ${
                  isError
                    ? 'bg-red-200 text-red-800'
                    : 'bg-green-200 text-green-800'
                }`}
              >
                {latestData.executionStatus}
              </span>
              <span className="text-gray-600">
                {formatExecutionTime(latestData.executionTime)}
              </span>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white">
          {latestData.error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
              <div className="font-semibold text-red-900 mb-1">Error:</div>
              <div className="text-red-800 text-sm">{latestData.error.message}</div>
              {latestData.error.stack && (
                <pre className="mt-2 text-xs text-red-700 overflow-x-auto">
                  {latestData.error.stack}
                </pre>
              )}
            </div>
          )}
          {latestData.data.main && latestData.data.main.length > 0 && (
            <div className="mb-3">
              <div className="font-semibold text-gray-700 mb-2">Output:</div>
              <div className="space-y-2">
                {latestData.data.main.map((item, idx) => (
                  <pre
                    key={idx}
                    className="p-2 bg-gray-50 border rounded text-xs overflow-x-auto"
                  >
                    {formatNodeData(item.json)}
                  </pre>
                ))}
              </div>
            </div>
          )}
          {latestData.data.error && latestData.data.error.length > 0 && (
            <div className="mb-3">
              <div className="font-semibold text-red-700 mb-2">Error Output:</div>
              <div className="space-y-2">
                {latestData.data.error.map((item, idx) => (
                  <pre
                    key={idx}
                    className="p-2 bg-red-50 border border-red-200 rounded text-xs overflow-x-auto"
                  >
                    {formatNodeData(item.json)}
                  </pre>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-white border-l shadow-lg flex flex-col h-full">
      <div className="border-b p-4 flex justify-between items-center">
        <h3 className="text-lg font-bold">Execution Logs</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Auto-refresh</span>
          </label>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && executions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : executions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No executions found. Execute the workflow to see logs.
          </div>
        ) : (
          <div className="p-4">
            {/* Execution List */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">Recent Executions:</div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {executions.map((execution) => (
                  <button
                    key={execution.id}
                    onClick={() => setSelectedExecution(execution)}
                    className={`w-full text-left p-2 rounded border text-sm ${
                      selectedExecution?.id === execution.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          execution.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : execution.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {execution.status}
                      </span>
                      <span className="text-xs text-gray-600">
                        {new Date(execution.startedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Execution Details */}
            {selectedExecution && (
              <div>
                <div className="mb-4 p-3 bg-gray-50 rounded border">
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">Status:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          selectedExecution.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : selectedExecution.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {selectedExecution.status}
                      </span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">Mode:</span>
                      <span className="text-gray-600">{selectedExecution.mode}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">Started:</span>
                      <span className="text-gray-600">
                        {new Date(selectedExecution.startedAt).toLocaleString()}
                      </span>
                    </div>
                    {selectedExecution.finishedAt && (
                      <div className="flex justify-between">
                        <span className="font-semibold">Finished:</span>
                        <span className="text-gray-600">
                          {new Date(selectedExecution.finishedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Node Logs */}
                <div className="text-sm font-semibold text-gray-700 mb-2">Node Execution Logs:</div>
                {selectedExecution.executionData?.resultData?.runData ? (
                  <div>
                    {Object.entries(selectedExecution.executionData.resultData.runData).map(
                      ([nodeId, nodeData]) => {
                        // Try to find node name from workflow snapshot
                        const workflowNodes = (selectedExecution as any).workflowData?.nodes || [];
                        const node = workflowNodes.find((n: any) => n.id === nodeId);
                        const nodeName = node ? `${node.name} (${node.type})` : nodeId;
                        return renderNodeLog(nodeId, nodeData as NodeExecutionData[], nodeName);
                      }
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 p-4 text-center">
                    No execution data available
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
