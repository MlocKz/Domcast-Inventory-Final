import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '../ui/Notification';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export function UserManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setNotification({
        show: true,
        message: 'Failed to fetch users',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: string, role?: string) => {
    try {
      const updates: any = { status };
      if (role) updates.role = role;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      setNotification({
        show: true,
        message: `User ${status} successfully`,
        type: 'success'
      });
      
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      setNotification({
        show: true,
        message: 'Failed to update user status',
        type: 'error'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (role) {
      case 'admin':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'editor':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'submitter':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-2">Approve or reject user registration requests</p>
      </div>

      <div className="bg-card rounded-lg border">
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">Registered</th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="py-3 px-4 text-foreground">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className={getRoleBadge(user.role)}>{user.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={getStatusBadge(user.status)}>{user.status}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {user.status === 'pending' && (
                        <div className="flex gap-2">
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                updateUserStatus(user.id, 'approved', e.target.value);
                              }
                            }}
                            className="px-3 py-1 text-sm border border-border rounded bg-background text-foreground"
                            defaultValue=""
                          >
                            <option value="">Approve as...</option>
                            <option value="submitter">Submitter</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => updateUserStatus(user.id, 'rejected')}
                            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {user.status === 'approved' && (
                        <div className="flex gap-2">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserStatus(user.id, 'approved', e.target.value)}
                            className="px-3 py-1 text-sm border border-border rounded bg-background text-foreground"
                          >
                            <option value="submitter">Submitter</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => updateUserStatus(user.id, 'rejected')}
                            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                          >
                            Suspend
                          </button>
                        </div>
                      )}
                      {user.status === 'rejected' && (
                        <button
                          onClick={() => updateUserStatus(user.id, 'approved', user.role)}
                          className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </div>
      </div>

      <Notification
        notification={notification}
        setNotification={setNotification}
      />
    </div>
  );
}