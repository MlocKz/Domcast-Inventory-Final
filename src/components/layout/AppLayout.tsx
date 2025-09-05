import React from 'react';
import { Navigation } from './Navigation';
import { Notification } from '../ui/Notification';
import { User } from '../../lib/supabase';

interface AppLayoutProps {
  user: User;
  role: string | null;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onSignOut: () => void;
  onRefreshProfile: () => void;
  notification: { show: boolean; message: string; type: string };
  setNotification: (notification: { show: boolean; message: string; type: string }) => void;
  children: React.ReactNode;
}

export function AppLayout({
  user,
  role,
  currentPage,
  setCurrentPage,
  onSignOut,
  onRefreshProfile,
  notification,
  setNotification,
  children
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-card text-foreground">
      <Navigation
        user={user}
        role={role}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onSignOut={onSignOut}
        onRefreshProfile={onRefreshProfile}
      />
      
      <main className="container mx-auto px-6 py-12">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>

      <Notification
        notification={notification}
        setNotification={setNotification}
      />
    </div>
  );
}