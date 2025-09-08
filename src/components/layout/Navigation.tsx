import React, { useState } from 'react';
import {
  PackageSearch as InventoryIcon,
  PackageCheck as ShipmentIcon,
  ArrowDown as IncomingIcon,
  ArrowUp as OutgoingIcon,
  LogOut as LogOutIcon,
  Menu as MenuIcon,
  X as XIcon,
  User as UserIcon,
  Users as UsersIcon,
  Settings as SettingsIcon,
  Mail as MailIcon,
  Key as KeyIcon,
  ChevronDown,
  RefreshCw as RefreshIcon
} from 'lucide-react';
import DccaLogo from '../../assets/DCCA_Logo.png';
import { User } from '../../lib/supabase';

interface NavigationProps {
  user: User;
  role: string | null;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onSignOut: () => void;
  onRefreshProfile: () => void;
}

const navigationItems = [
  { id: 'inventory', label: 'Inventory', icon: InventoryIcon, roles: ['admin', 'editor', 'submitter'] },
  { id: 'log_shipment', label: 'Log Shipment', icon: ShipmentIcon, roles: ['admin', 'editor', 'submitter'] },
  { id: 'incoming', label: 'Incoming', icon: IncomingIcon, roles: ['admin', 'editor'] },
  { id: 'outgoing', label: 'Outgoing', icon: OutgoingIcon, roles: ['admin', 'editor'] },
  { id: 'user_management', label: 'User Management', icon: UsersIcon, roles: ['admin'] },
  { id: 'admin_history', label: 'Change History', icon: UserIcon, roles: ['admin'] },
];

export function Navigation({
  user,
  role,
  currentPage,
  setCurrentPage,
  onSignOut,
  onRefreshProfile
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-dropdown-container')) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNavItems = navigationItems.filter(item => 
    role && item.roles.includes(role)
  );

  return (
    <nav className="bg-card border-b border-border shadow-elegant backdrop-blur-xl bg-opacity-95 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4 animate-fade-in">
            <div className="flex items-center space-x-3">
              <img src={DccaLogo} alt="DomCast Logo" className="h-12 w-auto" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {filteredNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`
                    relative flex items-center space-x-3 px-6 py-3 rounded-xl text-sm font-semibold 
                    transition-all duration-300 min-w-0 whitespace-nowrap group animate-fade-in
                    ${isActive 
                      ? 'bg-gradient-primary text-primary-foreground shadow-glow' 
                      : 'text-muted-foreground hover:bg-gradient-accent hover:text-foreground'
                    }
                  `}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                  <span className="flex-shrink-0">{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-white rounded-full opacity-80"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="relative profile-dropdown-container">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="hidden sm:flex items-center justify-center w-10 h-10 bg-gradient-accent rounded-full backdrop-blur-sm hover:bg-gradient-primary transition-all duration-300 group"
              >
                <div className="relative">
                  <UserIcon className="h-5 w-5 text-primary group-hover:text-primary-foreground" />
                  <div className="absolute -inset-1 bg-primary opacity-20 blur rounded-full"></div>
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-elegant z-50 backdrop-blur-xl bg-opacity-95">
                  <div className="p-2">
                    <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border mb-2">
                      <p className="font-medium text-foreground">{user.email}</p>
                      <p className="text-xs capitalize">{role} account</p>
                    </div>
                    
                    <button
                      onClick={() => {
                        onRefreshProfile();
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-foreground hover:bg-gradient-accent rounded-lg transition-colors"
                    >
                      <RefreshIcon className="h-4 w-4" />
                      <span>Refresh Profile</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setCurrentPage('account_settings');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-foreground hover:bg-gradient-accent rounded-lg transition-colors"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      <span>Account Settings</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setCurrentPage('change_email');
                        setIsProfileDropdownOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-foreground hover:bg-gradient-accent rounded-lg transition-colors"
                    >
                      <MailIcon className="h-4 w-4" />
                      <span>Change Email</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setCurrentPage('change_password');
                        setIsProfileDropdownOpen(false);
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
                        setIsProfileDropdownOpen(false);
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

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden btn-ghost p-3 relative min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <div className="relative">
                {isMobileMenuOpen ? (
                  <XIcon className="h-6 w-6 transition-transform rotate-90" />
                ) : (
                  <MenuIcon className="h-6 w-6 transition-transform" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-border animate-slide-in bg-gradient-accent rounded-b-xl backdrop-blur-xl">
            <div className="space-y-2">
              {filteredNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`
                      w-full flex items-center space-x-4 px-6 py-4 rounded-xl text-base font-semibold 
                      transition-all duration-300 justify-start group animate-fade-in min-h-[56px]
                      ${isActive 
                        ? 'bg-gradient-primary text-primary-foreground shadow-glow mx-2' 
                        : 'text-muted-foreground hover:bg-gradient-primary/20 hover:text-foreground mx-2'
                      }
                    `}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Icon className="h-6 w-6 flex-shrink-0 transition-transform group-hover:scale-110" />
                    <span className="flex-shrink-0">{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <div className="bg-gradient-card rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Signed in as <span className="font-semibold text-foreground">{user.email}</span>
                </div>
                <div className="text-xs text-muted-foreground capitalize font-medium mb-4">
                  {role} access level
                </div>
                
                {/* Mobile profile actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setCurrentPage('account_settings');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-foreground hover:bg-gradient-accent rounded-lg transition-colors"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    <span>Account Settings</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      onSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <LogOutIcon className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}