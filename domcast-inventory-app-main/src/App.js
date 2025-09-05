import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    onSnapshot,
    writeBatch,
    getDocs,
    runTransaction,
    query,
    setLogLevel,
    setDoc,
    getDoc,
    deleteDoc,
    addDoc,
    updateDoc
} from 'firebase/firestore';
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
import DccaLogo from './DCCA_Logo.png';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';

// In a real app, these would be in a .env file and not hardcoded.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const appName = 'domcast-inventory-app';

let app;
let db;
let auth;

// Initialize Firebase
try {
    if (Object.values(firebaseConfig).some(value => !value)) {
        console.error("Firebase configuration is incomplete. Please check your .env file.");
    } else {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        setLogLevel('debug');
    }
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

// Initial data to seed the inventory collection
const initialInventoryData = [
    { "itemNo": "2112.01", "description": "12\" Concrete Junction Box (PLT QTY 5 #75)", "quantity": 299 },
    // Data truncated for brevity
];

// Main App Component
export default function App() {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [firebaseError, setFirebaseError] = useState(false);

    useEffect(() => {
        if (!auth) {
            console.error("Firebase is not initialized. Cannot set up auth listener.");
            setIsLoading(false);
            setFirebaseError(true);
            return;
        }
        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // If user is logged in, fetch their role from Firestore
                const userDocRef = doc(db, `users/${user.uid}`);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setUserRole(userDocSnap.data().role);
                }
                setUser(user);
            } else {
                // If user is logged out, clear user data
                setUser(null);
                setUserRole(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (firebaseError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#2c2c2e] text-[#8f8e94]">
                <div className="text-center p-8 border border-[#3a3a3c] rounded-lg bg-[#3a3a3c] shadow-lg">
                    <h1 className="text-2xl font-bold mb-2 text-white">Firebase Configuration Error</h1>
                    <p>The application could not connect to Firebase.</p>
                    <p>Please ensure your environment variables are set correctly.</p>
                </div>
            </div>
        );
    }

    // Handle user sign-out
    const handleSignOut = async () => {
        try {
            await signOut(auth);
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

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError('');
        if (isLoginView) {
            try { await signInWithEmailAndPassword(auth, email, password); } catch (err) { setError(err.message); }
        } else {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                const statusDocRef = doc(db, "metadata", "app-status");

                await runTransaction(db, async (transaction) => {
                    const statusDoc = await transaction.get(statusDocRef);
                    // New users default to 'submitter'. The first user ever becomes the admin.
                    let role = 'submitter';
                    if (!statusDoc.exists() || !statusDoc.data().admin_claimed) {
                        transaction.set(statusDocRef, { admin_claimed: true, firstAdmin: user.uid });
                        role = 'admin';
                    }
                    transaction.set(doc(db, "users", user.uid), {
                        email: user.email,
                        role: role,
                        createdAt: new Date().toISOString()
                    });
                });
            } catch (err) {
                setError(err.message);
            }
        }
    };

    return (<div className="flex items-center justify-center min-h-screen bg-[#2c2c2e]"><div className="p-8 bg-[#3a3a3c] rounded-lg shadow-2xl max-w-md w-full"><img src={DccaLogo} alt="DomCast Logo" className="h-28 mx-auto mb-6" /><div className="flex justify-center border-b border-[#48484a] mb-6"><button onClick={() => setIsLoginView(true)} className={`px-6 py-2 text-lg font-semibold ${isLoginView ? 'text-orange-500 border-b-2 border-orange-500' : 'text-[#8f8e94]'}`}>Login</button><button onClick={() => setIsLoginView(false)} className={`px-6 py-2 text-lg font-semibold ${!isLoginView ? 'text-orange-500 border-b-2 border-orange-500' : 'text-[#8f8e94]'}`}>Sign Up</button></div><form onSubmit={handleAuthAction} className="space-y-6"><div><label className="block text-sm font-medium text-[#8f8e94]">Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-[#48484a] border border-[#636267] rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"/></div><div><label className="block text-sm font-medium text-[#8f8e94]">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-[#48484a] border border-[#636267] rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"/></div>{error && <p className="text-red-400 text-sm text-center">{error}</p>}<div><button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#3a3a3c] focus:ring-orange-500">{isLoginView ? 'Login' : 'Create Account'}</button></div></form></div></div>);
}


// Main Application View Component
function MainAppView({ user, role, onSignOut }) {
    const [currentPage, setCurrentPage] = useState(role === 'submitter' ? 'log_shipment' : 'inventory');
    const [inventory, setInventory] = useState([]);
    const [incoming, setIncoming] = useState([]);
    const [outgoing, setOutgoing] = useState([]);
    const [shipmentRequests, setShipmentRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [shipmentToDelete, setShipmentToDelete] = useState(null);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
    const [shipmentToEdit, setShipmentToEdit] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);

    useEffect(() => {
        if (user && db) {
            setIsLoading(true);
            const collections = {
                inventory: setInventory,
                incoming: setIncoming,
                outgoing: setOutgoing,
                shipment_requests: setShipmentRequests
            };
            
            const loadedCollections = new Set();
    
            const unsubscribers = Object.entries(collections).map(([col, setter]) => {
                const q = query(collection(db, `artifacts/${appName}/public/data/${col}`));
                return onSnapshot(q, (snapshot) => {
                    setter(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                    
                    if (!loadedCollections.has(col)) {
                        loadedCollections.add(col);
                    }
    
                    if (loadedCollections.size === Object.keys(collections).length) {
                        setIsLoading(false);
                    }
                }, (error) => {
                    console.error(`Failed to subscribe to ${col}:`, error);
                    if (!loadedCollections.has(col)) {
                        loadedCollections.add(col);
                    }
                    if (loadedCollections.size === Object.keys(collections).length) {
                        setIsLoading(false);
                    }
                });
            });
    
            return () => {
                unsubscribers.forEach(unsub => unsub());
            };
        }
    }, [user]);
    
    const handleSeedData = async () => {
        setIsSeeding(true);
        try {
            const inventoryCollection = collection(db, `artifacts/${appName}/public/data/inventory`);
            const existingData = await getDocs(inventoryCollection);
            if (!existingData.empty) {
                setNotification({ show: true, message: 'Inventory already loaded.', type: 'warning' });
                return;
            }
            const batch = writeBatch(db);
            initialInventoryData.forEach((item) => {
                const docRef = doc(inventoryCollection);
                batch.set(docRef, item);
            });
            await batch.commit();
            setNotification({ show: true, message: 'Initial inventory loaded!', type: 'success' });
        } catch (error) {
            setNotification({ show: true, message: 'Error loading initial data.', type: 'error' });
        } finally {
            setIsSeeding(false);
        }
    };
    
    const handleLogShipment = async (shipmentDetails) => {
        const { items, shipmentId, type } = shipmentDetails;
        
        if (role === 'submitter') {
            try {
                const requestsCollection = collection(db, `artifacts/${appName}/public/data/shipment_requests`);
                await addDoc(requestsCollection, {
                    ...shipmentDetails,
                    status: 'pending',
                    requestorId: user.uid,
                    requestorEmail: user.email,
                    requestedAt: new Date().toISOString()
                });
                setNotification({ show: true, message: 'Shipment submitted for approval.', type: 'success' });
            } catch (error) {
                console.error("Failed to submit for approval:", error);
                setNotification({ show: true, message: `Submission failed: ${error.message}`, type: 'error' });
            }
            return;
        }

        try {
            await runTransaction(db, async (t) => {
                const readPromises = items.map(item => {
                    const invItem = inventory.find(i => i.itemNo === item.itemNo);
                    if (!invItem) throw new Error(`Item ${item.itemNo} is not in the master inventory list.`);
                    
                    const invDocRef = doc(db, `artifacts/${appName}/public/data/inventory`, invItem.id);
                    return t.get(invDocRef).then(invDoc => {
                        if (!invDoc.exists()) throw new Error(`Item ${item.itemNo} not found in database.`);
                        const currentQty = invDoc.data().quantity;
                        if (type === 'outgoing' && currentQty < item.quantity) {
                            throw new Error(`Not enough stock for ${item.itemNo}. Available: ${currentQty}, Needed: ${item.quantity}`);
                        }
                        const newQty = currentQty + (type === 'incoming' ? item.quantity : -item.quantity);
                        return { ref: invDocRef, newQty: newQty };
                    });
                });
                const inventoryUpdateData = await Promise.all(readPromises);
                inventoryUpdateData.forEach(update => {
                    t.update(update.ref, { quantity: update.newQty });
                });
                const logRef = doc(collection(db, `artifacts/${appName}/public/data/${type}`));
                t.set(logRef, {
                    shipmentId,
                    items: items.map(({ itemNo, description, quantity }) => ({ itemNo, description, quantity })),
                    type,
                    timestamp: new Date().toISOString(),
                    user: user.uid,
                    userEmail: user.email
                });
            });
            setNotification({ show: true, message: `Shipment logged successfully.`, type: 'success' });
            setCurrentPage('inventory');
        } catch (error) {
            console.error("Transaction failed: ", error);
            setNotification({ show: true, message: `Failed to log shipment: ${error.message}`, type: 'error' });
        }
    };
    
    const handleApproveShipment = async (request) => {
        try {
            await runTransaction(db, async (t) => {
                const readPromises = request.items.map(item => {
                    const invItem = inventory.find(i => i.itemNo === item.itemNo);
                    if (!invItem) throw new Error(`Item ${item.itemNo} not found in inventory.`);
                    const invDocRef = doc(db, `artifacts/${appName}/public/data/inventory`, invItem.id);
                    return t.get(invDocRef).then(invDoc => {
                        if (!invDoc.exists()) throw new Error(`Inventory item ${item.itemNo} missing.`);
                        const currentQty = invDoc.data().quantity;
                        if (request.type === 'outgoing' && currentQty < item.quantity) {
                            throw new Error(`Not enough stock for ${item.itemNo}.`);
                        }
                        const newQty = currentQty + (request.type === 'incoming' ? item.quantity : -item.quantity);
                        return { ref: invDocRef, newQty };
                    });
                });
                const inventoryUpdates = await Promise.all(readPromises);
                inventoryUpdates.forEach(update => t.update(update.ref, { quantity: update.newQty }));

                const logRef = doc(collection(db, `artifacts/${appName}/public/data/${request.type}`));
                t.set(logRef, {
                    shipmentId: request.shipmentId,
                    items: request.items,
                    type: request.type,
                    timestamp: new Date().toISOString(),
                    user: request.requestorId,
                    userEmail: request.requestorEmail,
                    approvedBy: user.email
                });
                
                const requestDocRef = doc(db, `artifacts/${appName}/public/data/shipment_requests`, request.id);
                t.delete(requestDocRef);
            });
            setNotification({ show: true, message: 'Shipment approved and inventory updated.', type: 'success' });
        } catch (error) {
            console.error("Approval transaction failed:", error);
            setNotification({ show: true, message: `Approval failed: ${error.message}`, type: 'error' });
        }
    };

    const handleRejectShipment = async (requestId) => {
        try {
            const requestDocRef = doc(db, `artifacts/${appName}/public/data/shipment_requests`, requestId);
            await deleteDoc(requestDocRef);
            setNotification({ show: true, message: 'Shipment request rejected.', type: 'success' });
        } catch (error) {
            console.error("Rejection failed:", error);
            setNotification({ show: true, message: 'Failed to reject shipment.', type: 'error' });
        }
    };
    
    const handleDeleteShipment = async () => {
        if (!shipmentToDelete) return;
        const { shipment, type } = shipmentToDelete;
        try {
            await runTransaction(db, async (t) => {
                const readPromises = shipment.items.map(item => {
                    const invItem = inventory.find(inv => inv.itemNo === item.itemNo);
                    if (!invItem) return Promise.resolve(null);
                    return t.get(doc(db, `artifacts/${appName}/public/data/inventory`, invItem.id)).then(doc => ({ doc, ref: doc.ref, item }));
                });
                const readResults = await Promise.all(readPromises);
                for (const result of readResults) {
                    if (result && result.doc.exists()) {
                        const newQty = result.doc.data().quantity + (type === 'incoming' ? -result.item.quantity : result.item.quantity);
                        t.update(result.ref, { quantity: newQty });
                    }
                }
                const shipmentDocRef = doc(db, `artifacts/${appName}/public/data/${type}`, shipment.id);
                t.delete(shipmentDocRef);
            });
            setNotification({ show: true, message: `Shipment deleted.`, type: 'success' });
        } catch (error) {
            setNotification({ show: true, message: error.message, type: 'error' });
        } finally {
            setShowConfirmDeleteModal(false);
            setShipmentToDelete(null);
        }
    };

    const handleUpdateShipment = async (updatedShipment) => {
        const { originalShipment, newItems, newShipmentId, newType } = updatedShipment;
        const originalType = originalShipment.type;
        try {
            await runTransaction(db, async (t) => {
                const delta = new Map();
                const allItemNos = new Set([...originalShipment.items.map(i => i.itemNo), ...newItems.map(i => i.itemNo)]);
                allItemNos.forEach(itemNo => {
                    const oldQty = originalShipment.items.find(i => i.itemNo === itemNo)?.quantity || 0;
                    const newQty = newItems.find(i => i.itemNo === itemNo)?.quantity || 0;
                    const oldEffect = originalType === 'incoming' ? oldQty : -oldQty;
                    const newEffect = newType === 'incoming' ? newQty : -newQty;
                    const netChange = newEffect - oldEffect;
                    if (netChange !== 0) delta.set(itemNo, netChange);
                });
                const readPromises = Array.from(delta.keys()).map(itemNo => {
                    const invItem = inventory.find(i => i.itemNo === itemNo);
                    if (!invItem) throw new Error(`Item ${itemNo} not found.`);
                    return t.get(doc(db, `artifacts/${appName}/public/data/inventory`, invItem.id));
                });
                const invDocs = await Promise.all(readPromises);
                let i = 0;
                for (const [itemNo, change] of delta.entries()) {
                    const invDoc = invDocs[i++];
                    if (!invDoc.exists()) throw new Error(`Item ${itemNo} not in inventory.`);
                    const newInvQty = invDoc.data().quantity + change;
                    if (newInvQty < 0) throw new Error(`Not enough stock for ${itemNo}.`);
                    t.update(invDoc.ref, { quantity: newInvQty });
                }
                if (originalType !== newType) {
                    const oldDocRef = doc(db, `artifacts/${appName}/public/data/${originalType}`, originalShipment.id);
                    t.delete(oldDocRef);
                    const newDocRef = doc(collection(db, `artifacts/${appName}/public/data/${newType}`));
                    t.set(newDocRef, {
                        items: newItems,
                        shipmentId: newShipmentId,
                        type: newType,
                        timestamp: originalShipment.timestamp,
                        user: originalShipment.user,
                        userEmail: originalShipment.userEmail
                    });
                } else {
                    const shipmentDocRef = doc(db, `artifacts/${appName}/public/data/${originalType}`, originalShipment.id);
                    t.update(shipmentDocRef, { items: newItems, shipmentId: newShipmentId });
                }
            });
            setNotification({ show: true, message: `Shipment ${newShipmentId} updated.`, type: 'success' });
        } catch (e) {
            setNotification({ show: true, message: e.message, type: 'error' });
        } finally {
            setShowEditModal(false);
            setShipmentToEdit(null);
        }
    };
    
    const handleAddNewItem = async (newItem) => {
        const { itemNo, description, quantity } = newItem;
        if (!itemNo || !description) {
            setNotification({ show: true, message: "Item Number and Description are required.", type: 'error' });
            return;
        }
        const itemExists = inventory.some(item => item.itemNo.toLowerCase() === itemNo.toLowerCase());
        if (itemExists) {
            setNotification({ show: true, message: `Item No. "${itemNo}" already exists.`, type: 'error' });
            return;
        }
        try {
            await addDoc(collection(db, `artifacts/${appName}/public/data/inventory`), {
                itemNo,
                description,
                quantity: Number(quantity) || 0,
            });
            setNotification({ show: true, message: 'New item added to inventory!', type: 'success' });
            setShowAddItemModal(false);
        } catch (error) {
            console.error("Error adding new item:", error);
            setNotification({ show: true, message: `Failed to add new item: ${error.message}`, type: 'error' });
        }
    };

    const handleUpdateItem = async (itemId, updatedData) => {
        const itemRef = doc(db, `artifacts/${appName}/public/data/inventory`, itemId);
        try {
            await updateDoc(itemRef, updatedData);
            setNotification({ show: true, message: 'Item updated successfully!', type: 'success' });
            setItemToEdit(null); // Exit editing mode
        } catch (error) {
            console.error("Error updating item:", error);
            setNotification({ show: true, message: `Failed to update item: ${error.message}`, type: 'error' });
        }
    };

    const triggerDeleteConfirmation = (shipment, type) => {
        setShipmentToDelete({ shipment, type });
        setShowConfirmDeleteModal(true);
    };

    const triggerEdit = (shipment, type) => {
        setShipmentToEdit({ ...shipment, type });
        setShowEditModal(true);
    };

    const renderPage = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-full">
                    <p className="text-[#8f8e94] animate-pulse text-lg">Loading Inventory Data...</p>
                </div>
            );
        }
        
        // This variable now includes pending requests for a comprehensive duplicate check.
        const allShipmentsAndRequests = [...incoming, ...outgoing, ...shipmentRequests];

        switch (currentPage) {
            case 'inventory':
                return <InventoryPage 
                            inventory={inventory} 
                            isLoading={isLoading} 
                            handleSeedData={handleSeedData} 
                            isSeeding={isSeeding} 
                            role={role} 
                            setShowAddItemModal={setShowAddItemModal} 
                            onUpdateItem={handleUpdateItem}
                            itemToEdit={itemToEdit}
                            setItemToEdit={setItemToEdit}
                        />;
            case 'analytics':
                return <AnalyticsDashboard inventory={inventory} salesData={outgoing} />;
            case 'scan_slip':
                return <ScanShipmentPage onLogShipment={handleLogShipment} inventory={inventory} role={role}/>;
            case 'log_shipment':
                 // The 'allShipments' prop now includes pending requests, fixing the bug for submitters.
                return <LogShipmentPage onLogShipment={handleLogShipment} inventory={inventory} allShipments={allShipmentsAndRequests} role={role} />;
            case 'incoming_history':
                return <ShipmentHistoryPage shipments={incoming} allShipments={allShipmentsAndRequests} title="Incoming Shipments History" type="incoming" onDelete={triggerDeleteConfirmation} onEdit={triggerEdit} role={role} />;
            case 'outgoing_history':
                return <ShipmentHistoryPage shipments={outgoing} allShipments={allShipmentsAndRequests} title="Outgoing Shipments History" type="outgoing" onDelete={triggerDeleteConfirmation} onEdit={triggerEdit} role={role} />;
            case 'approvals':
                 return <ApprovalPage requests={shipmentRequests} onApprove={handleApproveShipment} onReject={handleRejectShipment} />;
            default:
                return <InventoryPage 
                            inventory={inventory} 
                            isLoading={isLoading} 
                            handleSeedData={handleSeedData} 
                            isSeeding={isSeeding} 
                            role={role} 
                            setShowAddItemModal={setShowAddItemModal}
                            onUpdateItem={handleUpdateItem}
                            itemToEdit={itemToEdit}
                            setItemToEdit={setItemToEdit}
                        />;
        }
    };

    return (
        <div className="bg-[#3a3a3c] text-white min-h-screen font-sans antialiased select-none">
            {notification.show && <NotificationBanner notification={notification} setNotification={setNotification} />}
            {showConfirmDeleteModal && <ConfirmDeleteModal onConfirm={handleDeleteShipment} onCancel={() => setShowConfirmDeleteModal(false)} />}
            {showEditModal && <EditShipmentModal shipment={shipmentToEdit} onUpdate={handleUpdateShipment} onCancel={() => setShowEditModal(false)} inventory={inventory} />}
            {showAddItemModal && <AddItemModal onAdd={handleAddNewItem} onCancel={() => setShowAddItemModal(false)} inventory={inventory} />}

            <div className="block md:flex">
                <NavBar 
                    currentPage={currentPage} 
                    setCurrentPage={setCurrentPage} 
                    role={role} 
                    onSignOut={onSignOut} 
                    isNavOpen={isNavOpen}
                    setIsNavOpen={setIsNavOpen}
                    pendingCount={shipmentRequests.length}
                />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
                    {renderPage()}
                </main>
            </div>

            <footer className="text-center p-4 text-sm text-[#8f8e94] fixed bottom-0 w-full bg-[#3a3a3c] border-t-[#48484a]">
                <p>User: <span className="font-mono bg-[#48484a] text-white px-2 py-1 rounded">{user.email}</span> ({role})</p>
            </footer>
        </div>
    );
}

// Navigation Bar Component
function NavBar({ currentPage, setCurrentPage, role, onSignOut, isNavOpen, setIsNavOpen, pendingCount }) {
    const navItems = [
        { id: 'inventory', label: 'Inventory', Icon: InventoryIcon, roles: ['admin', 'editor', 'viewer'] },
        { id: 'analytics', label: 'Analytics', Icon: AnalyticsIcon, roles: ['admin', 'editor', 'viewer'] },
        { id: 'approvals', label: 'Approvals', Icon: ApprovalIcon, roles: ['admin'], badge: pendingCount },
        { id: 'scan_slip', label: 'Scan Slip', Icon: CameraIcon, roles: ['admin', 'editor', 'submitter'] },
        { id: 'log_shipment', label: 'Log Shipment', Icon: ShipmentIcon, roles: ['admin', 'editor', 'submitter'] },
        { id: 'incoming_history', label: 'Incoming History', Icon: HistoryIcon, roles: ['admin', 'editor', 'viewer'] },
        { id: 'outgoing_history', label: 'Outgoing History', Icon: HistoryIcon, roles: ['admin', 'editor', 'viewer'] },
    ];

    const handleNavClick = (page) => {
        setCurrentPage(page);
        setIsNavOpen(false);
    };

    return (
        <>
            <div className="md:hidden flex justify-between items-center p-4 bg-[#2c2c2e] sticky top-0 z-10">
                <img src={DccaLogo} alt="DomCast Logo" className="h-10" />
                <button onClick={() => setIsNavOpen(!isNavOpen)}>
                    <MenuIcon className="h-6 w-6 text-white" />
                </button>
            </div>
            {isNavOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={() => setIsNavOpen(false)}></div>}
            <nav className={`fixed top-0 left-0 w-64 bg-[#2c2c2e] shadow-md p-4 flex flex-col justify-between h-screen z-30 transform transition-transform ${isNavOpen ? 'translate-x-0' : '-translate-x-full'} md:static md:min-h-screen md:h-auto md:translate-x-0 md:shadow-md`}>
                <div>
                    <div className="mb-8 px-2 hidden md:flex justify-center">
                       <img src={DccaLogo} alt="DomCast Logo" className="h-32" />
                    </div>
                    <div className="md:hidden mb-8 px-2 flex justify-center">
                       <img src={DccaLogo} alt="DomCast Logo" className="h-24" />
                    </div>
                    <ul>
                        {navItems.filter(item => role && item.roles.includes(role)).map(item => (
                            <li key={item.id} className="mb-2">
                                <button onClick={() => handleNavClick(item.id)} className={`flex items-center justify-between w-full text-left p-3 rounded-lg transition-colors ${ currentPage === item.id ? 'bg-orange-600 text-white shadow' : 'text-[#8f8e94] hover:bg-[#48484a]' }`}>
                                    <div className="flex items-center gap-3">
                                        <item.Icon className="h-5 w-5" />
                                        <span className="font-semibold">{item.label}</span>
                                    </div>
                                    {item.badge > 0 && (
                                        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">{item.badge}</span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <button onClick={onSignOut} className="flex items-center gap-3 w-full text-left p-3 rounded-lg transition-colors text-[#8f8e94] hover:bg-[#48484a] hover:text-white">
                        <LogOutIcon className="h-5 w-5" />
                        <span className="font-semibold">Sign Out</span>
                    </button>
                </div>
            </nav>
        </>
    );
}

// Approval Page for Admins
function ApprovalPage({ requests, onApprove, onReject }) {
    const sortedRequests = useMemo(() => 
        [...requests].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)), 
        [requests]
    );

    if (requests.length === 0) {
        return (
            <div>
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-white">Pending Approvals</h1>
                    <p className="text-[#8f8e94] mt-1">Review shipment requests from other users.</p>
                </header>
                <div className="bg-[#2c2c2e] rounded-lg shadow-md p-10 text-center">
                    <p className="text-[#8f8e94]">There are no pending shipment requests.</p>
                </div>
            </div>
        );
    }
    
    return (
        <div>
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-white">Pending Approvals</h1>
                <p className="text-[#8f8e94] mt-1">Review and approve or reject shipment requests from other users.</p>
            </header>
            <div className="space-y-4">
                {sortedRequests.map(req => (
                    <div key={req.id} className="bg-[#2c2c2e] rounded-lg shadow-md p-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-[#48484a] pb-3 mb-3">
                            <div>
                                <p className="text-sm text-[#8f8e94]">
                                    Requested by <span className="font-semibold text-white">{req.requestorEmail}</span> on {new Date(req.requestedAt).toLocaleString()}
                                </p>
                                <p className="font-bold text-lg text-white">
                                    {req.type === 'incoming' ? 'Incoming' : 'Outgoing'} Shipment: <span className="text-orange-500">{req.shipmentId}</span>
                                </p>
                            </div>
                            <div className="flex gap-3 mt-3 sm:mt-0">
                                <button onClick={() => onReject(req.id)} className="px-4 py-2 rounded-lg bg-[#48484a] hover:bg-red-700 text-white font-semibold transition">Reject</button>
                                <button onClick={() => onApprove(req)} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition">Approve</button>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-semibold text-white mb-2">Items:</h4>
                            <ul className="divide-y divide-[#48484a]">
                                {req.items.map(item => (
                                    <li key={item.itemNo} className="flex justify-between py-1">
                                        <div>
                                            <p className="font-medium text-white">{item.itemNo}</p>
                                            <p className="text-sm text-[#8f8e94]">{item.description}</p>
                                        </div>
                                        <p className={`font-bold text-lg ${req.type === 'incoming' ? 'text-green-500' : 'text-red-500'}`}>
                                            {req.type === 'incoming' ? '+' : '-'}{item.quantity}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Analytics Dashboard Component
function AnalyticsDashboard({ inventory, salesData }) {
    const [timeFrame, setTimeFrame] = useState('Week'); // Week, Month, Year
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const searchContainerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setIsDropdownVisible(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const suggestedProducts = useMemo(() => {
        if (!searchTerm) return [];
        return inventory.filter(item =>
            item.itemNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5);
    }, [searchTerm, inventory]);

    const totalUnitsInStock = useMemo(() => {
        return inventory.reduce((total, item) => total + (item.quantity || 0), 0);
    }, [inventory]);

    const { chartData, totalUnitsSoldForPeriod, chartTitle } = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        let dataMap = new Map();
        let totalUnitsSold = 0;

        switch (timeFrame) {
            case 'Week':
                startDate.setDate(now.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                Array.from({ length: 7 }).forEach((_, i) => { const d = new Date(startDate); d.setDate(d.getDate() + i); dataMap.set(d.toISOString().split('T')[0], { name: d.toLocaleDateString('en-US', { weekday: 'short' }), unitsSold: 0 }); });
                break;
            case 'Month':
                startDate.setDate(now.getDate() - 29);
                startDate.setHours(0, 0, 0, 0);
                 Array.from({ length: 30 }).forEach((_, i) => { const d = new Date(startDate); d.setDate(d.getDate() + i); dataMap.set(d.toISOString().split('T')[0], { name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), unitsSold: 0 }); });
                break;
            case 'Year':
                startDate.setFullYear(now.getFullYear(), now.getMonth() - 11, 1);
                startDate.setHours(0, 0, 0, 0);
                Array.from({ length: 12 }).forEach((_, i) => { const d = new Date(startDate); d.setMonth(d.getMonth() + i); dataMap.set(d.getFullYear() + '-' + String(d.getMonth()).padStart(2,'0'), { name: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), unitsSold: 0 }); });
                break;
            default: break;
        }

        salesData.filter(sale => new Date(sale.timestamp) >= startDate).forEach(sale => {
            const saleDate = new Date(sale.timestamp);
            sale.items.forEach(item => {
                if (!selectedProduct || item.itemNo === selectedProduct.itemNo) {
                    const quantity = item.quantity;
                    totalUnitsSold += quantity;

                    let key;
                    switch (timeFrame) {
                        case 'Week': case 'Month': key = saleDate.toISOString().split('T')[0]; break;
                        case 'Year': key = saleDate.getFullYear() + '-' + String(saleDate.getMonth()).padStart(2,'0'); break;
                        default: return;
                    }

                    if (dataMap.has(key)) {
                        dataMap.get(key).unitsSold += quantity;
                    }
                }
            });
        });

        return {
            chartData: Array.from(dataMap.values()),
            totalUnitsSoldForPeriod: totalUnitsSold,
            chartTitle: selectedProduct ? `Sales for ${selectedProduct.itemNo}` : 'Total Units Sold'
        };
    }, [salesData, timeFrame, selectedProduct]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setIsDropdownVisible(true);
        if (selectedProduct) setSelectedProduct(null);
    };

    const handleSelectProduct = (product) => {
        setSelectedProduct(product);
        setSearchTerm(`${product.itemNo} - ${product.description}`);
        setIsDropdownVisible(false);
    };

    const clearSelection = () => {
        setSelectedProduct(null);
        setSearchTerm('');
    };

    const StatCard = ({ title, value, colorClass }) => (
        <div className="bg-[#2c2c2e] p-6 rounded-lg shadow-md flex flex-col justify-center items-center">
            <h2 className="text-lg font-semibold text-[#8f8e94] mb-2 text-center">{title}</h2>
            <p className={`text-4xl font-bold ${colorClass}`}>{value.toLocaleString()}</p>
        </div>
    );

    const TimeFrameButton = ({ period }) => (
        <button
            onClick={() => setTimeFrame(period)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${timeFrame === period ? 'bg-orange-600 text-white shadow' : 'bg-[#48484a] text-white hover:bg-[#8f8e94]'}`}
        >
            {period}
        </button>
    );

    return (
        <div>
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-white">Analytics</h1>
                <p className="text-[#8f8e94] mt-1">View total sales or search for a product to see item-specific trends.</p>
            </header>

            <div className="bg-[#2c2c2e] rounded-lg shadow-md p-4 mb-8">
                <div className="relative" ref={searchContainerRef}>
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f8e94]" />
                    <input
                        type="text"
                        placeholder="Search by Item No. or Description to filter sales data..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onFocus={() => setIsDropdownVisible(true)}
                        className="w-full p-3 pl-10 bg-[#3a3a3c] border border-[#48484a] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white"
                        autoComplete="off"
                    />
                    {selectedProduct && (
                         <button onClick={clearSelection} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8f8e94] hover:text-white">
                            <XIcon />
                        </button>
                    )}
                    {isDropdownVisible && suggestedProducts.length > 0 && (
                        <ul className="absolute z-10 w-full bg-[#3a3a3c] border border-[#48484a] mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                            {suggestedProducts.map(product => (
                                <li key={product.id} onClick={() => handleSelectProduct(product)} className="p-3 hover:bg-[#636267] cursor-pointer">
                                    <p className="font-semibold">{product.itemNo}</p>
                                    <p className="text-sm text-[#8f8e94]">{product.description}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <StatCard title="Total Units in Stock" value={totalUnitsInStock} colorClass="text-green-500" />
                <StatCard title={`${chartTitle} (${timeFrame})`} value={totalUnitsSoldForPeriod} colorClass="text-orange-500" />
            </div>

            <div className="bg-[#2c2c2e] p-6 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white mb-2 sm:mb-0">{chartTitle}</h2>
                    <div className="flex items-center gap-2 bg-[#3a3a3c] p-1 rounded-lg">
                        <TimeFrameButton period="Week" />
                        <TimeFrameButton period="Month" />
                        <TimeFrameButton period="Year" />
                    </div>
                </div>
                <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#48484a" />
                            <XAxis dataKey="name" tick={{ fill: '#8f8e94', fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fill: '#8f8e94' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#3a3a3c', border: '1px solid #48484a', borderRadius: '0.5rem' }}/>
                            <Legend wrapperStyle={{color: '#8f8e94'}}/>
                            <Line type="monotone" dataKey="unitsSold" stroke="#f97316" strokeWidth={2} activeDot={{ r: 8 }} name="Units Sold" dot={false}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

// Inventory Page Component
function InventoryPage({ inventory, isLoading, handleSeedData, isSeeding, role, setShowAddItemModal, onUpdateItem, itemToEdit, setItemToEdit }) {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredInventory = useMemo(() =>
        inventory
            .filter(item => (item.itemNo?.toLowerCase().includes(searchTerm.toLowerCase()) || item.description?.toLowerCase().includes(searchTerm.toLowerCase())))
            .sort((a, b) => a.itemNo.localeCompare(b.itemNo)),
        [inventory, searchTerm]
    );

    const handleExportToExcel = () => {
        const dataToExport = filteredInventory.map(item => ({
            'Item No.': item.itemNo,
            'Description': item.description,
            'On Hand': item.quantity
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

        worksheet['!cols'] = [
            { wch: 20 },
            { wch: 60 },
            { wch: 15 }
        ];

        XLSX.writeFile(workbook, 'Inventory_Export.xlsx');
    };


    return (
        <div>
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-white">Inventory Overview</h1>
                <p className="text-[#8f8e94] mt-1">View, manage, and export current stock levels.</p>
            </header>
            <div className="bg-[#2c2c2e] rounded-lg shadow-md p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <input type="text" placeholder="Search by Item No. or Description..." className="flex-grow p-3 bg-[#3a3a3c] border border-[#48484a] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {(role === 'admin' || role === 'editor') && (
                        <button
                            onClick={() => setShowAddItemModal(true)}
                            className="p-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition duration-200 flex items-center justify-center gap-2"
                        >
                            <PlusCircleIcon className="h-5 w-5" />
                            <span>Add New Item</span>
                        </button>
                    )}
                    <button
                        onClick={handleExportToExcel}
                        disabled={filteredInventory.length === 0}
                        className="p-3 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition duration-200 disabled:bg-[#48484a] flex items-center justify-center gap-2"
                    >
                        <DownloadIcon className="h-5 w-5" />
                        <span>Export</span>
                    </button>
                    {inventory.length === 0 && !isLoading && role === 'admin' && (
                        <button onClick={handleSeedData} disabled={isSeeding} className="p-3 bg-orange-600 text-white font-semibold rounded-lg shadow-sm hover:bg-orange-700 transition duration-200 disabled:bg-[#48484a]">
                            {isSeeding ? 'Loading...' : 'Load Initial Inventory'}
                        </button>
                    )}
                </div>
                {isLoading ? (
                    <div className="text-center py-10"><p>Loading...</p></div>
                ) : (
                    <InventoryTable
                        items={filteredInventory}
                        onUpdateItem={onUpdateItem}
                        itemToEdit={itemToEdit}
                        setItemToEdit={setItemToEdit}
                        role={role}
                    />
                )}
                {filteredInventory.length === 0 && !isLoading && (
                    <div className="text-center py-10 border-t border-[#48484a] mt-6">
                        <p className="text-[#8f8e94]">{inventory.length === 0 ? "Your inventory is empty. Click 'Load Initial Inventory' to get started." : "No items match your search."}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Log Shipment Page Component
function LogShipmentPage({ onLogShipment, inventory, allShipments, role }) {
    const [shipmentId, setShipmentId] = useState('');
    const [type, setType] = useState('incoming');
    const [shipmentItems, setShipmentItems] = useState([]);
    const [currentItem, setCurrentItem] = useState(null);
    const [currentQty, setCurrentQty] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
    const [isDuplicate, setIsDuplicate] = useState(false); // New state for real-time duplicate check
    const itemSearchRef = useRef();

    // Check for duplicate shipment ID as the user types
    useEffect(() => {
        if (shipmentId.trim() === '') {
            setIsDuplicate(false);
            return;
        }
        const duplicateFound = allShipments.some(s => s.shipmentId === shipmentId.trim());
        setIsDuplicate(duplicateFound);
    }, [shipmentId, allShipments]);

    const filteredItems = useMemo(() =>
        searchTerm
            ? inventory.filter(i =>
                !shipmentItems.some(si => si.itemNo === i.itemNo) &&
                (i.itemNo?.toLowerCase().includes(searchTerm.toLowerCase()) || i.description?.toLowerCase().includes(searchTerm.toLowerCase()))
            ).slice(0, 15)
            : [],
    [searchTerm, inventory, shipmentItems]);

    const handleSelect = (item) => {
        setCurrentItem(item);
        setSearchTerm(`${item.itemNo} - ${item.description}`);
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        if (!currentItem || !currentQty || Number(currentQty) <= 0) {
            // This would be better as a notification banner, but alert is simple for now
            alert("Please select a valid item and enter a positive quantity.");
            return;
        }
        setShipmentItems([...shipmentItems, { ...currentItem, quantity: Number(currentQty) }]);
        setCurrentItem(null);
        setCurrentQty('');
        setSearchTerm('');
        itemSearchRef.current?.focus();
    };

    const handleRemoveItem = (itemNo) => {
        setShipmentItems(shipmentItems.filter(item => item.itemNo !== itemNo));
    };

    const handleLogEntireShipment = () => {
        if (shipmentItems.length === 0 || !shipmentId.trim()) {
            alert("Please add at least one item and provide a Shipment ID.");
            return;
        }

        // Use the state variable for the check
        if (isDuplicate) {
            setShowDuplicateWarning(true);
        } else {
            proceedWithLogging();
        }
    };

    const proceedWithLogging = () => {
        onLogShipment({ items: shipmentItems, shipmentId: shipmentId.trim(), type });
        setShipmentItems([]);
        setShipmentId('');
        setShowDuplicateWarning(false);
    };
    
    const submitButtonText = role === 'submitter' ? 'Submit for Approval' : 'Log Entire Shipment';

    return (
        <div>
            {showDuplicateWarning && (
                <DuplicateShipmentIdModal
                    shipmentId={shipmentId}
                    onConfirm={proceedWithLogging}
                    onCancel={() => setShowDuplicateWarning(false)}
                />
            )}
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-white">Log a Shipment</h1>
                <p className="text-[#8f8e94] mt-1">Build a shipment with multiple items and log it.</p>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#2c2c2e] rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4 text-white">Step 1: Add Items to Shipment</h2>
                    <form onSubmit={handleAddItem} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#8f8e94] mb-1">Search for Item</label>
                            <div className="relative">
                                <input ref={itemSearchRef} type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentItem(null); }} placeholder="Start typing Item No. or Description..." className="w-full p-2 bg-[#3a3a3c] border border-[#48484a] rounded-md text-white" />
                                {filteredItems.length > 0 && !currentItem && (
                                    <ul className="absolute z-10 w-full bg-[#3a3a3c] border border-[#48484a] mt-1 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {filteredItems.map(item => (
                                            <li key={item.id} onClick={() => handleSelect(item)} className="p-2 hover:bg-[#636267] cursor-pointer flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-white">{item.itemNo}</p>
                                                    <p className="text-xs text-[#8f8e94]">{item.description}</p>
                                                </div>
                                                <span className={`font-bold ${item.quantity > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                                    Stock: {item.quantity}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#8f8e94] mb-1">Quantity</label>
                            <input type="number" min="1" value={currentQty} onChange={e => setCurrentQty(e.target.value)} className="w-full p-2 bg-[#3a3a3c] border border-[#48484a] rounded-md text-white" />
                        </div>
                        <button type="submit" disabled={!currentItem || !currentQty} className="w-full p-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 disabled:bg-[#48484a]">Add Item to Shipment</button>
                    </form>
                </div>
                <div className="bg-[#2c2c2e] rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4 text-white">Step 2: Review and Log</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#8f8e94] mb-1">Shipment Type</label>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setType('incoming')} className={`flex-1 p-3 rounded-md flex items-center justify-center gap-2 transition-colors ${type === 'incoming' ? 'bg-green-600 text-white' : 'bg-[#3a3a3c] text-white hover:bg-green-700'}`}><IncomingIcon className="h-5 w-5"/> Incoming</button>
                                <button type="button" onClick={() => setType('outgoing')} className={`flex-1 p-3 rounded-md flex items-center justify-center gap-2 transition-colors ${type === 'outgoing' ? 'bg-red-600 text-white' : 'bg-[#3a3a3c] text-white hover:bg-red-700'}`}><OutgoingIcon className="h-5 w-5"/> Outgoing</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#8f8e94] mb-1">{type === 'incoming' ? 'Invoice Number' : 'Packing Slip ID'}</label>
                            <input
                                type="text"
                                value={shipmentId}
                                onChange={e => setShipmentId(e.target.value)}
                                className={`w-full p-2 bg-[#3a3a3c] border rounded-md text-white transition-all duration-300 ${isDuplicate ? 'border-red-500 ring-2 ring-red-500/50' : 'border-[#48484a] focus:ring-orange-500 focus:border-orange-500'}`}
                                required
                            />
                            {isDuplicate && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <WarningIcon className="h-3 w-3" />
                                    Warning: This Shipment ID already exists.
                                </p>
                            )}
                        </div>
                        <div className="border border-[#48484a] rounded-lg p-3">
                            <h3 className="font-semibold mb-2 text-white">Current Shipment Items ({shipmentItems.length})</h3>
                            <div className="max-h-60 overflow-y-auto">
                                {shipmentItems.length > 0 ? (
                                    <ul className="divide-y divide-[#48484a]">
                                        {shipmentItems.map(item => (
                                            <li key={item.itemNo} className="flex justify-between items-center py-2">
                                                <div>
                                                    <p className="font-semibold">{item.itemNo}</p>
                                                    <p className="text-sm text-[#8f8e94]">{item.description}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold">{item.quantity}</span>
                                                    <button onClick={() => handleRemoveItem(item.itemNo)} className="text-[#8f8e94] hover:text-white"><TrashIcon className="h-5 w-5"/></button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-center text-[#8f8e94] py-4">No items added yet.</p>
                                )}
                            </div>
                        </div>
                        <button onClick={handleLogEntireShipment} disabled={shipmentItems.length === 0 || !shipmentId} className="w-full p-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-[#48484a]">{submitButtonText}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Shipment History Page Component
function ShipmentHistoryPage({ shipments, allShipments, title, type, onDelete, onEdit, role }) {
    const [expandedId, setExpandedId] = useState(null);
    const sortedShipments = useMemo(() => [...shipments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)), [shipments]);
    const toggleExpansion = (id) => setExpandedId(expandedId === id ? null : id);
    const canModify = role === 'admin' || role === 'editor';

    const duplicateShipmentIdSet = useMemo(() => {
        const idCounts = allShipments.reduce((acc, shipment) => {
            if (shipment.shipmentId) {
                 acc[shipment.shipmentId] = (acc[shipment.shipmentId] || 0) + 1;
            }
            return acc;
        }, {});
        return new Set(Object.keys(idCounts).filter(id => idCounts[id] > 1));
    }, [allShipments]);

    return (
        <div>
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-white">{title}</h1>
                <p className="text-[#8f8e94] mt-1">A log of all recorded shipments.</p>
            </header>
            <div className="bg-[#2c2c2e] rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#48484a]">
                        <thead className="bg-[#3a3a3c]">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider w-12"></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">Shipment ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">Item Count</th>
                                {canModify && <th className="px-6 py-3 text-right text-xs font-medium text-[#8f8e94] uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-[#2c2c2e] divide-y divide-[#48484a]">
                            {sortedShipments.length > 0 ? sortedShipments.map(shipment => (
                                <React.Fragment key={shipment.id}>
                                    <tr className="hover:bg-[#3a3a3c]">
                                        <td className="px-6 py-4 cursor-pointer" onClick={() => toggleExpansion(shipment.id)}><ChevronDown className={`transition-transform ${expandedId === shipment.id ? 'rotate-180' : ''}`} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer" onClick={() => toggleExpansion(shipment.id)}>{new Date(shipment.timestamp).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium cursor-pointer" onClick={() => toggleExpansion(shipment.id)}>
                                            <div className="flex items-center gap-2">
                                                {duplicateShipmentIdSet.has(shipment.shipmentId) && (
                                                    <WarningIcon className="h-5 w-5 text-red-500" title="This shipment ID is used more than once."/>
                                                )}
                                                <span>{shipment.shipmentId}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm cursor-pointer" onClick={() => toggleExpansion(shipment.id)}>{shipment.items.length}</td>
                                        {canModify && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => onEdit(shipment, type)} className="text-orange-500 hover:text-orange-400 mr-4"><EditIcon className="h-5 w-5"/></button>
                                                <button onClick={() => onDelete(shipment, type)} className="text-[#8f8e94] hover:text-white"><TrashIcon className="h-5 w-5"/></button>
                                            </td>
                                        )}
                                    </tr>
                                    {expandedId === shipment.id && (
                                        <tr>
                                            <td colSpan={canModify ? 5 : 4} className="p-4 bg-[#3a3a3c]">
                                                <div className="p-4 bg-[#2c2c2e] rounded-md border border-[#48484a]">
                                                    <h4 className="font-bold mb-2 text-white">Items in Shipment {shipment.shipmentId}:</h4>
                                                    <table className="min-w-full">
                                                        <thead className="border-b border-[#48484a]">
                                                            <tr>
                                                                <th className="py-2 text-left text-sm font-semibold text-[#8f8e94]">Item No.</th>
                                                                <th className="py-2 text-left text-sm font-semibold text-[#8f8e94]">Description</th>
                                                                <th className="py-2 text-left text-sm font-semibold text-[#8f8e94]">Quantity</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {shipment.items.map(item => (
                                                                <tr key={item.itemNo} className="border-b border-[#48484a]">
                                                                    <td className="py-2 text-white">{item.itemNo}</td>
                                                                    <td className="py-2 text-white">{item.description}</td>
                                                                    <td className={`py-2 font-bold ${shipment.type === 'incoming' ? 'text-white' : 'text-white'}`}>
                                                                        {shipment.type === 'incoming' ? '+' : '-'}{item.quantity}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            )) : (
                                <tr>
                                    <td colSpan={canModify ? 5 : 4} className="text-center py-10 text-[#8f8e94]">No shipments recorded yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Inventory Table Component
function InventoryTable({ items, onUpdateItem, itemToEdit, setItemToEdit, role }) {
    const [editFormData, setEditFormData] = useState({});

    const handleEditClick = (item) => {
        setItemToEdit(item.id);
        setEditFormData({
            itemNo: item.itemNo,
            description: item.description,
            quantity: item.quantity
        });
    };

    const handleCancelClick = () => {
        setItemToEdit(null);
    };

    const handleSaveClick = (itemId) => {
        onUpdateItem(itemId, {
            itemNo: editFormData.itemNo,
            description: editFormData.description,
            quantity: Number(editFormData.quantity)
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const canEdit = role === 'admin' || role === 'editor';

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#48484a]">
                <thead className="bg-[#3a3a3c]">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">Item No.</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider">Description</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[#8f8e94] uppercase tracking-wider w-32">On Hand</th>
                        {canEdit && <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[#8f8e94] uppercase tracking-wider">Actions</th>}
                    </tr>
                </thead>
                <tbody className="bg-[#2c2c2e] divide-y divide-[#48484a]">
                    {items.map(item => (
                        <tr key={item.id} className="hover:bg-[#3a3a3c]">
                            {itemToEdit === item.id ? (
                                <>
                                    <td className="px-6 py-4">
                                        <input type="text" name="itemNo" value={editFormData.itemNo} onChange={handleInputChange} className="w-full p-1 bg-[#48484a] border border-[#636267] rounded-md text-white"/>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input type="text" name="description" value={editFormData.description} onChange={handleInputChange} className="w-full p-1 bg-[#48484a] border border-[#636267] rounded-md text-white"/>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input type="number" name="quantity" value={editFormData.quantity} onChange={handleInputChange} className="w-24 p-1 bg-[#48484a] border border-[#636267] rounded-md text-white"/>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleSaveClick(item.id)} className="text-green-500 hover:text-green-400 mr-4">Save</button>
                                        <button onClick={handleCancelClick} className="text-[#8f8e94] hover:text-white">Cancel</button>
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.itemNo}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-[#8f8e94]">{item.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-bold">{item.quantity}</td>
                                    {canEdit && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleEditClick(item)} className="text-orange-500 hover:text-orange-400">
                                                <EditIcon className="h-5 w-5"/>
                                            </button>
                                        </td>
                                    )}
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


// Notification Banner Component
function NotificationBanner({ notification, setNotification }) {
    useEffect(() => {
        const timer = setTimeout(() => setNotification({ ...notification, show: false }), 5000);
        return () => clearTimeout(timer);
    }, [notification, setNotification]);

    if (!notification.show) return null;

    const typeClasses = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-yellow-500 text-black'
    };

    return (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 transition-transform transform ${notification.show ? 'translate-x-0' : 'translate-x-full'} ${typeClasses[notification.type]}`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification({ ...notification, show: false })} className="font-bold text-lg">&times;</button>
        </div>
    );
}

// Confirmation Modal for Deleting Shipments
function ConfirmDeleteModal({ onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center">
            <div className="bg-[#3a3a3c] rounded-lg p-8 shadow-2xl max-w-md w-full m-4">
                <div className="flex items-start gap-4">
                    <div className="bg-[#2c2c2e] p-3 rounded-full mt-1">
                        <WarningIcon className="text-white"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Delete Shipment</h3>
                        <p className="text-[#8f8e94] text-sm mt-2">Are you sure you want to delete this shipment? This action cannot be undone and will reverse the associated stock changes in your inventory.</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-[#48484a] hover:bg-[#8f8e94] text-white font-semibold transition">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition">Confirm Delete</button>
                </div>
            </div>
        </div>
    );
}

// SCANNING COMPONENT
function ScanShipmentPage({ onLogShipment, inventory, role }) {
    const [image, setImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [rawText, setRawText] = useState('');
    const [extractedData, setExtractedData] = useState(null);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);
    const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
    const searchContainerRef = useRef(null);
    
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setActiveDropdownIndex(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredInventoryForDropdown = useMemo(() => {
        if (activeDropdownIndex === null || !extractedData) return [];
        const searchInput = extractedData.items[activeDropdownIndex]?.itemNo || '';
        if (!searchInput) {
            return inventory.slice(0, 20);
        }
        return inventory.filter(invItem => 
            invItem.itemNo.toLowerCase().includes(searchInput.toLowerCase()) || 
            invItem.description.toLowerCase().includes(searchInput.toLowerCase())
        ).slice(0, 20);
    }, [activeDropdownIndex, extractedData, inventory]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(URL.createObjectURL(file));
            setExtractedData(null);
            setRawText('');
            setError('');
        }
    };

    const matchItemsWithInventory = (scannedItems, inventoryData) => {
        const matchedItems = [];
        const usedInventoryIds = new Set();
        scannedItems.forEach(scannedItem => {
            let bestMatch = null;
            let highestScore = 0;
            const scannedItemNo = scannedItem.itemNo?.trim();
            const scannedDescWords = new Set((scannedItem.description?.toLowerCase().match(/\w{3,}/g) || []));
            inventoryData.forEach(inventoryItem => {
                if (usedInventoryIds.has(inventoryItem.id)) return;
                let currentScore = 0;
                if (scannedItemNo && inventoryItem.itemNo === scannedItemNo) {
                    currentScore = 100;
                } else if (scannedDescWords.size > 0) {
                    const inventoryDescWords = new Set(inventoryItem.description.toLowerCase().match(/\w{3,}/g) || []);
                    const intersection = new Set([...scannedDescWords].filter(x => inventoryDescWords.has(x)));
                    currentScore = intersection.size;
                }
                if (currentScore > highestScore) {
                    highestScore = currentScore;
                    bestMatch = inventoryItem;
                }
            });
            if (bestMatch && (highestScore >= 2 || highestScore === 100)) {
                usedInventoryIds.add(bestMatch.id);
                matchedItems.push({ ...bestMatch, quantity: scannedItem.quantity });
            }
        });
        return matchedItems;
    };
    
    const parseOcrData = (data) => {
        const { lines } = data;
        let shipmentId = '';
        const items = [];
        const slipNoMatch = data.text.match(/(?:(?:Slip|Order) No\.\:?)\s*(\S+)|(\b(?:20\d{6}|50\d{8})\b)/i);
        if (slipNoMatch) shipmentId = slipNoMatch[1] || slipNoMatch[2];
        const itemLineWithCode = /^([\w.-]+)\s+(.*?)\s+(\d+)$/;
        const itemLineSimple = /^(.*?)\s+(\d+)$/;
        const headerKeywords = /item|description|quantity|qty|unit/i;
        const footerKeywords = /thank|comment|subtotal|total|authorized/i;
        let inTable = false;
        for (const line of lines) {
            const lineText = line.text.trim();
            if (footerKeywords.test(lineText.toLowerCase())) break;
            if (!inTable && headerKeywords.test(lineText.toLowerCase())) {
                inTable = true;
                continue;
            }
            if (!inTable) {
                if(itemLineWithCode.test(lineText) || itemLineSimple.test(lineText)) {
                    inTable = true;
                } else {
                    continue;
                }
            }
            let match = lineText.match(itemLineWithCode);
            if (match) {
                const [, itemNo, description, quantity] = match;
                if (!isNaN(parseInt(quantity, 10))) {
                    items.push({ itemNo: itemNo.trim(), description: description.trim(), quantity: parseInt(quantity, 10) });
                }
            } else {
                match = lineText.match(itemLineSimple);
                if (match) {
                    const [, description, quantity] = match;
                    if (description.length > 3 && !headerKeywords.test(description.toLowerCase()) && !isNaN(parseInt(quantity, 10))) {
                        items.push({ itemNo: 'N/A', description: description.trim(), quantity: parseInt(quantity, 10) });
                    }
                }
            }
        }
        return { shipmentId: shipmentId || 'N/A', items, type: 'outgoing' };
    };

    const processImage = async () => {
        if (!image) { setError('Please select an image first.'); return; }
        setIsProcessing(true);
        setProgress(0);
        setError('');
        setRawText('');
        try {
            const { data } = await Tesseract.recognize(image, 'eng', { logger: m => { if (m.status === 'recognizing text') { setProgress(parseInt(m.progress * 100, 10)); } } });
            setRawText(data.text);
            const parsedResult = parseOcrData(data);
            const matchedItems = matchItemsWithInventory(parsedResult.items, inventory);
            setExtractedData({ shipmentId: parsedResult.shipmentId, items: matchedItems, type: 'outgoing' });
        } catch (err) {
            setError('Could not process the image. Please try again with a clearer picture.');
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...extractedData.items];
        const newValue = field === 'quantity' ? parseInt(value, 10) || 0 : value;
        updatedItems[index] = { ...updatedItems[index], [field]: newValue };
        setExtractedData({ ...extractedData, items: updatedItems });
    };

    const handleSelectFromDropdown = (selectedInventoryItem, index) => {
        const updatedItems = [...extractedData.items];
        const currentItem = updatedItems[index];
        updatedItems[index] = {
            ...currentItem,
            id: selectedInventoryItem.id,
            itemNo: selectedInventoryItem.itemNo,
            description: selectedInventoryItem.description
        };
        setExtractedData({ ...extractedData, items: updatedItems });
        setActiveDropdownIndex(null);
    };

    const handleAddItemManually = () => {
        const newItem = { id: `manual-${Date.now()}`, itemNo: '', description: '', quantity: 1 };
        if (extractedData) {
            setExtractedData({ ...extractedData, items: [...extractedData.items, newItem] });
        } else {
             setExtractedData({ shipmentId: '', items: [newItem], type: 'outgoing' });
        }
    };

    const handleRemoveItem = (indexToRemove) => {
        setExtractedData({ ...extractedData, items: extractedData.items.filter((_, index) => index !== indexToRemove) });
    };
    
    const handleLogApprovedShipment = () => {
        if (!extractedData || !extractedData.shipmentId || extractedData.items.some(i => !i.itemNo || i.quantity <= 0)) {
            setError('Cannot log shipment. Please ensure all items have an Item No. and a valid quantity.');
            return;
        }
        onLogShipment(extractedData);
        setImage(null);
        setExtractedData(null);
        setRawText('');
    };
    
    const submitButtonText = role === 'submitter' ? 'Submit for Approval' : 'Approve and Log Shipment';


    return (
        <div>
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-white">Scan Packing Slip</h1>
                <p className="text-[#8f8e94] mt-1">Upload a photo to automatically populate shipment details.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#2c2c2e] rounded-lg shadow-md p-6 space-y-4">
                    <h2 className="text-xl font-bold text-white">Step 1: Upload Image</h2>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" ref={fileInputRef} />
                    <button onClick={() => fileInputRef.current.click()} className="w-full p-3 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700">Choose a Picture</button>
                    {image && <div className="mt-4 border-2 border-dashed border-[#48484a] p-2 rounded-lg"><img src={image} alt="Packing Slip Preview" className="w-full h-auto rounded-md" /></div>}
                    <button onClick={processImage} disabled={isProcessing || !image} className="w-full p-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-[#48484a]">{isProcessing ? `Processing... ${progress}%` : 'Extract & Match Details'}</button>
                    {isProcessing && <div className="w-full bg-[#48484a] rounded-full h-2.5"><div className="bg-orange-600 h-2.5 rounded-full" style={{width: `${progress}%`}}></div></div>}
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                </div>

                <div className="bg-[#2c2c2e] rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold text-white mb-4">Step 2: Review Details</h2>
                    {extractedData ? (
                        <div className="flex flex-col h-full">
                            <div className="flex-grow space-y-4 overflow-y-auto pr-2">
                                <div>
                                    <label className="block text-sm font-medium text-[#8f8e94] mb-1">Packing Slip / Order ID</label>
                                    <input type="text" value={extractedData.shipmentId} onChange={e => setExtractedData({...extractedData, shipmentId: e.target.value})} className="w-full p-2 bg-[#3a3a3c] border border-[#48484a] rounded-md text-white" />
                                </div>
                                <h3 className="font-semibold text-white pt-4">Matched Items ({extractedData.items.length}):</h3>
                                <div className="space-y-3">
                                    {extractedData.items.length > 0 ? (
                                        extractedData.items.map((item, index) => (
                                            <div key={item.id || index} className="p-3 bg-[#48484a] rounded-md space-y-2" ref={activeDropdownIndex === index ? searchContainerRef : null}>
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs text-[#8f8e94]">Item No.</label>
                                                    <button onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-300"><TrashIcon className="h-4 w-4"/></button>
                                                </div>
                                                <div className="relative">
                                                    <input type="text" value={item.itemNo} onFocus={() => setActiveDropdownIndex(index)} onChange={e => handleItemChange(index, 'itemNo', e.target.value)} className="w-full p-1 bg-[#2c2c2e] border border-[#636267] rounded-md text-white font-semibold" placeholder="Enter or Search Item No." autoComplete="off"/>
                                                    {activeDropdownIndex === index && filteredInventoryForDropdown.length > 0 && (
                                                        <ul className="absolute z-10 w-full mt-1 bg-[#3a3a3c] border border-[#636267] rounded-md shadow-lg max-h-40 overflow-auto">
                                                            {filteredInventoryForDropdown.map(invItem => (
                                                                <li key={invItem.id} onClick={() => handleSelectFromDropdown(invItem, index)} className="p-2 hover:bg-[#636267] cursor-pointer">
                                                                    <p className="font-semibold">{invItem.itemNo}</p>
                                                                    <p className="text-xs text-[#8f8e94]">{invItem.description}</p>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                                <label className="text-xs text-[#8f8e94]">Description</label>
                                                <input type="text" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="w-full p-1 bg-[#2c2c2e] border border-[#636267] rounded-md text-white" placeholder="Enter Description"/>
                                                <label className="text-xs text-[#8f8e94]">Quantity</label>
                                                <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full p-1 bg-[#2c2c2e] border border-[#636267] rounded-md text-white"/>
                                            </div>
                                        ))
                                    ) : (
                                        <p className='text-center text-yellow-400 p-4'>No items were automatically matched. Check the image quality or add items manually.</p>
                                    )}
                                </div>
                                <button onClick={handleAddItemManually} className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-[#48484a] text-white font-semibold rounded-md hover:bg-[#636267]">
                                    <PlusCircleIcon className="h-5 w-5"/> Add Item Manually
                                </button>
                            </div>
                            <div className="mt-auto pt-4">
                                <button onClick={handleLogApprovedShipment} className="w-full p-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-[#48484a]">{submitButtonText}</button>
                            </div>
                        </div>
                    ) : ( <div className="flex items-center justify-center h-full text-[#8f8e94]"><p>Matched data will appear here for your review.</p></div> )}
                </div>
            </div>

            {rawText && ( <div className="mt-8 bg-[#2c2c2e] rounded-lg shadow-md p-6"><h3 className="text-lg font-bold text-white mb-2">Raw OCR Output (For Debugging)</h3><textarea readOnly className="w-full h-48 p-2 bg-[#3a3a3c] border border-[#48484a] rounded-md text-white font-mono text-xs" value={rawText}/></div> )}
        </div>
    );
}

// Modal for Editing a Shipment
function EditShipmentModal({ shipment, onUpdate, onCancel, inventory }) {
    const [shipmentId, setShipmentId] = useState(shipment.shipmentId);
    const [items, setItems] = useState([...shipment.items]);
    const [currentItem, setCurrentItem] = useState(null);
    const [currentQty, setCurrentQty] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [type, setType] = useState(shipment.type);
    const itemSearchRef = useRef();

    const availableInventory = useMemo(() => inventory.filter(i => !items.some(si => si.itemNo === i.itemNo)), [inventory, items]);
    const filteredItems = useMemo(() => searchTerm ? availableInventory.filter(i => (i.itemNo.toLowerCase().includes(searchTerm.toLowerCase()) || i.description.toLowerCase().includes(searchTerm.toLowerCase()))).slice(0, 20) : [], [searchTerm, availableInventory]);

    const handleSelect = (item) => {
        setCurrentItem(item);
        setSearchTerm(`${item.itemNo} - ${item.description}`);
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        if (!currentItem || !currentQty || Number(currentQty) <= 0) return;
        setItems([...items, { ...currentItem, quantity: Number(currentQty) }]);
        setCurrentItem(null);
        setCurrentQty('');
        setSearchTerm('');
        itemSearchRef.current?.focus();
    };

    const handleRemoveItem = (itemNo) => {
        setItems(items.filter(item => item.itemNo !== itemNo));
    };

    const handleUpdateQty = (itemNo, newQty) => {
        const numQty = Number(newQty);
        if (numQty <= 0) {
            handleRemoveItem(itemNo);
        } else {
            setItems(items.map(item => item.itemNo === itemNo ? { ...item, quantity: numQty } : item));
        }
    };

    const handleSaveChanges = () => {
        onUpdate({
            originalShipment: shipment,
            newItems: items,
            newShipmentId: shipmentId,
            newType: type,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4">
            <div className="bg-[#3a3a3c] rounded-lg shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
                <header className="p-6 border-b border-[#48484a]">
                    <h2 className="text-2xl font-bold text-white">Edit Shipment: {shipment.shipmentId}</h2>
                </header>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Items in Shipment</h3>
                        <div className="space-y-3 pr-2">
                            {items.map(item => (
                                <div key={item.itemNo} className="flex items-center gap-4 p-3 bg-[#48484a] rounded-md">
                                    <div className="flex-grow">
                                        <p className="font-semibold text-white">{item.itemNo}</p>
                                        <p className="text-sm text-[#8f8e94]">{item.description}</p>
                                    </div>
                                    <input type="number" value={item.quantity} onChange={(e) => handleUpdateQty(item.itemNo, e.target.value)} className="w-20 p-1 border border-[#636267] bg-[#2c2c2e] rounded-md text-center text-white" />
                                    <button onClick={() => handleRemoveItem(item.itemNo)} className="text-[#8f8e94] hover:text-white"><TrashIcon className="h-5 w-5"/></button>
                                </div>
                            ))}
                            {items.length === 0 && <p className="text-[#8f8e94] text-center py-4">No items in this shipment.</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-white">Add New Item</h3>
                        <form onSubmit={handleAddItem} className="space-y-4 p-4 border border-[#48484a] rounded-lg bg-[#2c2c2e]">
                            <div>
                                <label className="block text-sm font-medium text-[#8f8e94] mb-1">Search for Item</label>
                                <div className="relative">
                                    <input ref={itemSearchRef} type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentItem(null); }} placeholder="Start typing..." className="w-full p-2 bg-[#3a3a3c] border border-[#48484a] rounded-md text-white" />
                                    {filteredItems.length > 0 && !currentItem && (
                                        <ul className="absolute z-10 w-full bg-[#48484a] border border-[#636267] mt-1 rounded-md shadow-lg max-h-40 overflow-auto">
                                            {filteredItems.map(item => (
                                                <li key={item.id} onClick={() => handleSelect(item)} className="p-2 hover:bg-[#8f8e94] cursor-pointer text-white">{item.itemNo} - {item.description}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#8f8e94] mb-1">Quantity</label>
                                <input type="number" min="1" value={currentQty} onChange={e => setCurrentQty(e.target.value)} className="w-full p-2 bg-[#3a3a3c] border border-[#48484a] rounded-md text-white" />
                            </div>
                            <button type="submit" disabled={!currentItem || !currentQty} className="w-full p-2 bg-orange-600 text-white font-semibold rounded-md hover:bg-orange-700 disabled:bg-[#48484a]">Add Item</button>
                        </form>
                    </div>
                </div>
                <footer className="p-6 border-t border-[#48484a] mt-auto flex justify-between items-center">
                    <div className="flex gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium text-[#8f8e94] mb-1">Shipment ID</label>
                            <input type="text" value={shipmentId} onChange={e => setShipmentId(e.target.value)} className="p-2 bg-[#48484a] border border-[#636267] rounded-md text-white"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[#8f8e94] mb-1">Type</label>
                            <div className="flex rounded-md shadow-sm">
                                <button type="button" onClick={()=> setType('incoming')} className={`transition-colors px-4 py-2 text-sm font-medium rounded-l-md border border-[#636267] ${type === 'incoming' ? 'bg-green-600 text-white' : 'bg-[#48484a] text-white hover:bg-green-700'}`}>Incoming</button>
                                <button type="button" onClick={()=> setType('outgoing')} className={`transition-colors -ml-px px-4 py-2 text-sm font-medium rounded-r-md border border-[#636267] ${type === 'outgoing' ? 'bg-red-600 text-white' : 'bg-[#48484a] text-white hover:bg-red-700'}`}>Outgoing</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onCancel} className="px-6 py-2 rounded-lg bg-[#48484a] hover:bg-[#8f8e94] text-white font-semibold transition">Cancel</button>
                        <button onClick={handleSaveChanges} className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition">Save Changes</button>
                    </div>
                </footer>
            </div>
        </div>
    );
}

// Modal for Adding a New Inventory Item
function AddItemModal({ onAdd, onCancel, inventory }) {
    const [itemNo, setItemNo] = useState('');
    const [description, setDescription] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!itemNo.trim() || !description.trim()) {
            setError('Item Number and Description are required.');
            return;
        }
        if (inventory.some(item => item.itemNo.toLowerCase() === itemNo.trim().toLowerCase())) {
            setError('This Item Number already exists.');
            return;
        }
        onAdd({ itemNo: itemNo.trim(), description: description.trim(), quantity: Number(quantity) });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4">
            <div className="bg-[#3a3a3c] rounded-lg shadow-2xl max-w-lg w-full">
                <form onSubmit={handleSubmit}>
                    <header className="p-6 border-b border-[#48484a]">
                        <h2 className="text-2xl font-bold text-white">Add New Inventory Item</h2>
                    </header>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="itemNo" className="block text-sm font-medium text-[#8f8e94]">Item No.</label>
                            <input
                                id="itemNo"
                                type="text"
                                value={itemNo}
                                onChange={(e) => setItemNo(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-[#48484a] border border-[#636267] rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-[#8f8e94]">Description</label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                className="mt-1 block w-full px-3 py-2 bg-[#48484a] border border-[#636267] rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-[#8f8e94]">On Hand Quantity</label>
                            <input
                                id="quantity"
                                type="number"
                                min="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-[#48484a] border border-[#636267] rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-white"
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm">{error}</p>}
                    </div>
                    <footer className="p-6 flex justify-end gap-4 bg-[#2c2c2e] rounded-b-lg">
                        <button type="button" onClick={onCancel} className="px-6 py-2 rounded-lg bg-[#48484a] hover:bg-[#8f8e94] text-white font-semibold transition">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition">Add Item</button>
                    </footer>
                </form>
            </div>
        </div>
    );
}

// Modal for Duplicate Shipment ID Warning
function DuplicateShipmentIdModal({ onConfirm, onCancel, shipmentId }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center">
            <div className="bg-[#3a3a3c] rounded-lg p-8 shadow-2xl max-w-md w-full m-4">
                <div className="flex items-start gap-4">
                    <div className="bg-yellow-500 p-3 rounded-full mt-1">
                        <WarningIcon className="text-black"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Duplicate Shipment ID</h3>
                        <p className="text-[#8f8e94] text-sm mt-2">
                            A shipment with the ID <span className="font-bold text-white font-mono bg-[#48484a] px-1 rounded">{shipmentId}</span> already exists.
                            This may be a mistake.
                        </p>
                        <p className="text-[#8f8e94] text-sm mt-2">Are you sure you want to log it anyway?</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-[#48484a] hover:bg-[#636267] text-white font-semibold transition">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition">Proceed Anyway</button>
                </div>
            </div>
        </div>
    );
}
