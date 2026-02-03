import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';

interface Execution {
  id: string;
  workflowId: string;
  status: string;
  mode: string;
  startedAt: string;
  finishedAt?: string;
  executionData: any;
}

export default function Executions() {
  const { id } = useParams<{ id?: string }>();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchExecutions();
  }, [id, statusFilter]);

  const fetchExecutions = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (id) params.workflowId = id;
      if (statusFilter) params.status = statusFilter;

      const response = await apiClient.get('/executions', { params });
      setExecutions(response.data.data);
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (executionId: string) => {
    try {
      await apiClient.post(`/executions/${executionId}/retry`);
      fetchExecutions();
    } catch (error) {
      console.error('Failed to retry execution:', error);
    }
  };

  const handleDelete = async (executionId: string) => {
    if (window.confirm('Delete this execution?')) {
      try {
        await apiClient.delete(`/executions/${executionId}`);
        fetchExecutions();
      } catch (error) {
        console.error('Failed to delete execution:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Execution History</h1>

        <div className="mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="running">Running</option>
          </select>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : executions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No executions found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {executions.map((execution) => (
              <div key={execution.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          execution.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : execution.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {execution.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(execution.startedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      Mode: {execution.mode}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {execution.status === 'error' && (
                      <button
                        onClick={() => handleRetry(execution.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(execution.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
