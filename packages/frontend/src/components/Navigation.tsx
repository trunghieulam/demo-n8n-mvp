import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex gap-6">
            <Link
              to="/workflows"
              className={`px-3 py-2 rounded ${
                isActive('/workflows') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
              }`}
            >
              Workflows
            </Link>
            <Link
              to="/credentials"
              className={`px-3 py-2 rounded ${
                isActive('/credentials') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
              }`}
            >
              Credentials
            </Link>
            <Link
              to="/executions"
              className={`px-3 py-2 rounded ${
                isActive('/executions') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
              }`}
            >
              Executions
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/settings"
              className="text-gray-700 hover:text-gray-900"
            >
              {user?.firstName} {user?.lastName}
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
