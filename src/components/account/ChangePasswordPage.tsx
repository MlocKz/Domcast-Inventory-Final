import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Key, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Notification } from '../ui/Notification';

interface ChangePasswordPageProps {
  onBack: () => void;
}

export function ChangePasswordPage({ onBack }: ChangePasswordPageProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
      errors: [
        ...(password.length < minLength ? ['At least 8 characters'] : []),
        ...(!hasUpperCase ? ['One uppercase letter'] : []),
        ...(!hasLowerCase ? ['One lowercase letter'] : []),
        ...(!hasNumbers ? ['One number'] : [])
      ]
    };
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setNotification({
        show: true,
        message: 'Please fill in all fields',
        type: 'error'
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotification({
        show: true,
        message: 'New passwords do not match',
        type: 'error'
      });
      return;
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setNotification({
        show: true,
        message: `Password requirements not met: ${validation.errors.join(', ')}`,
        type: 'error'
      });
      return;
    }

    setLoading(true);
    
    try {
      // First, verify current password by signing in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User not found');
      }

      // Try to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNotification({
        show: true,
        message: 'Password changed successfully',
        type: 'success'
      });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      setNotification({
        show: true,
        message: error.message || 'Failed to change password',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(newPassword);

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
          <h1 className="text-3xl font-bold text-foreground">Change Password</h1>
          <p className="text-muted-foreground mt-2">Update your account password</p>
        </div>
      </div>

      <div className="max-w-md">
        <div className="bg-card rounded-lg border p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Password</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              {newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-muted-foreground">Password requirements:</div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {[
                      { text: '8+ characters', met: newPassword.length >= 8 },
                      { text: 'Uppercase', met: /[A-Z]/.test(newPassword) },
                      { text: 'Lowercase', met: /[a-z]/.test(newPassword) },
                      { text: 'Number', met: /\d/.test(newPassword) }
                    ].map((req, index) => (
                      <div key={index} className={`flex items-center space-x-1 ${req.met ? 'text-green-600' : 'text-red-600'}`}>
                        <span>{req.met ? '✓' : '✗'}</span>
                        <span>{req.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <div className="mt-1 text-xs text-red-600">Passwords do not match</div>
              )}
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Security tip:</strong>
                <p className="mt-1">Choose a strong password that you haven't used elsewhere. Consider using a password manager.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !passwordValidation.isValid || newPassword !== confirmPassword}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Change Password'}
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