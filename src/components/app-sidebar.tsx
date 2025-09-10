import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  PackageSearch as InventoryIcon,
  PackageCheck as ShipmentIcon,
  ArrowDown as IncomingIcon,
  ArrowUp as OutgoingIcon,
  Users as UsersIcon,
  User as UserIcon,
  Download as DownloadIcon,
  LogOut as LogOutIcon,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import DccaLogo from '../assets/DCCA_Logo.png';
import { User } from '../lib/supabase';

interface AppSidebarProps {
  user: User;
  role: string | null;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onSignOut: () => void;
  onRefreshProfile: () => void;
  onExportCSV?: () => void;
}

const navigationItems = [
  { id: 'inventory', label: 'Inventory', icon: InventoryIcon, roles: ['admin', 'editor', 'submitter'] },
  { id: 'log_shipment', label: 'Log Shipment', icon: ShipmentIcon, roles: ['admin', 'editor', 'submitter'] },
  { id: 'incoming', label: 'Incoming', icon: IncomingIcon, roles: ['admin', 'editor'] },
  { id: 'outgoing', label: 'Outgoing', icon: OutgoingIcon, roles: ['admin', 'editor'] },
];

const adminItems = [
  { id: 'user_management', label: 'User Management', icon: UsersIcon },
  { id: 'admin_history', label: 'Change History', icon: UserIcon },
];

export function AppSidebar({
  user,
  role,
  currentPage,
  setCurrentPage,
  onSignOut,
  onRefreshProfile,
  onExportCSV,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const filteredNavItems = navigationItems.filter(item => 
    role && item.roles.includes(role)
  );

  const handleNavigation = (pageId: string) => {
    setCurrentPage(pageId);
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={DccaLogo} alt="DomCast Logo" className="h-8 w-8 flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-bold text-lg text-primary">DomCast</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.id)}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => handleNavigation(item.id)}
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Actions Section */}
        {currentPage === 'inventory' && onExportCSV && (
          <SidebarGroup>
            <SidebarGroupLabel>Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={onExportCSV}
                    tooltip="Export CSV"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    <span>Export CSV</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-2 py-1 text-xs text-muted-foreground">
              {!isCollapsed && (
                <div>
                  <div className="font-medium text-foreground truncate">{user.email}</div>
                  <div className="capitalize">{role} account</div>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          
          <SidebarSeparator />
          
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onSignOut}
              tooltip="Sign Out"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOutIcon className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}