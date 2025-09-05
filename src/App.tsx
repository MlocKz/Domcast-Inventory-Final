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
  AlertTriangle as WarningIcon,
  LogOut as LogOutIcon,
  FilePenLine as EditIcon,
  BarChart2 as AnalyticsIcon,
  Search as SearchIcon,
  X as XIcon,
  Menu as MenuIcon,
  Camera as CameraIcon,
  PlusCircle as PlusCircleIcon,
  Download as DownloadIcon,
  FileCheck2 as ApprovalIcon,
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

// Simple Log Shipment Page
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
        if (!currentItem || !currentQty || Number(currentQty) <= 0) {
            alert("Please select a valid item and enter a positive quantity.");
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
        if (!shipmentId.trim() || shipmentItems.length === 0) {
            alert('Please provide a shipment ID and add at least one item.');
            return;
        }
        
        onLogShipment({
            shipmentId: shipmentId.trim(),
            type,
            items: shipmentItems
        });
        
        // Reset form
        setShipmentId('');
        setShipmentItems([]);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Log Shipment</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Shipment ID
                        </label>
                        <input
                            type="text"
                            value={shipmentId}
                            onChange={(e) => setShipmentId(e.target.value)}
                            className="input"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Shipment Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as 'incoming' | 'outgoing')}
                            className="input"
                        >
                            <option value="incoming">Incoming</option>
                            <option value="outgoing">Outgoing</option>
                        </select>
                    </div>
                </div>

                {/* Add Items Section */}
                <div className="card p-6">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Add Items</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Search for Item</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentItem(null);
                                    }}
                                    placeholder="Start typing Item No. or Description..."
                                    className="input"
                                />
                                {filteredItems.length > 0 && !currentItem && (
                                    <ul className="absolute z-10 w-full bg-card border border-border mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {filteredItems.map(item => (
                                            <li
                                                key={item.sku}
                                                onClick={() => {
                                                    setCurrentItem(item);
                                                    setSearchTerm(`${item.sku} - ${item.name}`);
                                                }}
                                                className="p-2 hover:bg-accent cursor-pointer flex justify-between items-center"
                                            >
                                                <span className="text-foreground">{item.sku} - {item.name}</span>
                                                <span className="text-muted-foreground text-sm">Qty: {item.qty_on_hand}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {currentItem && (
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={currentQty}
                                    onChange={(e) => setCurrentQty(e.target.value)}
                                    className="w-32 input"
                                    placeholder="0"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="ml-4 btn-primary"
                                >
                                    Add Item
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Items List */}
                    {shipmentItems.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-md font-semibold mb-2 text-foreground">Items to Ship:</h4>
                            <div className="space-y-2">
                                {shipmentItems.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between bg-secondary p-3 rounded-md">
                                        <span className="text-foreground">{item.itemNo} - {item.description}</span>
                                        <div className="flex items-center space-x-4">
                                            <span className="text-muted-foreground">Qty: {item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => setShipmentItems(shipmentItems.filter((_, i) => i !== index))}
                                                className="text-destructive hover:text-destructive/80 transition-colors"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="w-full btn-primary text-lg py-4"
                >
                    {role === 'submitter' ? 'Submit for Approval' : 'Log Shipment'}
                </button>
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
