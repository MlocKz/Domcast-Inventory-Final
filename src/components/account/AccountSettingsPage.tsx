import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Key, Shield } from 'lucide-react';
import { Notification } from '../ui/Notification';

interface UserProfile {
  id: string;
  email: string;
  status: string;
  created_at: string;
  display_name: string | null;
}

interface UserWithRole extends UserProfile {
  role: string;
}

export function AccountSettingsPage() {
  const [profile, setProfile] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) throw roleError;

      setProfile({
        ...profileData,
        role: roleData?.role || 'submitter'
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setNotification({
        show: true,
        message: 'Failed to load profile',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
    }
  };

  const getRoleBadge = (role: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (role) {
      case 'admin':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400`;
      case 'editor':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400`;
      case 'submitter':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account information and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Profile Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <p className="text-foreground font-medium">{profile.email}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <div className="mt-1">
                <span className={getRoleBadge(profile.role)}>{profile.role}</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Account Status</label>
              <div className="mt-1">
                <span className={getStatusBadge(profile.status)}>{profile.status}</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Member Since</label>
              <p className="text-foreground">
                {new Date(profile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Security</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email Address</p>
                  <p className="text-xs text-muted-foreground">Update your email address</p>
                </div>
              </div>
              <button className="text-xs text-primary hover:text-primary/80 font-medium">
                Change
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <Key className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Password</p>
                  <p className="text-xs text-muted-foreground">Update your password</p>
                </div>
              </div>
              <button className="text-xs text-primary hover:text-primary/80 font-medium">
                Change
              </button>
            </div>
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