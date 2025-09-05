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

const supabase = _supabase as any;

// Main App Component
export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState(false);

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

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user profile:', error);
                setAuthError(true);
                return;
            }

            if (data) {
                setUser(data as any);
                setUserRole((data as any).role ?? null);
            } else {
                setUser(null);
                setUserRole(null);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setAuthError(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (authError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#2c2c2e] text-[#8f8e94]">
                <div className="text-center p-8 border border-[#3a3a3c] rounded-lg bg-[#3a3a3c] shadow-lg">
                    <h1 className="text-2xl font-bold mb-2 text-white">Authentication Error</h1>
                    <p>The application could not authenticate with Supabase.</p>
                    <p>Please check your configuration.</p>
                </div>
            </div>
        );
    }

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen bg-[#3a3a3c]"><p className="text-[#8f8e94] animate-pulse text-lg">Loading Application...</p></div>;
    }

    if (!user) {
        return <LoginScreen />;
    }

    return <MainAppView user={user} role={userRole} onSignOut={handleSignOut} />;
}

// Login and Sign-up Screen Component
function LoginScreen() {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (isLoginView) {
            try {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } catch (err: any) {
                setError(err.message);
            }
        } else {
            try {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#2c2c2e]">
            <div className="p-8 bg-[#3a3a3c] rounded-lg shadow-2xl max-w-md w-full">
                <img src={DccaLogo} alt="DomCast Logo" className="h-28 mx-auto mb-6" />
                <div className="flex justify-center border-b border-[#48484a] mb-6">
                    <button 
                        onClick={() => setIsLoginView(true)} 
                        className={`px-6 py-2 text-lg font-semibold ${isLoginView ? 'text-orange-500 border-b-2 border-orange-500' : 'text-[#8f8e94]'}`}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => setIsLoginView(false)} 
                        className={`px-6 py-2 text-lg font-semibold ${!isLoginView ? 'text-orange-500 border-b-2 border-orange-500' : 'text-[#8f8e94]'}`}
                    >
                        Sign Up
                    </button>
                </div>
                <form onSubmit={handleAuthAction} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-[#8f8e94]">Email Address</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required 
                            className="mt-1 block w-full px-3 py-2 bg-[#48484a] border border-[#636267] rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#8f8e94]">Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            className="mt-1 block w-full px-3 py-2 bg-[#48484a] border border-[#636267] rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <div>
                        <button 
                            type="submit" 
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#3a3a3c] focus:ring-orange-500"
                        >
                            {isLoginView ? 'Login' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Main Application View Component
function MainAppView({ user, role, onSignOut }: { user: User, role: string | null, onSignOut: () => void }) {
    const [currentPage, setCurrentPage] = useState(role === 'submitter' ? 'log_shipment' : 'inventory');
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [shipmentRequests, setShipmentRequests] = useState<ShipmentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [isNavOpen, setIsNavOpen] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load inventory
            const { data: inventoryData, error: inventoryError } = await supabase
                .from('inventory')
                .select('*')
                .order('item_no');

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
            if (role === 'admin') {
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
        
        if (role === 'submitter') {
            try {
                const { error } = await supabase
                    .from('shipment_requests')
                    .insert({
                        shipment_id: shipmentId,
                        type,
                        items,
                        requestor_id: user.id,
                        requestor_email: user.email,
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
                    user_id: user.id,
                    user_email: user.email
                });

            if (error) throw error;

            // Update inventory quantities
            for (const item of items) {
                const inventoryItem = inventory.find(i => i.item_no === item.itemNo);
                if (inventoryItem) {
                    const newQuantity = inventoryItem.quantity + (type === 'incoming' ? item.quantity : -item.quantity);
                    await supabase
                        .from('inventory')
                        .update({ quantity: newQuantity })
                        .eq('id', inventoryItem.id);
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
                    approved_by: user.email
                });

            if (shipmentError) throw shipmentError;

            // Update inventory quantities
            for (const item of request.items) {
                const inventoryItem = inventory.find(i => i.item_no === item.itemNo);
                if (inventoryItem) {
                    const newQuantity = inventoryItem.quantity + (request.type === 'incoming' ? item.quantity : -item.quantity);
                    await supabase
                        .from('inventory')
                        .update({ quantity: newQuantity })
                        .eq('id', inventoryItem.id);
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

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen bg-[#3a3a3c]"><p className="text-[#8f8e94] animate-pulse text-lg">Loading...</p></div>;
    }

    return (
        <div className="min-h-screen bg-[#2c2c2e] text-white">
            {/* Navigation */}
            <nav className="bg-[#3a3a3c] border-b border-[#48484a] px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <img src={DccaLogo} alt="DomCast Logo" className="h-10" />
                        <h1 className="text-xl font-bold">Inventory Management</h1>
                    </div>
                    <div className="hidden md:flex items-center space-x-6">
                        {role !== 'submitter' && (
                            <button
                                onClick={() => setCurrentPage('inventory')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                                    currentPage === 'inventory' ? 'bg-orange-600 text-white' : 'text-[#8f8e94] hover:text-white'
                                }`}
                            >
                                <InventoryIcon className="h-5 w-5" />
                                <span>Inventory</span>
                            </button>
                        )}
                        <button
                            onClick={() => setCurrentPage('log_shipment')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                                currentPage === 'log_shipment' ? 'bg-orange-600 text-white' : 'text-[#8f8e94] hover:text-white'
                            }`}
                        >
                            <ShipmentIcon className="h-5 w-5" />
                            <span>Log Shipment</span>
                        </button>
                        {role !== 'submitter' && (
                            <>
                                <button
                                    onClick={() => setCurrentPage('incoming')}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                                        currentPage === 'incoming' ? 'bg-orange-600 text-white' : 'text-[#8f8e94] hover:text-white'
                                    }`}
                                >
                                    <IncomingIcon className="h-5 w-5" />
                                    <span>Incoming</span>
                                </button>
                                <button
                                    onClick={() => setCurrentPage('outgoing')}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                                        currentPage === 'outgoing' ? 'bg-orange-600 text-white' : 'text-[#8f8e94] hover:text-white'
                                    }`}
                                >
                                    <OutgoingIcon className="h-5 w-5" />
                                    <span>Outgoing</span>
                                </button>
                            </>
                        )}
                        {role === 'admin' && (
                            <button
                                onClick={() => setCurrentPage('approval')}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                                    currentPage === 'approval' ? 'bg-orange-600 text-white' : 'text-[#8f8e94] hover:text-white'
                                }`}
                            >
                                <ApprovalIcon className="h-5 w-5" />
                                <span>Approval</span>
                                {shipmentRequests.length > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                                        {shipmentRequests.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-[#8f8e94]">{user.email} ({role})</span>
                        <button
                            onClick={onSignOut}
                            className="flex items-center space-x-2 px-3 py-2 bg-[#48484a] hover:bg-[#636267] rounded-lg transition"
                        >
                            <LogOutIcon className="h-4 w-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {currentPage === 'inventory' && <InventoryPage inventory={inventory} />}
                {currentPage === 'log_shipment' && <LogShipmentPage onLogShipment={handleLogShipment} inventory={inventory} role={role} />}
                {currentPage === 'incoming' && <ShipmentHistoryPage shipments={incomingShipments} title="Incoming Shipments" />}
                {currentPage === 'outgoing' && <ShipmentHistoryPage shipments={outgoingShipments} title="Outgoing Shipments" />}
                {currentPage === 'approval' && role === 'admin' && (
                    <ApprovalPage 
                        requests={shipmentRequests} 
                        onApprove={handleApproveShipment} 
                        onReject={handleRejectShipment} 
                    />
                )}
            </main>

            {/* Notification */}
            {notification.show && (
                <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
                    notification.type === 'success' ? 'bg-green-600' : 
                    notification.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'
                } text-white`}>
                    <div className="flex items-center justify-between">
                        <span>{notification.message}</span>
                        <button
                            onClick={() => setNotification({ ...notification, show: false })}
                            className="ml-4 text-white hover:text-gray-200"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple Inventory Page
function InventoryPage({ inventory }: { inventory: InventoryItem[] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredInventory = useMemo(() => {
        return inventory.filter(item =>
            item.item_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [inventory, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Inventory</h2>
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <SearchIcon className="h-5 w-5 absolute left-3 top-3 text-[#8f8e94]" />
                        <input
                            type="text"
                            placeholder="Search inventory..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-[#3a3a3c] border border-[#48484a] rounded-lg text-white placeholder-[#8f8e94] focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-[#3a3a3c] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#48484a]">
                        <thead className="bg-[#48484a]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">
                                    Item No.
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">
                                    On Hand
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-[#3a3a3c] divide-y divide-[#48484a]">
                            {filteredInventory.map((item) => (
                                <tr key={item.id} className="hover:bg-[#48484a]">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                        {item.item_no}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#8f8e94]">
                                        {item.description}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                        {item.quantity}
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
                !shipmentItems.some(si => si.itemNo === i.item_no) &&
                (i.item_no?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 i.description?.toLowerCase().includes(searchTerm.toLowerCase()))
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
            itemNo: currentItem.item_no, 
            description: currentItem.description, 
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
                        <label className="block text-sm font-medium text-[#8f8e94] mb-2">
                            Shipment ID
                        </label>
                        <input
                            type="text"
                            value={shipmentId}
                            onChange={(e) => setShipmentId(e.target.value)}
                            className="w-full px-3 py-2 bg-[#3a3a3c] border border-[#48484a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-[#8f8e94] mb-2">
                            Shipment Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value as 'incoming' | 'outgoing')}
                            className="w-full px-3 py-2 bg-[#3a3a3c] border border-[#48484a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="incoming">Incoming</option>
                            <option value="outgoing">Outgoing</option>
                        </select>
                    </div>
                </div>

                {/* Add Items Section */}
                <div className="bg-[#3a3a3c] p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Add Items</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#8f8e94] mb-1">Search for Item</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentItem(null);
                                    }}
                                    placeholder="Start typing Item No. or Description..."
                                    className="w-full p-2 bg-[#48484a] border border-[#636267] rounded-md text-white"
                                />
                                {filteredItems.length > 0 && !currentItem && (
                                    <ul className="absolute z-10 w-full bg-[#48484a] border border-[#636267] mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {filteredItems.map(item => (
                                            <li
                                                key={item.id}
                                                onClick={() => {
                                                    setCurrentItem(item);
                                                    setSearchTerm(`${item.item_no} - ${item.description}`);
                                                }}
                                                className="p-2 hover:bg-[#636267] cursor-pointer flex justify-between items-center"
                                            >
                                                <span className="text-white">{item.item_no} - {item.description}</span>
                                                <span className="text-[#8f8e94] text-sm">Qty: {item.quantity}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {currentItem && (
                            <div>
                                <label className="block text-sm font-medium text-[#8f8e94] mb-1">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={currentQty}
                                    onChange={(e) => setCurrentQty(e.target.value)}
                                    className="w-32 p-2 bg-[#48484a] border border-[#636267] rounded-md text-white"
                                    placeholder="0"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="ml-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md transition"
                                >
                                    Add Item
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Items List */}
                    {shipmentItems.length > 0 && (
                        <div className="mt-6">
                            <h4 className="text-md font-semibold mb-2">Items to Ship:</h4>
                            <div className="space-y-2">
                                {shipmentItems.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between bg-[#48484a] p-3 rounded-md">
                                        <span className="text-white">{item.itemNo} - {item.description}</span>
                                        <div className="flex items-center space-x-4">
                                            <span className="text-[#8f8e94]">Qty: {item.quantity}</span>
                                            <button
                                                type="button"
                                                onClick={() => setShipmentItems(shipmentItems.filter((_, i) => i !== index))}
                                                className="text-red-400 hover:text-red-300"
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
                    className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition"
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
            <h2 className="text-2xl font-bold">{title}</h2>
            
            <div className="bg-[#3a3a3c] rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#48484a]">
                        <thead className="bg-[#48484a]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">
                                    Shipment ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">
                                    Items
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">
                                    User
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-[#3a3a3c] divide-y divide-[#48484a]">
                            {shipments.map((shipment) => (
                                <tr key={shipment.id} className="hover:bg-[#48484a]">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                        {new Date(shipment.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                        {shipment.shipment_id}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#8f8e94]">
                                        {shipment.items.length} item(s)
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8f8e94]">
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
            <h2 className="text-2xl font-bold">Pending Approvals</h2>
            
            {requests.length === 0 ? (
                <div className="text-center py-12 bg-[#3a3a3c] rounded-lg">
                    <p className="text-[#8f8e94]">No pending approval requests.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => (
                        <div key={request.id} className="bg-[#3a3a3c] p-6 rounded-lg">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">
                                        Shipment ID: {request.shipment_id}
                                    </h3>
                                    <p className="text-[#8f8e94]">
                                        Type: {request.type} | Requested by: {request.requestor_email}
                                    </p>
                                    <p className="text-[#8f8e94] text-sm">
                                        {new Date(request.requested_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => onApprove(request)}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => onReject(request.id)}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                            <div className="border-t border-[#48484a] pt-4">
                                <h4 className="text-md font-medium text-white mb-2">Items:</h4>
                                <div className="space-y-1">
                                    {request.items.map((item, index) => (
                                        <div key={index} className="text-[#8f8e94] text-sm">
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