import { lazy } from 'react';

// Lazy load heavy components for better performance
export const LazyInventorySearchPage = lazy(() => 
  import('../inventory/InventorySearchPage').then(module => ({ default: module.InventorySearchPage }))
);

export const LazyAdminHistoryPage = lazy(() => 
  import('../admin/AdminHistoryPage').then(module => ({ default: module.AdminHistoryPage }))
);

export const LazyUserManagementPage = lazy(() => 
  import('../admin/UserManagementPage').then(module => ({ default: module.UserManagementPage }))
);

export const LazyAccountSettingsPage = lazy(() => 
  import('../account/AccountSettingsPage').then(module => ({ default: module.AccountSettingsPage }))
);

export const LazyChangeEmailPage = lazy(() => 
  import('../account/ChangeEmailPage').then(module => ({ default: module.ChangeEmailPage }))
);

export const LazyChangePasswordPage = lazy(() => 
  import('../account/ChangePasswordPage').then(module => ({ default: module.ChangePasswordPage }))
);

export const LazyPackingSlipScanner = lazy(() => 
  import('../shipment/PackingSlipScanner').then(module => ({ default: module.PackingSlipScanner }))
);