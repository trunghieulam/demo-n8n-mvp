import { useEffect, useState } from 'react';
import { useCredentialStore } from '../stores/credentialStore';
import CreateCredentialModal from '../components/CredentialModal';

const CREDENTIAL_TYPES = [
  { value: 'httpBasicAuth', label: 'HTTP Basic Auth' },
  { value: 'httpBearerToken', label: 'HTTP Bearer Token' },
  { value: 'slackOAuth2Api', label: 'Slack OAuth 2.0' },
  { value: 'genericApiKey', label: 'Generic API Key' },
];

export default function Credentials() {
  const { credentials, isLoading, fetchCredentials, deleteCredential, testCredential } =
    useCredentialStore();
  const [showModal, setShowModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('');

  useEffect(() => {
    fetchCredentials(typeFilter || undefined);
  }, [typeFilter]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      await deleteCredential(id);
    }
  };

  const handleTest = async (id: string) => {
    const result = await testCredential(id);
    alert(result.message);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Credentials</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + New Credential
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by type:
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Types</option>
            {CREDENTIAL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : credentials.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No credentials found. Create your first credential.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {credentials.map((credential) => (
              <div key={credential.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{credential.name}</h3>
                    <p className="text-sm text-gray-500">{credential.type}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      credential.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {credential.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Created: {new Date(credential.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTest(credential.id)}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleDelete(credential.id)}
                    className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <CreateCredentialModal
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              fetchCredentials(typeFilter || undefined);
            }}
          />
        )}
      </div>
    </div>
  );
}
