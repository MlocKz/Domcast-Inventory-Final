import React, { useState } from 'react';
import {
  PackageSearch as InventoryIcon,
  PackageCheck as ShipmentIcon,
  ArrowDown as IncomingIcon,
  ArrowUp as OutgoingIcon,
  FileCheck2 as ApprovalIcon,
  LogOut as LogOutIcon,
  Menu as MenuIcon,
  X as XIcon,
  User as UserIcon
} from 'lucide-react';
import DccaLogo from '../../assets/DCCA_Logo.png';
import { User } from '../../lib/supabase';

interface NavigationProps {
  user: User;
  role: string | null;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onSignOut: () => void;
  shipmentRequestsCount: number;
}

const navigationItems = [
  { id: 'inventory', label: 'Inventory', icon: InventoryIcon, roles: ['admin', 'editor'] },
  { id: 'log_shipment', label: 'Log Shipment', icon: ShipmentIcon, roles: ['admin', 'editor', 'submitter'] },
  { id: 'incoming', label: 'Incoming', icon: IncomingIcon, roles: ['admin', 'editor'] },
  { id: 'outgoing', label: 'Outgoing', icon: OutgoingIcon, roles: ['admin', 'editor'] },
  { id: 'approval', label: 'Approval', icon: ApprovalIcon, roles: ['admin'] },
];

export function Navigation({
  user,
  role,
  currentPage,
  setCurrentPage,
  onSignOut,
  shipmentRequestsCount
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredNavItems = navigationItems.filter(item => 
    role && item.roles.includes(role)
  );

  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <img src={DccaLogo} alt="DomCast Logo" className="h-10 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-foreground">Inventory Management</h1>
              <p className="text-sm text-muted-foreground">DomCast Corporation</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium 
                    transition-all duration-200 min-w-0 whitespace-nowrap
                    ${isActive 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-shrink-0">{item.label}</span>
                  {item.id === 'approval' && shipmentRequestsCount > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5 ml-1 animate-pulse flex-shrink-0">
                      {shipmentRequestsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <div className="text-right">
                  <p className="font-medium text-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{role} access</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={onSignOut}
              className="btn-outline px-3 py-2 text-sm"
            >
              <LogOutIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden btn-ghost p-2"
            >
              {isMobileMenuOpen ? (
                <XIcon className="h-5 w-5" />
              ) : (
                <MenuIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-in">
            <div className="space-y-2">
              {filteredNavItems.map((item) => {
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
                      w-full flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium 
                      transition-all duration-200 justify-start
                      ${isActive 
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-shrink-0">{item.label}</span>
                    {item.id === 'approval' && shipmentRequestsCount > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5 ml-auto flex-shrink-0">
                        {shipmentRequestsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground mb-2">
                Signed in as <span className="font-medium text-foreground">{user.email}</span>
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {role} access level
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}