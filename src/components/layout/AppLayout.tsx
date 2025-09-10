import React, { useState } from 'react';
import { Notification } from '../ui/Notification';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '../app-sidebar';
import { User } from '../../lib/supabase';
import DccaLogo from '../../assets/DCCA_Logo.png';
import {
  User as UserIcon,
  Settings as SettingsIcon,
  Mail as MailIcon,
  Key as KeyIcon,
  LogOut as LogOutIcon,
  RefreshCw as RefreshIcon,
  ChevronDown,
} from 'lucide-react';

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

interface ProfileDropdownProps {
  user: User;
  role: string | null;
  onRefreshProfile: () => void;
  onSignOut: () => void;
  setCurrentPage: (page: string) => void;
}

function ProfileDropdown({ user, role, onRefreshProfile, onSignOut, setCurrentPage }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-dropdown-container')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative profile-dropdown-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 bg-gradient-accent rounded-full backdrop-blur-sm hover:bg-gradient-primary transition-all duration-300 group"
      >
        <div className="relative">
          <UserIcon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
          <div className="absolute -inset-1 bg-primary opacity-20 blur rounded-full"></div>
        </div>
      </button>

      {/* Profile Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-elegant z-50 backdrop-blur-xl bg-opacity-95">
          <div className="p-2">
            <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border mb-2">
              <p className="font-medium text-foreground">{user.email}</p>
              <p className="text-xs capitalize">{role} account</p>
            </div>
            
            <button
              onClick={() => {
                onRefreshProfile();
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-foreground hover:bg-gradient-accent rounded-lg transition-colors"
            >
              <RefreshIcon className="h-4 w-4" />
              <span>Refresh Profile</span>
            </button>
            
            <button
              onClick={() => {
                setCurrentPage('account_settings');
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-foreground hover:bg-gradient-accent rounded-lg transition-colors"
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Account Settings</span>
            </button>
            
            <button
              onClick={() => {
                setCurrentPage('change_email');
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-foreground hover:bg-gradient-accent rounded-lg transition-colors"
            >
              <MailIcon className="h-4 w-4" />
              <span>Change Email</span>
            </button>
            
            <button
              onClick={() => {
                setCurrentPage('change_password');
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-foreground hover:bg-gradient-accent rounded-lg transition-colors"
            >
              <KeyIcon className="h-4 w-4" />
              <span>Change Password</span>
            </button>
            
            <div className="border-t border-border my-2"></div>
            
            <button
              onClick={() => {
                onSignOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOutIcon className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
            {/* Mobile: Logo in center for iOS, sidebar trigger on left */}
            <div className="flex items-center gap-2 md:hidden w-full">
              <SidebarTrigger className="-ml-1 flex-shrink-0" />
              <div className="flex-1 flex justify-center">
                <div className="flex items-center gap-2">
                  <img src={DccaLogo} alt="DomCast Logo" className="h-8 w-8" />
                  <span className="font-bold text-lg text-primary">DomCast</span>
                </div>
              </div>
              <ProfileDropdown 
                user={user} 
                role={role} 
                onRefreshProfile={onRefreshProfile} 
                onSignOut={onSignOut}
                setCurrentPage={setCurrentPage}
              />
            </div>
            
            {/* Desktop: Sidebar trigger on left, profile on right */}
            <div className="hidden md:flex items-center w-full">
              <SidebarTrigger className="-ml-1" />
              <div className="h-4 w-px bg-border mx-2" />
              <div className="flex-1" />
              <ProfileDropdown 
                user={user} 
                role={role} 
                onRefreshProfile={onRefreshProfile} 
                onSignOut={onSignOut}
                setCurrentPage={setCurrentPage}
              />
            </div>
          </header>
          
          <main className="flex-1 p-4 md:p-6 safe-area-inset">
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