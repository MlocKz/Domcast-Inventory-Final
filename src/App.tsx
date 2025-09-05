import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
import type { User, InventoryItem, Shipment, ShipmentRequest } from './lib/supabase';
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
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';
import { AppLayout } from './components/layout/AppLayout';
import { LoginScreen } from './components/auth/LoginScreen';
import { InventorySearchPage } from './components/inventory/InventorySearchPage';

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
    const [shipmentRequests, setShipmentRequests] = useState<ShipmentRequest[]>([]);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        // Set initial page based on role
        if (userRole === 'submitter') {
            setCurrentPage('log_shipment');
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

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user profile:', error);
                // Don't set auth error - just use default role
                setUser({ id: userId, email: '', role: 'submitter' } as any);
                setUserRole('submitter');
                return;
            }

            if (data) {
                setUser(data as any);
                setUserRole((data as any).role ?? 'submitter');
            } else {
                // Profile doesn't exist yet - create a default one
                console.log('Profile not found, using default submitter role');
                setUser({ id: userId, email: '', role: 'submitter' } as any);
                setUserRole('submitter');
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            // Fallback to default role rather than blocking login
            setUser({ id: userId, email: '', role: 'submitter' } as any);
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
                .order('timestamp', { ascending: false });

            if (shipmentsError) throw shipmentsError;
            setShipments(shipmentsData || []);

            // Load shipment requests (for admins)
            if (userRole === 'admin') {
                const { data: requestsData, error: requestsError } = await supabase
                    .from('shipment_requests')
                    .select('*')
                    .order('requested_at', { ascending: false });

                if (requestsError) throw requestsError;
                setShipmentRequests(requestsData || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            setNotification({ show: true, message: 'Error loading data', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogShipment = async (shipmentDetails: any) => {
        const { items, shipmentId, type } = shipmentDetails;
        
        if (userRole === 'submitter') {
            try {
                const { error } = await supabase
                    .from('shipment_requests')
                    .insert({
                        shipment_id: shipmentId,
                        type,
                        items,
                        requestor_id: user!.id,
                        requestor_email: user!.email,
                        status: 'pending'
                    });

                if (error) throw error;
                setNotification({ show: true, message: 'Shipment submitted for approval.', type: 'success' });
                loadData();
            } catch (error: any) {
                console.error("Failed to submit for approval:", error);
                setNotification({ show: true, message: `Submission failed: ${error.message}`, type: 'error' });
            }
            return;
        }

        // For admins/editors - directly process shipment
        try {
            const { error } = await supabase
                .from('shipments')
                .insert({
                    shipment_id: shipmentId,
                    type,
                    items,
                    user_id: user!.id,
                    user_email: user!.email
                });

            if (error) throw error;

            // Update inventory quantities
            for (const item of items) {
                const inventoryItem = inventory.find(i => i.sku === item.itemNo);
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

    const handleApproveShipment = async (request: ShipmentRequest) => {
        try {
            // Create shipment
            const { error: shipmentError } = await supabase
                .from('shipments')
                .insert({
                    shipment_id: request.shipment_id,
                    type: request.type,
                    items: request.items,
                    user_id: request.requestor_id,
                    user_email: request.requestor_email,
                    approved_by: user!.email
                });

            if (shipmentError) throw shipmentError;

            // Update inventory quantities
            for (const item of request.items) {
                const inventoryItem = inventory.find(i => i.sku === item.itemNo);
                if (inventoryItem) {
                    const newQuantity = inventoryItem.qty_on_hand + (request.type === 'incoming' ? item.quantity : -item.quantity);
                    await supabase
                        .from('inventory')
                        .update({ qty_on_hand: newQuantity })
                        .eq('sku', inventoryItem.sku);
                }
            }

            // Remove request
            const { error: deleteError } = await supabase
                .from('shipment_requests')
                .delete()
                .eq('id', request.id);

            if (deleteError) throw deleteError;

            setNotification({ show: true, message: 'Shipment approved and inventory updated.', type: 'success' });
            loadData();
        } catch (error: any) {
            console.error("Approval failed:", error);
            setNotification({ show: true, message: `Approval failed: ${error.message}`, type: 'error' });
        }
    };

    const handleRejectShipment = async (requestId: string) => {
        try {
            const { error } = await supabase
                .from('shipment_requests')
                .delete()
                .eq('id', requestId);

            if (error) throw error;
            setNotification({ show: true, message: 'Shipment request rejected.', type: 'success' });
            loadData();
        } catch (error: any) {
            console.error("Rejection failed:", error);
            setNotification({ show: true, message: 'Failed to reject shipment.', type: 'error' });
        }
    };

    const incomingShipments = shipments.filter(s => s.type === 'incoming');
    const outgoingShipments = shipments.filter(s => s.type === 'outgoing');

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

    return (
        <AppLayout
            user={user}
            role={userRole}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onSignOut={handleSignOut}
            notification={notification}
            setNotification={setNotification}
            shipmentRequestsCount={shipmentRequests.length}
        >
            {currentPage === 'inventory' && <InventorySearchPage />}
            {currentPage === 'log_shipment' && <LogShipmentPage onLogShipment={handleLogShipment} inventory={inventory} role={userRole} />}
            {currentPage === 'incoming' && <ShipmentHistoryPage shipments={incomingShipments} title="Incoming Shipments" />}
            {currentPage === 'outgoing' && <ShipmentHistoryPage shipments={outgoingShipments} title="Outgoing Shipments" />}
            {currentPage === 'approval' && userRole === 'admin' && (
                <ApprovalPage 
                    requests={shipmentRequests} 
                    onApprove={handleApproveShipment} 
                    onReject={handleRejectShipment} 
                />
            )}
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

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                    {type === 'incoming' ? 'Log Incoming Shipment' : 'Log Outgoing Shipment'}
                </h1>
                <p className="text-muted-foreground text-lg">
                    {role === 'submitter' ? 'Submit shipment details for admin approval' : 'Record shipment and update inventory'}
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
                    <div className="flex items-center space-x-3 mb-6">
                        <PlusCircleIcon className="h-6 w-6 text-primary" />
                        <h3 className="text-2xl font-semibold text-foreground">Add Items</h3>
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
                                    className="input pl-10 text-lg relative z-10"
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
                            {role === 'submitter' ? (
                                <>
                                    <FileCheck2 className="h-6 w-6" />
                                    <span>Submit for Approval</span>
                                </>
                            ) : (
                                <>
                                    <ShipmentIcon className="h-6 w-6" />
                                    <span>Log Shipment</span>
                                </>
                            )}
                        </div>
                    </button>
                </div>
            </form>
        </div>
    );
}

// Simple Shipment History Page
function ShipmentHistoryPage({ shipments, title }: { shipments: Shipment[], title: string }) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-secondary">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Shipment ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Items
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    User
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {shipments.map((shipment) => (
                                <tr key={shipment.id} className="hover:bg-secondary transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                        {new Date(shipment.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                        {shipment.shipment_id}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {shipment.items.length} item(s)
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {shipment.user_email}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Simple Approval Page
function ApprovalPage({ requests, onApprove, onReject }: { 
    requests: ShipmentRequest[], 
    onApprove: (request: ShipmentRequest) => void, 
    onReject: (id: string) => void 
}) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Pending Approvals</h2>
            
            {requests.length === 0 ? (
                <div className="text-center py-12 card">
                    <p className="text-muted-foreground">No pending approval requests.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <div key={request.id} className="card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Shipment ID: {request.shipment_id}
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Type: {request.type} | Requested by: {request.requestor_email}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        {new Date(request.requested_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => onApprove(request)}
                                        className="btn-primary bg-status-high hover:bg-status-high/90"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => onReject(request.id)}
                                        className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors font-semibold"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                            <div className="border-t border-border pt-4">
                                <h4 className="text-md font-medium text-foreground mb-2">Items:</h4>
                                <div className="space-y-1">
                                    {request.items.map((item, index) => (
                                        <div key={index} className="text-muted-foreground text-sm">
                                            {item.itemNo} - {item.description} (Qty: {item.quantity})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
