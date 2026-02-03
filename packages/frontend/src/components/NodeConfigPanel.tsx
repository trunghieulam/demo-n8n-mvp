import { useState, useEffect } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useCredentialStore } from '../stores/credentialStore';
import { apiClient } from '../api/client';
import { validateUrl, validateJson } from '../utils/validation';

interface NodeConfigPanelProps {
  nodeId: string;
  onDelete?: (nodeId: string) => void;
}

export default function NodeConfigPanel({ nodeId, onDelete }: NodeConfigPanelProps) {
  const { selectedWorkflow, updateWorkflow } = useWorkflowStore();
  const { getNodeType } = useNodeTypesStore();
  const { credentials, fetchCredentials } = useCredentialStore();
  const { selectNode } = useCanvasStore();

  const node = selectedWorkflow?.nodes.find((n) => n.id === nodeId);
  const nodeType = node ? getNodeType(node.type) : undefined;

  const [parameters, setParameters] = useState<Record<string, unknown>>(node?.parameters || {});
  const [selectedCredential, setSelectedCredential] = useState<string | undefined>(
    node?.credentials ? Object.values(node.credentials)[0] : undefined
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchCredentials();
  }, []);

  useEffect(() => {
    if (node) {
      setParameters(node.parameters || {});
      setSelectedCredential(node.credentials ? Object.values(node.credentials)[0] : undefined);
      setValidationErrors({});
      setTestConnectionResult(null);
    }
  }, [node]);

  const validateField = (name: string, value: unknown, propType: string): string | undefined => {
    if (nodeType?.properties.find((p) => p.name === name)?.required && !value) {
      return 'This field is required';
    }

    if (propType === 'string' && name === 'url' && typeof value === 'string') {
      const result = validateUrl(value);
      return result.valid ? undefined : result.error;
    }

    if (propType === 'json' && typeof value === 'string' && value) {
      const result = validateJson(value);
      return result.valid ? undefined : result.error;
    }

    return undefined;
  };

  const handleParameterChange = (name: string, value: unknown) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
    
    // Clear test connection result when parameters change
    if (testConnectionResult) {
      setTestConnectionResult(null);
    }

    // Validate field in real-time
    const prop = nodeType?.properties.find((p) => p.name === name);
    if (prop) {
      const error = validateField(name, value, prop.type);
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        if (error) {
          newErrors[name] = error;
        } else {
          delete newErrors[name];
        }
        return newErrors;
      });
    }
  };

  const handleTestConnection = async () => {
    if (!node || node.type !== 'n8n-nodes-base.http') return;
    
    setIsTestingConnection(true);
    setTestConnectionResult(null);
    
    try {
      const response = await apiClient.post('/node-types/test-connection', {
        nodeType: node.type,
        parameters,
      });
      setTestConnectionResult({
        success: response.data.success,
        message: response.data.message || 'Connection test completed',
      });
    } catch (error: any) {
      setTestConnectionResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Connection test failed',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!selectedWorkflow || !node) return;

    // Validate all required fields before saving
    const errors: Record<string, string> = {};
    nodeType?.properties.forEach((prop) => {
      if (prop.required && !parameters[prop.name]) {
        errors[prop.name] = 'This field is required';
      } else {
        const error = validateField(prop.name, parameters[prop.name], prop.type);
        if (error) {
          errors[prop.name] = error;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const updatedNodes = selectedWorkflow.nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            parameters,
            credentials: selectedCredential
              ? { [nodeType?.credentials?.[0]?.name || '']: selectedCredential }
              : undefined,
          }
        : n
    );

    await updateWorkflow(selectedWorkflow.id, { nodes: updatedNodes });
    setTestConnectionResult(null);
  };

  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const isHttpNode = node?.type === 'n8n-nodes-base.http';

  if (!node || !nodeType) {
    return null;
  }

  return (
    <div className="w-80 bg-white border-l p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">{nodeType.displayName}</h3>
        <button onClick={() => selectNode(null)} className="text-gray-500">
          ×
        </button>
      </div>

      <div className="space-y-4">
        {nodeType.properties.map((prop) => {
          const hasError = !!validationErrors[prop.name];
          const isValid = prop.name in parameters && !hasError;
          
          return (
            <div key={prop.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {prop.displayName}
                {prop.required && <span className="text-red-500">*</span>}
              </label>
              <div className="relative">
                {prop.type === 'options' ? (
                  <select
                    value={(parameters[prop.name] as string) || prop.default || ''}
                    onChange={(e) => handleParameterChange(prop.name, e.target.value)}
                    className={`w-full px-3 py-2 border rounded ${
                      hasError ? 'border-red-500' : isValid ? 'border-green-500' : ''
                    }`}
                  >
                    {prop.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                ) : prop.type === 'json' ? (
                  <textarea
                    value={(parameters[prop.name] as string) || ''}
                    onChange={(e) => handleParameterChange(prop.name, e.target.value)}
                    onBlur={(e) => {
                      const error = validateField(prop.name, e.target.value, prop.type);
                      setValidationErrors((prev) => {
                        const newErrors = { ...prev };
                        if (error) {
                          newErrors[prop.name] = error;
                        } else {
                          delete newErrors[prop.name];
                        }
                        return newErrors;
                      });
                    }}
                    className={`w-full px-3 py-2 border rounded font-mono text-sm ${
                      hasError ? 'border-red-500' : isValid ? 'border-green-500' : ''
                    }`}
                    rows={4}
                    required={prop.required}
                  />
                ) : (
                  <input
                    type={prop.type === 'number' ? 'number' : 'text'}
                    value={(parameters[prop.name] as string) || ''}
                    onChange={(e) =>
                      handleParameterChange(
                        prop.name,
                        prop.type === 'number' ? Number(e.target.value) : e.target.value
                      )
                    }
                    onBlur={(e) => {
                      const error = validateField(prop.name, e.target.value, prop.type);
                      setValidationErrors((prev) => {
                        const newErrors = { ...prev };
                        if (error) {
                          newErrors[prop.name] = error;
                        } else {
                          delete newErrors[prop.name];
                        }
                        return newErrors;
                      });
                    }}
                    className={`w-full px-3 py-2 border rounded ${
                      hasError ? 'border-red-500' : isValid ? 'border-green-500' : ''
                    }`}
                    required={prop.required}
                  />
                )}
                {isValid && (
                  <span className="absolute right-2 top-2 text-green-500">✓</span>
                )}
                {hasError && (
                  <span className="absolute right-2 top-2 text-red-500">✗</span>
                )}
              </div>
              {hasError && (
                <p className="text-xs text-red-600 mt-1">{validationErrors[prop.name]}</p>
              )}
              {prop.description && !hasError && (
                <p className="text-xs text-gray-500 mt-1">{prop.description}</p>
              )}
            </div>
          );
        })}

        {nodeType.credentials && nodeType.credentials.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credential
            </label>
            <select
              value={selectedCredential || ''}
              onChange={(e) => setSelectedCredential(e.target.value || undefined)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">None</option>
              {credentials
                .filter((c) => c.type === nodeType.credentials?.[0]?.name)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {isHttpNode && (
          <div>
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection || hasValidationErrors || !parameters.url}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingConnection ? 'Testing...' : 'Test Connection'}
            </button>
            {testConnectionResult && (
              <div
                className={`mt-2 p-2 rounded text-sm ${
                  testConnectionResult.success
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {testConnectionResult.message}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={hasValidationErrors}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Node
          </button>
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this node?')) {
                  onDelete(nodeId);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              title="Delete node"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
