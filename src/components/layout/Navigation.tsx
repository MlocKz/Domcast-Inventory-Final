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
  Users as UsersIcon
} from 'lucide-react';
import DccaLogo from '../../assets/DCCA_Logo.png';
import { User } from '../../lib/supabase';

interface NavigationProps {
  user: User;
  role: string | null;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onSignOut: () => void;
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
  onSignOut
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <div className="hidden sm:flex items-center space-x-4 bg-gradient-accent rounded-xl p-3 backdrop-blur-sm">
              <div className="flex items-center space-x-3 text-sm">
                <div className="relative">
                  <UserIcon className="h-5 w-5 text-primary" />
                  <div className="absolute -inset-1 bg-primary opacity-20 blur rounded-full"></div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize font-medium">{role} access</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={onSignOut}
              className="btn-outline px-4 py-2 text-sm font-semibold group"
            >
              <LogOutIcon className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden btn-ghost p-3 relative"
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
          <div className="md:hidden py-6 border-t border-border animate-slide-in bg-gradient-accent rounded-b-xl">
            <div className="space-y-3">
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
                      w-full flex items-center space-x-4 px-6 py-4 rounded-xl text-sm font-semibold 
                      transition-all duration-300 justify-start group animate-fade-in
                      ${isActive 
                        ? 'bg-gradient-primary text-primary-foreground shadow-glow' 
                        : 'text-muted-foreground hover:bg-gradient-accent hover:text-foreground'
                      }
                    `}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                    <span className="flex-shrink-0">{item.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <div className="bg-gradient-card rounded-xl p-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Signed in as <span className="font-semibold text-foreground">{user.email}</span>
                </div>
                <div className="text-xs text-muted-foreground capitalize font-medium">
                  {role} access level
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}