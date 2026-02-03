import { useState, useEffect } from 'react';
import { useWorkflowStore, Workflow } from '../stores/workflowStore';
import { apiClient } from '../api/client';

interface Template {
  id: string;
  name: string;
  description: string;
  nodeCount: number;
}

interface CreateWorkflowModalProps {
  onClose: () => void;
  onSuccess: (workflow: Workflow) => void;
}

export default function CreateWorkflowModal({ onClose, onSuccess }: CreateWorkflowModalProps) {
  const { createWorkflow, createWorkflowFromTemplate } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'blank' | 'template'>('blank');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'template') {
      fetchTemplates();
    }
  }, [activeTab]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await apiClient.get('/workflows/templates');
      setTemplates(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let workflow: Workflow;
      if (activeTab === 'template') {
        if (!selectedTemplateId) {
          setError('Please select a template');
          setIsLoading(false);
          return;
        }
        workflow = await createWorkflowFromTemplate(
          selectedTemplateId,
          name,
          description || undefined
        );
      } else {
        workflow = await createWorkflow(name, description || undefined);
      }
      onSuccess(workflow);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create workflow');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Create Workflow</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('blank');
              setSelectedTemplateId('');
            }}
            className={`px-4 py-2 font-medium ${
              activeTab === 'blank'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Blank Workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('template')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'template'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            From Template
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'template' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template *
              </label>
              {isLoadingTemplates ? (
                <div className="text-sm text-gray-500 py-2">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-sm text-gray-500 py-2">No templates available</div>
              ) : (
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  required={activeTab === 'template'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.nodeCount} nodes)
                    </option>
                  ))}
                </select>
              )}
              {selectedTemplateId && (
                <p className="text-xs text-gray-500 mt-1">
                  {templates.find((t) => t.id === selectedTemplateId)?.description}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workflow Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (activeTab === 'template' && !selectedTemplateId)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
