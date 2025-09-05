import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, ArrowLeft } from 'lucide-react';
import { Notification } from '../ui/Notification';

interface ChangeEmailPageProps {
  onBack: () => void;
}

export function ChangeEmailPage({ onBack }: ChangeEmailPageProps) {
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  React.useEffect(() => {
    // Get current user email
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentEmail(user.email || '');
      }
    };
    getCurrentUser();
  }, []);

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !password) {
      setNotification({
        show: true,
        message: 'Please fill in all fields',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
        password: password
      });

      if (error) throw error;

      setNotification({
        show: true,
        message: 'Email change request sent. Please check your new email for confirmation.',
        type: 'success'
      });
      
      // Clear form
      setNewEmail('');
      setPassword('');
    } catch (error: any) {
      console.error('Error changing email:', error);
      setNotification({
        show: true,
        message: error.message || 'Failed to change email',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Change Email</h1>
          <p className="text-muted-foreground mt-2">Update your email address</p>
        </div>
      </div>

      <div className="max-w-md">
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Email Address</h2>
          </div>

          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Current Email
              </label>
              <input
                type="email"
                value={currentEmail}
                disabled
                className="w-full px-3 py-2 border border-border rounded-lg bg-secondary/50 text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                New Email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter new email address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your current password"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required to confirm your identity
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Important:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>You'll receive a confirmation email at your new address</li>
                  <li>Click the confirmation link to complete the change</li>
                  <li>Your old email will remain active until confirmed</li>
                </ul>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Change Email'}
            </button>
          </form>
        </div>
      </div>

      <Notification
        notification={notification}
        setNotification={setNotification}
      />
    </div>
  );
}