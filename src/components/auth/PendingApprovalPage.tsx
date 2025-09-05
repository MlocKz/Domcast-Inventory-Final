import React from 'react';
import { Clock, Mail, LogOut } from 'lucide-react';

interface PendingApprovalPageProps {
  userEmail: string;
  onSignOut: () => void;
}

export function PendingApprovalPage({ userEmail, onSignOut }: PendingApprovalPageProps) {
  return (
    <div className="min-h-screen bg-gradient-card flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-yellow-100 mb-6">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          
          <h2 className="text-3xl font-bold text-foreground">
            Account Pending Approval
          </h2>
          
          <div className="mt-6 space-y-4">
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Registered as:</span>
              </div>
              <p className="font-medium text-foreground">{userEmail}</p>
            </div>
            
            <div className="text-muted-foreground space-y-2">
              <p>
                Your account has been created successfully, but it needs to be approved 
                by an administrator before you can access the system.
              </p>
              <p>
                You will receive an email notification once your account has been approved.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-700">
                <strong>What happens next?</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>An admin will review your registration</li>
                  <li>You'll be assigned an appropriate role</li>
                  <li>You'll receive email confirmation</li>
                  <li>You can then log in and access the system</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <button
            onClick={onSignOut}
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}