import { useState } from 'react';
import { useCredentialStore } from '../stores/credentialStore';

const CREDENTIAL_TYPES = [
  { value: 'httpBasicAuth', label: 'HTTP Basic Auth', fields: ['username', 'password'] },
  { value: 'httpBearerToken', label: 'HTTP Bearer Token', fields: ['token'] },
  { value: 'slackOAuth2Api', label: 'Slack OAuth 2.0', fields: ['token'] },
  { value: 'genericApiKey', label: 'Generic API Key', fields: ['apiKey'] },
];

interface CredentialModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCredentialModal({ onClose, onSuccess }: CredentialModalProps) {
  const { createCredential } = useCredentialStore();
  const [name, setName] = useState('');
  const [type, setType] = useState('httpBasicAuth');
  const [data, setData] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedType = CREDENTIAL_TYPES.find((t) => t.value === type);

  const handleFieldChange = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await createCredential(name, type, data);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create credential');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Create Credential</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credential Name
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
              Credential Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setData({});
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {CREDENTIAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {selectedType && (
            <div className="space-y-3">
              {selectedType.fields.map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {field === 'apiKey' ? 'API Key' : field}
                  </label>
                  <input
                    type={field === 'password' ? 'password' : 'text'}
                    value={data[field] || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              ))}
            </div>
          )}

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
              disabled={isLoading}
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
