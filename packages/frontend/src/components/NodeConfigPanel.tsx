import { useState, useEffect } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useWorkflowStore } from '../stores/workflowStore';
import { useCredentialStore } from '../stores/credentialStore';

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

  useEffect(() => {
    fetchCredentials();
  }, []);

  useEffect(() => {
    if (node) {
      setParameters(node.parameters || {});
      setSelectedCredential(node.credentials ? Object.values(node.credentials)[0] : undefined);
    }
  }, [node]);

  const handleParameterChange = (name: string, value: unknown) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!selectedWorkflow || !node) return;

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
  };

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
        {nodeType.properties.map((prop) => (
          <div key={prop.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {prop.displayName}
              {prop.required && <span className="text-red-500">*</span>}
            </label>
            {prop.type === 'options' ? (
              <select
                value={(parameters[prop.name] as string) || prop.default || ''}
                onChange={(e) => handleParameterChange(prop.name, e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                {prop.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.name}
                  </option>
                ))}
              </select>
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
                className="w-full px-3 py-2 border rounded"
                required={prop.required}
              />
            )}
            {prop.description && (
              <p className="text-xs text-gray-500 mt-1">{prop.description}</p>
            )}
          </div>
        ))}

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

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
