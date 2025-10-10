import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
import type { User, InventoryItem, Shipment } from './lib/supabase';
import {
  PackageSearch as InventoryIcon,
  PackageCheck as ShipmentIcon,
  History as HistoryIcon,
  ArrowDown as IncomingIcon,
  ArrowUp as OutgoingIcon,
  Trash2 as TrashIcon,
  ChevronDown,
  AlertTriangle,
  LogOut as LogOutIcon,
  FilePenLine as EditIcon,
  BarChart2 as AnalyticsIcon,
  Search as SearchIcon,
  X as XIcon,
  Menu as MenuIcon,
  Camera as CameraIcon,
  PlusCircle as PlusCircleIcon,
  Download as DownloadIcon,
  FileCheck2,
  Package as PackageIcon,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DccaLogo from './assets/DCCA_Logo.png';
import { AppLayout } from './components/layout/AppLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { PendingApprovalPage } from './components/auth/PendingApprovalPage';
import { InventorySearchPage } from './components/inventory/InventorySearchPage';
import { AdminHistoryPage } from './components/admin/AdminHistoryPage';
import { UserManagementPage } from './components/admin/UserManagementPage';
import { AccountSettingsPage } from './components/account/AccountSettingsPage';
import { ChangeEmailPage } from './components/account/ChangeEmailPage';
import { ChangePasswordPage } from './components/account/ChangePasswordPage';
import { PackingSlipScanner } from './components/shipment/PackingSlipScanner';

const supabase = _supabase as any;

// Main App Component
export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(false);
    
    // Move state from MainAppView to main App component
    const [currentPage, setCurrentPage] = useState('inventory');
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        // Set initial page based on role
        if (userRole === 'submitter') {
            setCurrentPage('inventory');
        } else {
            setCurrentPage('inventory');
        }
    }, [userRole]);

    useEffect(() => {
        // Listen for auth changes first to avoid missing events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Only synchronous updates here to avoid deadlocks
            setUser(session?.user ?? null);
            if (session?.user) {
                setTimeout(() => {
                    fetchUserProfile(session.user!.id);
                }, 0);
            } else {
                setUserRole(null);
                setIsLoading(false);
            }
        });

        // Then check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load data when user changes
    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const refreshProfile = async () => {
        if (user) {
            await fetchUserProfile(user.id);
            setNotification({
                show: true,
                message: 'Profile refreshed successfully',
                type: 'success'
            });
        }
    };

    const fetchUserProfile = async (userId: string) => {
        try {
            // Fetch profile and role separately
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (profileError) {
                console.error('Error fetching user profile:', profileError);
                setUser({ id: userId, email: '', status: 'pending' } as any);
                setUserRole('submitter');
                setIsLoading(false);
                return;
            }

            // Fetch user role from user_roles table
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .maybeSingle();

            if (roleError) {
                console.error('Error fetching user role:', roleError);
            }

            if (profileData) {
                setUser(profileData as any);
                setUserRole(roleData?.role ?? 'submitter');
            } else {
                console.log('Profile not found, using default');
                setUser({ id: userId, email: '', status: 'pending' } as any);
                setUserRole('submitter');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setUser({ id: userId, email: '', status: 'pending' } as any);
            setUserRole('submitter');
        } finally {
            setIsLoading(false);
        }
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load inventory
            const { data: inventoryData, error: inventoryError } = await supabase
                .from('inventory')
                .select('*')
                .order('sku');

            if (inventoryError) throw inventoryError;
            setInventory(inventoryData || []);

            // Load shipments
            const { data: shipmentsData, error: shipmentsError } = await supabase
                .from('shipments')
                .select('*')
                .order('shipment_id', { ascending: false })
                .order('id', { ascending: false });

            if (shipmentsError) throw shipmentsError;
            setShipments(shipmentsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
            setNotification({ show: true, message: 'Error loading data', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportCSV = async () => {
        const headers = [
            'SKU',
            'Name',
            'Category',
            'Quantity on Hand',
            'Minimum Quantity',
            'Unit of Measure',
            'Location',
            'Unit Cost',
            'Sell Price',
            'External ID',
            'Notes',
            'Status',
            'Created At',
            'Updated At'
        ];

        const csvContent = [
            headers.join(','),
            ...inventory.map(item => {
                const status = item.qty_on_hand === 0 ? 'Out of Stock' :
                              item.qty_on_hand <= 10 ? 'Low Stock' : 'In Stock';
                
                return [
                    `"${item.sku}"`,
                    `"${item.name || ''}"`,
                    `"${item.category || ''}"`,
                    item.qty_on_hand,
                    0, // min_qty placeholder
                    `"${item.uom || ''}"`,
                    `"${item.location || ''}"`,
                    item.unit_cost || '',
                    item.sell_price || '',
                    `"${item.external_id || ''}"`,
                    `"${(item.notes || '').replace(/"/g, '""')}"`,
                    `"${status}"`,
                    `"${new Date(item.created_at).toLocaleString()}"`,
                    `"${new Date(item.updated_at).toLocaleString()}"`
                ].join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleLogShipment = async (shipmentDetails: any) => {
        const { items, shipmentId, type } = shipmentDetails;
        
        // All users now directly process shipments
        try {
            const { error } = await supabase
                .from('shipments')
                .insert({
                    shipment_id: shipmentId,
                    type,
                    items,
                    user_id: user!.id
                });

            if (error) throw error;

            // Update inventory quantities
            for (const item of items) {
                const inventoryItem = inventory.find((i: InventoryItem) => i.sku === item.itemNo);
                if (inventoryItem) {
                    const newQuantity = inventoryItem.qty_on_hand + (type === 'incoming' ? item.quantity : -item.quantity);
                    await supabase
                        .from('inventory')
                        .update({ qty_on_hand: newQuantity })
                        .eq('sku', inventoryItem.sku);
                }
            }

            setNotification({ show: true, message: 'Shipment logged successfully.', type: 'success' });
            loadData();
        } catch (error: any) {
            console.error("Transaction failed: ", error);
            setNotification({ show: true, message: `Failed to log shipment: ${error.message}`, type: 'error' });
        }
    };

    // Update shipment function
    const updateShipment = async (updatedShipment: Shipment) => {
        try {
            const { error } = await supabase
                .from('shipments')
                .update({
                    shipment_id: updatedShipment.shipment_id,
                    items: updatedShipment.items
                })
                .eq('id', updatedShipment.id);

            if (error) throw error;
            
            // Reload shipments
            loadData();
            setNotification({ show: true, message: 'Shipment updated successfully', type: 'success' });
        } catch (error: any) {
            console.error('Error updating shipment:', error);
            setNotification({ show: true, message: `Failed to update shipment: ${error.message}`, type: 'error' });
        }
    };

    // Delete shipment function
    const deleteShipment = async (shipmentId: string) => {
        try {
            const { error } = await supabase
                .from('shipments')
                .delete()
                .eq('id', shipmentId);

            if (error) throw error;
            
            // Reload shipments
            loadData();
            setNotification({ show: true, message: 'Shipment deleted successfully', type: 'success' });
        } catch (error: any) {
            console.error('Error deleting shipment:', error);
            setNotification({ show: true, message: `Failed to delete shipment: ${error.message}`, type: 'error' });
        }
    };

    const incomingShipments = shipments.filter(s => s.type === 'incoming');
    const outgoingShipments = shipments
        .filter(s => s.type === 'outgoing')
        .sort((a, b) => {
            const aIsNumeric = /^\d+$/.test(a.shipment_id);
            const bIsNumeric = /^\d+$/.test(b.shipment_id);
            
            // If both are numeric, sort by number (descending)
            if (aIsNumeric && bIsNumeric) {
                return parseInt(b.shipment_id) - parseInt(a.shipment_id);
            }
            
            // If only one is numeric, numeric comes first
            if (aIsNumeric) return -1;
            if (bIsNumeric) return 1;
            
            // If both are letters, sort alphabetically
            return a.shipment_id.localeCompare(b.shipment_id);
        });

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (authError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center p-8 border border-border rounded-lg bg-card shadow-lg">
                    <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
                    <p>The application could not authenticate with Supabase.</p>
                    <p>Please check your configuration.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen bg-background"><p className="text-muted-foreground animate-pulse text-lg">Loading Application...</p></div>;
    }

    if (!user) {
        return <LoginScreen />;
    }

    // Check if user is pending approval
    if (user.status === 'pending') {
        return <PendingApprovalPage userEmail={user.email} onSignOut={handleSignOut} />;
    }

    // Check if user is rejected
    if (user.status === 'rejected') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="text-center p-8 border border-border rounded-lg bg-card shadow-lg">
                    <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                    <p className="mb-4">Your account has been suspended.</p>
                    <button
                        onClick={handleSignOut}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <AppLayout
            user={user}
            role={userRole}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onSignOut={handleSignOut}
            onRefreshProfile={refreshProfile}
            onExportCSV={currentPage === 'inventory' ? handleExportCSV : undefined}
            notification={notification}
            setNotification={setNotification}
        >
            {currentPage === 'inventory' && <InventorySearchPage />}
            {currentPage === 'log_shipment' && <LogShipmentPage onLogShipment={handleLogShipment} inventory={inventory} role={userRole} />}
            {currentPage === 'incoming' && <ShipmentHistoryPage shipments={incomingShipments} title="Incoming Shipments" onUpdateShipment={updateShipment} onDeleteShipment={deleteShipment} />}
            {currentPage === 'outgoing' && <ShipmentHistoryPage shipments={outgoingShipments} title="Outgoing Shipments" onUpdateShipment={updateShipment} onDeleteShipment={deleteShipment} />}
            {currentPage === 'user_management' && <UserManagementPage />}
            {currentPage === 'admin_history' && <AdminHistoryPage />}
            {currentPage === 'account_settings' && <AccountSettingsPage />}
            {currentPage === 'change_email' && <ChangeEmailPage onBack={() => setCurrentPage('account_settings')} />}
            {currentPage === 'change_password' && <ChangePasswordPage onBack={() => setCurrentPage('account_settings')} />}
        </AppLayout>
    );
}

// Enhanced Inventory Page with better search and display
function InventoryPage({ inventory }: { inventory: InventoryItem[] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInventory = useMemo(() => {
        if (!searchTerm.trim()) return inventory;
        
        const search = searchTerm.toLowerCase();
        return inventory.filter(item =>
            (item.sku && item.sku.toLowerCase().includes(search)) ||
            (item.name && item.name.toLowerCase().includes(search)) ||
            (item.category && item.category.toLowerCase().includes(search)) ||
            (item.location && item.location.toLowerCase().includes(search))
        );
    }, [inventory, searchTerm]);

    const totalItems = inventory.length;
    const filteredCount = filteredInventory.length;
    const lowStockItems = inventory.filter(item => item.qty_on_hand < 10).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Inventory</h2>
                    <p className="text-muted-foreground">
                        Showing {filteredCount} of {totalItems} items
                        {lowStockItems > 0 && (
                            <span className="ml-2 text-destructive">• {lowStockItems} low stock</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <SearchIcon className="h-5 w-5 absolute left-3 top-3 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by SKU, name, category, or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10 w-80"
                        />
                    </div>
                </div>
            </div>

            <div className="card p-6">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-3 px-4 font-semibold text-foreground">SKU</th>
                                <th className="text-left py-3 px-4 font-semibold text-foreground">Name</th>
                                <th className="text-left py-3 px-4 font-semibold text-foreground">Category</th>
                                <th className="text-right py-3 px-4 font-semibold text-foreground">Qty on Hand</th>
                                <th className="text-left py-3 px-4 font-semibold text-foreground">UOM</th>
                                <th className="text-left py-3 px-4 font-semibold text-foreground">Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.map((item) => (
                                <tr key={item.sku} className="border-b border-border hover:bg-muted/50 transition-colors">
                                    <td className="py-3 px-4 font-mono text-sm text-foreground font-medium">{item.sku}</td>
                                    <td className="py-3 px-4 text-foreground">{item.name}</td>
                                    <td className="py-3 px-4 text-muted-foreground">{item.category || '-'}</td>
                                    <td className="py-3 px-4 text-right">
                                        <span className={`font-semibold ${
                                            item.qty_on_hand < 10 ? 'text-destructive' : 
                                            item.qty_on_hand < 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
                                        }`}>
                                            {item.qty_on_hand.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-muted-foreground">{item.uom}</td>
                                    <td className="py-3 px-4 text-muted-foreground">{item.location || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {filteredInventory.length === 0 && searchTerm && (
                        <div className="text-center py-12 text-muted-foreground">
                            <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No inventory items found matching "{searchTerm}"</p>
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="mt-2 text-primary hover:underline"
                            >
                                Clear search
                            </button>
                        </div>
                    )}
                    
                    {filteredInventory.length === 0 && !searchTerm && (
                        <div className="text-center py-12 text-muted-foreground">
                            <InventoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No inventory items available</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Enhanced Log Shipment Page
function LogShipmentPage({ onLogShipment, inventory, role }: { 
    onLogShipment: (details: any) => void, 
    inventory: InventoryItem[], 
    role: string | null 
}) {
    const [shipmentId, setShipmentId] = useState('');
    const [type, setType] = useState<'incoming' | 'outgoing'>('incoming');
    const [shipmentItems, setShipmentItems] = useState<any[]>([]);
    const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);
    const [currentQty, setCurrentQty] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');
    const [existingShipmentIds, setExistingShipmentIds] = useState<string[]>([]);
    const [isDuplicateId, setIsDuplicateId] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Load existing shipment IDs
    useEffect(() => {
        const loadExistingShipmentIds = async () => {
            try {
                const { data, error } = await _supabase
                    .from('shipments')
                    .select('shipment_id');
                
                if (error) throw error;
                
                const ids = data?.map(item => item.shipment_id.toLowerCase()) || [];
                setExistingShipmentIds(ids);
            } catch (err) {
                console.error('Error loading existing shipment IDs:', err);
            }
        };

        loadExistingShipmentIds();
    }, []);

    // Check for duplicate shipment ID
    useEffect(() => {
        if (shipmentId.trim()) {
            const isDuplicate = existingShipmentIds.includes(shipmentId.trim().toLowerCase());
            setIsDuplicateId(isDuplicate);
        } else {
            setIsDuplicateId(false);
        }
    }, [shipmentId, existingShipmentIds]);

    const filteredItems = useMemo(() => 
        searchTerm
            ? inventory.filter(i =>
                !shipmentItems.some(si => si.itemNo === i.sku) &&
                (i.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 i.name?.toLowerCase().includes(searchTerm.toLowerCase()))
            ).slice(0, 15)
            : [],
    [searchTerm, inventory, shipmentItems]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!currentItem || !currentQty || Number(currentQty) <= 0) {
            setError("Please select a valid item and enter a positive quantity.");
            return;
        }
        
        setShipmentItems([...shipmentItems, { 
            itemNo: currentItem.sku, 
            description: currentItem.name, 
            quantity: Number(currentQty) 
        }]);
        setCurrentItem(null);
        setCurrentQty('');
        setSearchTerm('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (!shipmentId.trim()) {
            setError('Please provide a shipment ID.');
            return;
        }
        
        if (isDuplicateId) {
            setError('This shipment ID already exists. Please use a different ID.');
            return;
        }
        
        if (shipmentItems.length === 0) {
            setError('Please add at least one item to the shipment.');
            return;
        }
        
        onLogShipment({
            shipmentId: shipmentId.trim(),
            type,
            items: shipmentItems
        });
        
        // Reset form and update existing IDs
        setExistingShipmentIds(prev => [...prev, shipmentId.trim().toLowerCase()]);
        setShipmentId('');
        setShipmentItems([]);
        setError('');
        setIsDuplicateId(false);
    };

    const handlePackingSlipItems = (items: Array<{ itemNo: string; description: string; quantity: number }>, shipmentId?: string) => {
        // Add all extracted items to the shipment
        const newItems = items.filter(item => 
            !shipmentItems.some(existing => existing.itemNo === item.itemNo)
        );
        setShipmentItems(prev => [...prev, ...newItems]);
        
        // Set the shipment ID if extracted
        if (shipmentId && shipmentId.trim()) {
            setShipmentId(shipmentId.trim());
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                    {type === 'incoming' ? 'Log Incoming Shipment' : 'Log Outgoing Shipment'}
                </h1>
                <p className="text-muted-foreground text-lg">
                    Record shipment and update inventory
                </p>
            </div>
            
            {/* Error Message */}
            {error && (
                <div className="card p-4 border-destructive bg-destructive/10 animate-bounce-gentle">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <p className="text-destructive font-medium">{error}</p>
                    </div>
                </div>
            )}

            {/* Duplicate ID Warning */}
            {isDuplicateId && !error && (
                <div className="card p-4 border-warning bg-warning/10 animate-glow-pulse">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        <p className="text-warning font-medium">
                            ⚠️ Warning: This shipment ID already exists. Please choose a different ID.
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Shipment Details Card */}
                <div className="card p-8 animate-scale-in">
                    <div className="flex items-center space-x-3 mb-6">
                        <ShipmentIcon className="h-6 w-6 text-primary" />
                        <h3 className="text-2xl font-semibold text-foreground">Shipment Details</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-foreground mb-2">
                                Shipment ID *
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={shipmentId}
                                    onChange={(e) => setShipmentId(e.target.value)}
                                    className={`input text-lg transition-all duration-300 ${
                                        isDuplicateId 
                                            ? 'border-warning ring-4 ring-warning/20 shadow-glow animate-glow-pulse' 
                                            : 'focus:border-primary'
                                    }`}
                                    placeholder="Enter shipment identifier..."
                                    required
                                />
                                {isDuplicateId && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <AlertTriangle className="h-5 w-5 text-warning animate-bounce" />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-foreground mb-2">
                                Shipment Type *
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setType('incoming')}
                                    className={`flex items-center justify-center space-x-2 p-4 rounded-xl font-semibold transition-all duration-300 ${
                                        type === 'incoming' 
                                            ? 'bg-gradient-primary text-primary-foreground shadow-glow' 
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                                >
                                    <IncomingIcon className="h-5 w-5" />
                                    <span>Incoming</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('outgoing')}
                                    className={`flex items-center justify-center space-x-2 p-4 rounded-xl font-semibold transition-all duration-300 ${
                                        type === 'outgoing' 
                                            ? 'bg-gradient-primary text-primary-foreground shadow-glow' 
                                            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                                >
                                    <OutgoingIcon className="h-5 w-5" />
                                    <span>Outgoing</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Items Card */}
                <div className="card p-8 animate-scale-in overflow-visible relative z-50" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <PlusCircleIcon className="h-6 w-6 text-primary" />
                            <h3 className="text-2xl font-semibold text-foreground">Add Items</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="px-6 py-3 bg-gradient-primary text-primary-foreground rounded-xl font-semibold transition-all duration-200 hover:opacity-90 hover:scale-105 hover:shadow-glow flex items-center space-x-3 shadow-md"
                        >
                            <CameraIcon className="h-5 w-5" />
                            <span>Scan Packing Slip</span>
                        </button>
                    </div>
                    
                    <div className="space-y-6">
                        {/* Item Search */}
                        <div className="space-y-2 relative">
                            <label className="block text-sm font-semibold text-foreground mb-2">
                                Search Inventory
                            </label>
                            <div className="relative">
                                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentItem(null);
                                    }}
                                    placeholder="Start typing SKU or description..."
                                    className="input pl-4 text-lg relative z-10"
                                />
                                {filteredItems.length > 0 && !currentItem && (
                                    <ul className="absolute z-50 w-full bg-card border border-border mt-2 rounded-xl shadow-elegant max-h-80 overflow-auto">
                                        {filteredItems.map((item, index) => (
                                            <li
                                                key={item.sku}
                                                onClick={() => {
                                                    setCurrentItem(item);
                                                    setSearchTerm(`${item.sku} - ${item.name}`);
                                                }}
                                                className="relative z-50 p-4 hover:bg-gradient-accent cursor-pointer border-b border-border last:border-b-0 transition-all duration-200 group"
                                                style={{ zIndex: 100 }}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                                                            {item.sku}
                                                        </span>
                                                        <p className="text-sm text-muted-foreground mt-1">{item.name}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`font-bold text-lg ${
                                                            item.qty_on_hand === 0 ? 'text-destructive' :
                                                            item.qty_on_hand < 10 ? 'text-status-low' : 
                                                            item.qty_on_hand < 50 ? 'text-warning' : 'text-status-high'
                                                        }`}>
                                                            {item.qty_on_hand}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">in stock</p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Selected Item & Quantity */}
                        {currentItem && (
                            <div className="bg-gradient-accent p-6 rounded-xl border-l-4 border-primary animate-fade-in">
                                <div className="flex flex-col md:flex-row md:items-end gap-6">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-foreground mb-2">Selected Item</h4>
                                        <div className="bg-card p-4 rounded-lg">
                                            <p className="font-mono font-bold text-lg text-foreground">{currentItem.sku}</p>
                                            <p className="text-muted-foreground">{currentItem.name}</p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Available: <span className="font-semibold">{currentItem.qty_on_hand}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-foreground">
                                            Quantity *
                                        </label>
                                        <div className="flex space-x-3">
                                            <input
                                                type="number"
                                                min="1"
                                                max={type === 'outgoing' ? currentItem.qty_on_hand : undefined}
                                                value={currentQty}
                                                onChange={(e) => setCurrentQty(e.target.value)}
                                                className="w-32 input text-center text-lg font-bold"
                                                placeholder="0"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddItem}
                                                className="btn-primary px-6 whitespace-nowrap"
                                            >
                                                <PlusCircleIcon className="h-4 w-4 mr-2" />
                                                Add Item
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items List */}
                {shipmentItems.length > 0 && (
                    <div className="card p-8 animate-scale-in" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <PackageIcon className="h-6 w-6 text-primary" />
                                <h3 className="text-2xl font-semibold text-foreground">Items to {type === 'incoming' ? 'Receive' : 'Ship'}</h3>
                            </div>
                            <span className="text-sm font-semibold text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                                {shipmentItems.length} {shipmentItems.length === 1 ? 'item' : 'items'}
                            </span>
                        </div>
                        <div className="space-y-3">
                            {shipmentItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between bg-gradient-accent p-4 rounded-xl hover:shadow-md transition-all duration-200 group">
                                    <div className="flex-1">
                                        <div className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                                            {item.itemNo}
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {item.description}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <div className="font-bold text-lg text-foreground">
                                                {item.quantity.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground">quantity</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShipmentItems(shipmentItems.filter((_, i) => i !== index))}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <button
                        type="submit"
                        disabled={shipmentItems.length === 0 || !shipmentId.trim() || isDuplicateId}
                        className="w-full btn-primary text-xl py-6 disabled:opacity-50 disabled:cursor-not-allowed shadow-elegant"
                    >
                        <div className="flex items-center justify-center space-x-3">
                            <ShipmentIcon className="h-6 w-6" />
                            <span>Log Shipment</span>
                        </div>
                    </button>
                </div>
            </form>

            {/* Packing Slip Scanner */}
            {showScanner && (
                <PackingSlipScanner
                    onItemsExtracted={handlePackingSlipItems}
                    inventory={inventory}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
}

// Simple Shipment History Page
function ShipmentHistoryPage({ shipments, title, onUpdateShipment, onDeleteShipment }: { 
    shipments: Shipment[], 
    title: string,
    onUpdateShipment?: (shipment: Shipment) => void,
    onDeleteShipment?: (shipmentId: string) => void
}) {
    const [expandedShipments, setExpandedShipments] = useState<Set<string>>(new Set());
    const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
    const [editFormData, setEditFormData] = useState({
        shipment_id: '',
        items: [] as Array<{itemNo: string, description: string, quantity: number}>
    });

    const toggleShipment = (shipmentId: string) => {
        const newExpanded = new Set(expandedShipments);
        if (newExpanded.has(shipmentId)) {
            newExpanded.delete(shipmentId);
        } else {
            newExpanded.add(shipmentId);
        }
        setExpandedShipments(newExpanded);
    };

    const startEdit = (shipment: Shipment) => {
        setEditingShipment(shipment);
        setEditFormData({
            shipment_id: shipment.shipment_id,
            items: [...shipment.items]
        });
    };

    const handleSaveEdit = async () => {
        if (!editingShipment || !onUpdateShipment) return;
        
        const updatedShipment = {
            ...editingShipment,
            shipment_id: editFormData.shipment_id,
            items: editFormData.items
        };
        
        await onUpdateShipment(updatedShipment);
        setEditingShipment(null);
    };

    const updateItemQuantity = (index: number, quantity: number) => {
        const newItems = [...editFormData.items];
        newItems[index].quantity = quantity;
        setEditFormData({ ...editFormData, items: newItems });
    };

    const removeItem = (index: number) => {
        const newItems = editFormData.items.filter((_, i) => i !== index);
        setEditFormData({ ...editFormData, items: newItems });
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            
            <div className="space-y-4">
                {shipments.length === 0 ? (
                    <div className="text-center py-12 card">
                        <p className="text-muted-foreground">No shipments found.</p>
                    </div>
                ) : (
                    shipments.map((shipment) => (
                        <div key={shipment.id} className="card overflow-hidden">
                            <button
                                onClick={() => toggleShipment(shipment.id)}
                                className="w-full px-6 py-4 text-left hover:bg-secondary/50 transition-colors flex items-center justify-between"
                            >
                                <div className="flex items-center space-x-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">
                                            {shipment.shipment_id}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(shipment.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {shipment.items.length} item(s) • {shipment.user_email}
                                    </div>
                                </div>
                                <div className={`transform transition-transform duration-200 ${expandedShipments.has(shipment.id) ? 'rotate-180' : ''}`}>
                                    <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>
                            
                            {expandedShipments.has(shipment.id) && (
                                <div className="px-6 pb-4 border-t border-border animate-accordion-down">
                                    <div className="pt-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                                                <div>
                                                    <h4 className="text-sm font-medium text-foreground mb-1">Type:</h4>
                                                    <p className="text-sm text-muted-foreground capitalize">{shipment.type}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-foreground mb-1">User:</h4>
                                                    <p className="text-sm text-muted-foreground">{shipment.user_email}</p>
                                                </div>
                                                {shipment.approved_by && (
                                                    <div>
                                                        <h4 className="text-sm font-medium text-foreground mb-1">Approved By:</h4>
                                                        <p className="text-sm text-muted-foreground">{shipment.approved_by}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex space-x-2 ml-4">
                                                {onUpdateShipment && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEdit(shipment);
                                                        }}
                                                        className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                                {onDeleteShipment && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Are you sure you want to delete this shipment?')) {
                                                                onDeleteShipment(shipment.id);
                                                            }
                                                        }}
                                                        className="px-3 py-1 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <h4 className="text-sm font-medium text-foreground mb-2">Items:</h4>
                                            <div className="space-y-2">
                                                {shipment.items.map((item, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-foreground">{item.itemNo}</p>
                                                            <p className="text-xs text-muted-foreground">{item.description}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-medium text-foreground">Qty: {item.quantity}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Edit Shipment Modal */}
            {editingShipment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card p-6 rounded-xl border border-border max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <h3 className="text-xl font-semibold text-foreground mb-4">Edit Shipment</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Shipment ID</label>
                                <input
                                    type="text"
                                    value={editFormData.shipment_id}
                                    onChange={(e) => setEditFormData({ ...editFormData, shipment_id: e.target.value })}
                                    className="input w-full"
                                />
                            </div>
                            
                            <div>
                                <h4 className="text-sm font-medium text-foreground mb-2">Items</h4>
                                <div className="space-y-2">
                                    {editFormData.items.map((item, index) => (
                                        <div key={index} className="flex items-center space-x-2 p-3 bg-secondary/20 rounded-lg">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-foreground">{item.itemNo}</p>
                                                <p className="text-xs text-muted-foreground">{item.description}</p>
                                            </div>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.quantity}
                                                onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                                                className="input w-20"
                                            />
                                            <button
                                                onClick={() => removeItem(index)}
                                                className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setEditingShipment(null)}
                                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
