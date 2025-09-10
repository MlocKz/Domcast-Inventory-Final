import React from 'react';
import { Notification } from '../ui/Notification';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '../app-sidebar';
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
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-gradient-card text-foreground">
        <AppSidebar
          user={user}
          role={role}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onSignOut={onSignOut}
          onRefreshProfile={onRefreshProfile}
        />
        
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border mx-2" />
            <div className="flex-1" />
          </header>
          
          <main className="flex-1 p-6">
            <div className="animate-fade-in">
              {children}
            </div>
          </main>
        </SidebarInset>

        <Notification
          notification={notification}
          setNotification={setNotification}
        />
      </div>
    </SidebarProvider>
  );
}