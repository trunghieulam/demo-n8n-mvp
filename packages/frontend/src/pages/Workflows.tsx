import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../stores/workflowStore';
import CreateWorkflowModal from '../components/CreateWorkflowModal';

export default function Workflows() {
  const {
    workflows,
    isLoading,
    searchQuery,
    selectedTags,
    pagination,
    fetchWorkflows,
    createWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    activateWorkflow,
    deactivateWorkflow,
    setSearchQuery,
  } = useWorkflowStore();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkflows({ search: searchQuery, tag: selectedTags[0] });
  }, [searchQuery, selectedTags]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      await deleteWorkflow(id);
    }
  };

  const handleDuplicate = async (id: string, name: string) => {
    const newName = prompt('Enter new workflow name:', `Copy of ${name}`);
    if (newName) {
      await duplicateWorkflow(id, newName);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Workflows</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + New Workflow
          </button>
        </div>

        <div className="mb-4 flex gap-4">
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No workflows found. Create your first workflow.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{workflow.name}</h3>
                      {workflow.description && (
                        <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        workflow.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {workflow.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {workflow.tags && workflow.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {workflow.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 mb-4">
                    Nodes: {workflow.nodes.length} | Updated:{' '}
                    {new Date(workflow.updatedAt).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => navigate(`/workflows/${workflow.id}`)}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    {workflow.isActive ? (
                      <button
                        onClick={() => deactivateWorkflow(workflow.id)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => activateWorkflow(workflow.id)}
                        className="px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicate(workflow.id, workflow.name)}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDelete(workflow.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pagination.total > pagination.limit && (
              <div className="flex justify-center gap-2">
                <button
                  disabled={pagination.offset === 0}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                  onClick={() => fetchWorkflows({ offset: pagination.offset - pagination.limit })}
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
                  {Math.ceil(pagination.total / pagination.limit)}
                </span>
                <button
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                  onClick={() => fetchWorkflows({ offset: pagination.offset + pagination.limit })}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {showModal && (
          <CreateWorkflowModal
            onClose={() => setShowModal(false)}
            onSuccess={(workflow) => {
              setShowModal(false);
              navigate(`/workflows/${workflow.id}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
