import { faEdit, faSpinner, faUserPlus, faUserTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/common/ConfirmModal';
import RoleCard from '../../components/users/RoleCard';
import UserModal from '../../components/users/UserModal';
import { tenantApi } from '../../services/tenantApi';
import { usersApi, type ApiUser } from '../../services/usersApi';
import type { User, UserFormData } from '../../types/users';

// Convert API user to frontend format
const convertApiUser = (apiUser: ApiUser): User => ({
  id: apiUser.id,
  name: apiUser.full_name,
  email: apiUser.email,
  role: apiUser.role.toLowerCase() as User['role'],
  status: apiUser.is_active ? 'active' : 'inactive', 
  lastLogin: new Date(apiUser.created_at).toLocaleDateString(),
  initials: apiUser.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase(),
  tenant_id: apiUser.tenant_id,
});

// Permission checks based on database roles
const canManageUsers = (role: string) => ['owner', 'admin'].includes(role.toLowerCase());

const canEditUser = (currentRole: string, targetRole: string, isSelf: boolean) => {
  // Can always edit yourself
  if (isSelf) return true;
  
  // Only OWNER and ADMIN can edit others
  if (!canManageUsers(currentRole)) return false;
  
  // OWNER can edit ADMIN, EDITOR, VIEWER (not other OWNERs)
  if (currentRole.toLowerCase() === 'owner') {
    return targetRole.toLowerCase() !== 'owner';
  }
  
  // ADMIN can only edit EDITOR and VIEWER (not OWNER or other ADMINs)
  if (currentRole.toLowerCase() === 'admin') {
    return targetRole.toLowerCase() !== 'owner' && targetRole.toLowerCase() !== 'admin';
  }
  
  return false;
};

const RestaurantUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Load users on component mount (normal flow)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check authentication
        const token = localStorage.getItem('access_token');
        const isAuth = localStorage.getItem('isAuthenticated') === 'true';
        
        if (!token || !isAuth) {
          setError('Not authenticated. Please login to view users.');
          setLoading(false);
          return;
        }
        
        // Get current user info first
        const currentUserInfo = await usersApi.getCurrentUser();
        const currentUserConverted = convertApiUser(currentUserInfo);
        setCurrentUser(currentUserConverted);
        
        // Sync tenant context from backend before loading users
        try {
          const tenantResponse = await tenantApi.getCurrentTenant();
          const tenantData = tenantResponse.data;
          const currentTenantCode = localStorage.getItem('tenant_code');

          if (currentTenantCode !== tenantData.code) {
            localStorage.setItem('tenant_code', tenantData.code);
          }

          localStorage.setItem('tenant_id', tenantData.id.toString());
          localStorage.setItem('tenant_name', tenantData.name || tenantData.code);
        } catch (error) {
          console.error('Error syncing tenant data:', error);
        }
        
        // Check permissions
        if (!canManageUsers(currentUserConverted.role)) {
          setError(`Access denied. Your role (${currentUserConverted.role.toUpperCase()}) cannot manage users. Only OWNER and ADMIN can view users.`);
          setLoading(false);
          return;
        }
        
        // Load users
        const apiUsers = await usersApi.getUsers();
        
        const frontendUsers = apiUsers.map(convertApiUser);
        setUsers(frontendUsers);
        
      } catch (err: any) {
        console.error('❌ Failed to load users - Full Error:', err);
        console.error('❌ Error details:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message,
          config: {
            url: err.config?.url,
            headers: err.config?.headers
          }
        });
        
        if (err.response?.status === 403) {
          setError('Access denied. You need OWNER or ADMIN privileges to view users.');
        } else if (err.response?.status === 401) {
          setError('Authentication failed. Please login again.');
        } else {
          setError(`Failed to load users: ${err.response?.data?.detail || err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Derived counts
  const counts = useMemo(() => {
    const map = { owner: 0, admin: 0, editor: 0, viewer: 0 } as Record<string, number>;
    users.forEach(u => { map[u.role] = (map[u.role] || 0) + 1; });
    return map;
  }, [users]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter(u => {
      const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus = !statusFilter || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const openAddModal = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEditModal = (id: number) => {
    const u = users.find(x => x.id === id) ?? null;
    setEditingUser(u);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to remove this user? This action cannot be undone.',
      confirmText: 'Delete User',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await usersApi.deleteUser(id);
          setUsers(prev => prev.filter(u => u.id !== id));
          toast.success('User deleted successfully!');
        } catch (err) {
          console.error('Failed to delete user:', err);
          toast.error('Failed to delete user. Please try again.');
        }
      },
    });
  };

  const handleSave = async (data: UserFormData) => {
    try {
      if (data.id) {
        // Update existing user
        const updateData = {
          email: data.email,
          full_name: data.name,
          role: data.role?.toUpperCase() as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER',
          is_active: data.status === 'active'
        };
        
        const updatedApiUser = await usersApi.updateUser(data.id, updateData);
        const updatedUser = convertApiUser(updatedApiUser);
        
        setUsers(prev => prev.map(u => u.id === data.id ? updatedUser : u));
        
        toast.success('User updated successfully!');
      } else {
        // Create new user - password is required
        if (!data.password || data.password.trim().length < 8) {
          toast.error('Password is required and must be at least 8 characters long.');
          return;
        }
        
        const userPassword = data.password.trim();
        const tenantId = localStorage.getItem('tenant_id');
        
        if (!tenantId) {
          toast.error('No tenant context found. Please refresh and try again.');
          return;
        }
        
        const createData = {
          email: data.email,
          password: userPassword,
          full_name: data.name,
          role: (data.role?.toUpperCase() || 'VIEWER') as 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER',
          is_active: data.status === 'active',
          tenant_id: parseInt(tenantId),
        };
        
        const newApiUser = await usersApi.createUser(createData);
        const newUser = convertApiUser(newApiUser);
        
        setUsers(prev => [newUser, ...prev]);
        
        toast.success('User created successfully!');
      }
      
      setModalOpen(false);
    } catch (err: any) {
      console.error('❌ Failed to save user:', err);
      console.error('❌ Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message
      });
      
      let errorMessage = 'Failed to save user. Please try again.';
      
      if (err.response?.status === 403) {
        errorMessage = 'Access denied. You need OWNER or ADMIN privileges to create users.';
      } else if (err.response?.status === 422) {
        errorMessage = `Validation error: ${err.response?.data?.detail || 'Invalid data provided'}`;
      } else if (err.response?.status === 409) {
        errorMessage = 'A user with this email already exists.';
      } else if (err.response?.data?.detail) {
        errorMessage = `Error: ${err.response.data.detail}`;
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage users and permissions for your amusement park
            {currentUser && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                Logged in as: {currentUser.name} ({currentUser.role.toUpperCase()}) 
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50" 
            onClick={openAddModal}
            disabled={loading || !currentUser || !canManageUsers(currentUser.role)}
          >
            <FontAwesomeIcon icon={faUserPlus} />
            Add User
          </button>
        </div>
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 mb-6">
        <RoleCard title="Owner" count={counts.owner} description="Full system access and tenant management" iconClass="fas fa-crown" iconBg="linear-gradient(135deg, #f59e0b, #d97706)" />
        <RoleCard title="Admin" count={counts.admin} description="Full amusement park management and user control" iconClass="fas fa-user-shield" iconBg="linear-gradient(135deg, #3b82f6, #1d4ed8)" />
        <RoleCard title="Editor" count={counts.editor} description="Can create and edit content, features, and posts" iconClass="fas fa-user-edit" iconBg="linear-gradient(135deg, #10b981, #059669)" />
        <RoleCard title="Viewer" count={counts.viewer} description="Read-only access to view content and analytics" iconClass="fas fa-user" iconBg="linear-gradient(135deg, #8b5cf6, #7c3aed)" />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>

        <select className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-red-500 text-lg">⚠️</div>
            <div>
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden bg-white border border-slate-200 rounded-xl">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-800">Team Members</h3>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-600 mb-2" />
            <p className="text-slate-600">Loading users...</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-slate-600 uppercase">User</th>
                <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-slate-600 uppercase">Role</th>
                <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-slate-600 uppercase">Status</th>
                <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-slate-600 uppercase">Last Login</th>
                <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white font-semibold text-sm flex items-center justify-center">
                          {user.initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {user.name}
                            {currentUser && currentUser.id === user.id && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">You</span>
                            )}
                          </span>
                          <span className="text-xs text-slate-500">{user.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${'owner' === user.role ? 'bg-amber-100 text-amber-800' : 'admin' === user.role ? 'bg-blue-100 text-blue-800' : 'editor' === user.role ? 'bg-green-100 text-green-800' : 'bg-violet-100 text-violet-800'}`}>{user.role}</span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {user.lastLogin}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* Edit button */}
                        {currentUser && canEditUser(currentUser.role, user.role, currentUser.id === user.id) && (
                          <button 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200" 
                            onClick={() => openEditModal(user.id)}
                          >
                            <FontAwesomeIcon icon={faEdit} /> 
                            Edit
                          </button>
                        )}
                        
                        {/* Remove button - OWNER can delete ADMIN/EDITOR/VIEWER, ADMIN can only delete EDITOR/VIEWER */}
                        {currentUser && 
                         currentUser.id !== user.id && (
                           (currentUser.role === 'owner' && user.role !== 'owner') ||
                           (currentUser.role === 'admin' && user.role !== 'owner' && user.role !== 'admin')
                         ) && (
                          <button 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200" 
                            onClick={() => handleDelete(user.id)}
                          >
                            <FontAwesomeIcon icon={faUserTimes} /> Remove
                          </button>
                        )}
                        
                        {/* Protection indicators */}
                        {user.role === 'owner' && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-md">
                            👑 Protected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={modalOpen}
        initialData={editingUser}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmVariant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

export default RestaurantUsers;


