import React, { useState, useEffect, useMemo } from 'react';
import { SearchIcon, PackageIcon, AlertCircle, Download, Eye, Package, TruckIcon, Calendar, DollarSign, MapPin, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface InventoryItem {
  sku: string;
  name: string;
  category: string | null;
  qty_on_hand: number;
  uom: string;
  location: string | null;
  unit_cost: number | null;
  sell_price: number | null;
  external_id: string | null;
  notes: string | null;
  min_qty: number;
  classification: 'stocking' | 'non-stocking';
  created_at: string;
  updated_at: string;
}

export function InventorySearchPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [recentShipments, setRecentShipments] = useState<any[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    qty_on_hand: 0,
    min_qty: 0,
    notes: '',
    classification: 'stocking' as 'stocking' | 'non-stocking'
  });
  const [newItemFormData, setNewItemFormData] = useState({
    sku: '',
    name: '',
    category: '',
    qty_on_hand: 0,
    min_qty: 0,
    uom: 'ea',
    location: '',
    unit_cost: '',
    sell_price: '',
    external_id: '',
    notes: '',
    classification: 'stocking' as 'stocking' | 'non-stocking'
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('sku');

      if (error) throw error;
      setInventory((data as InventoryItem[]) || []);
    } catch (err: any) {
      console.error('Error loading inventory:', err);
      setError(err.message || 'Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditFormData({
      qty_on_hand: item.qty_on_hand,
      min_qty: item.min_qty || 0,
      notes: item.notes || '',
      classification: item.classification
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          qty_on_hand: editFormData.qty_on_hand,
          min_qty: editFormData.min_qty,
          notes: editFormData.notes || null,
          classification: editFormData.classification
        })
        .eq('sku', editingItem.sku);

      if (error) throw error;
      
      setEditingItem(null);
      loadInventory(); // Reload to get updated data
    } catch (err: any) {
      console.error('Error updating inventory:', err);
      setError(err.message || 'Failed to update inventory');
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditFormData({
      qty_on_hand: 0,
      min_qty: 0,
      notes: '',
      classification: 'stocking'
    });
  };

  const viewItemDetails = async (item: InventoryItem) => {
    setViewingItem(item);
    setLoadingShipments(true);
    
    try {
      // Query shipments where the items array contains the SKU
      const { data: shipments, error } = await supabase
        .from('shipments')
        .select('*')
        .contains('items', [{ itemNo: item.sku }])
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentShipments(shipments || []);
    } catch (err: any) {
      console.error('Error loading shipments:', err);
      setRecentShipments([]);
    } finally {
      setLoadingShipments(false);
    }
  };

  const closeItemDetails = () => {
    setViewingItem(null);
    setRecentShipments([]);
  };

  const handleAddNewItem = async () => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('inventory')
        .insert({
          sku: newItemFormData.sku,
          name: newItemFormData.name,
          category: newItemFormData.category || null,
          qty_on_hand: newItemFormData.qty_on_hand,
          min_qty: newItemFormData.min_qty,
          uom: newItemFormData.uom,
          location: newItemFormData.location || null,
          unit_cost: newItemFormData.unit_cost ? parseFloat(newItemFormData.unit_cost) : null,
          sell_price: newItemFormData.sell_price ? parseFloat(newItemFormData.sell_price) : null,
          external_id: newItemFormData.external_id || null,
          notes: newItemFormData.notes || null,
          classification: newItemFormData.classification
        });

      if (error) throw error;
      
      setShowAddModal(false);
      setNewItemFormData({
        sku: '',
        name: '',
        category: '',
        qty_on_hand: 0,
        min_qty: 0,
        uom: 'ea',
        location: '',
        unit_cost: '',
        sell_price: '',
        external_id: '',
        notes: '',
        classification: 'stocking'
      });
      loadInventory();
    } catch (err: any) {
      console.error('Error adding new item:', err);
      setError(err.message || 'Failed to add new item');
    }
  };

  const getStockColor = (item: InventoryItem) => {
    // Non-stocking items out of stock should be grey
    if (item.classification === 'non-stocking' && item.qty_on_hand === 0) {
      return 'text-muted-foreground';
    }
    // Regular stocking items follow normal color rules
    if (item.qty_on_hand === 0) return 'text-destructive';
    if (item.qty_on_hand <= (item.min_qty || 0)) return 'text-warning';
    return 'text-status-high';
  };

  const getStockBadgeColor = (item: InventoryItem) => {
    // Non-stocking items out of stock should be grey
    if (item.classification === 'non-stocking' && item.qty_on_hand === 0) {
      return 'bg-muted text-muted-foreground';
    }
    // Regular stocking items follow normal color rules
    if (item.qty_on_hand === 0) return 'bg-destructive/20 text-destructive';
    if (item.qty_on_hand <= (item.min_qty || 0)) return 'bg-warning/20 text-warning';
    return 'bg-status-high/20 text-status-high';
  };

  const exportToCSV = () => {
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
      ...filteredInventory.map(item => {
        const status = item.qty_on_hand === 0 ? 'Out of Stock' :
                      item.qty_on_hand <= (item.min_qty || 0) ? 'Low Stock' : 'In Stock';
        
        return [
          `"${item.sku}"`,
          `"${item.name || ''}"`,
          `"${item.category || ''}"`,
          item.qty_on_hand,
          item.min_qty || 0,
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
  };

  const filteredInventory = useMemo(() => {
    if (!searchTerm.trim()) return inventory;
    
    const search = searchTerm.toLowerCase();
    return inventory.filter(item => 
      item.sku.toLowerCase().includes(search) ||
      (item.name && item.name.toLowerCase().includes(search))
    );
  }, [inventory, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <PackageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-destructive font-medium">Error loading inventory</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <button 
            onClick={loadInventory}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Inventory Management
          </h1>
          <p className="text-muted-foreground text-lg">
            {filteredInventory.length} items {searchTerm && `(filtered from ${inventory.length})`}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/90 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Package className="h-5 w-5" />
            <span className="hidden sm:inline">Add Item</span>
          </button>
          <button
            onClick={exportToCSV}
            className="hidden lg:flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all duration-300 shadow-md hover:shadow-lg"
          >
            <Download className="h-5 w-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="relative max-w-lg animate-scale-in">
        <SearchIcon className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-primary" />
        <input
          type="text"
          placeholder="Search by SKU or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-4 border-2 border-border rounded-xl bg-card/80 backdrop-blur-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 text-lg font-medium shadow-md"
        />
        <div className="absolute inset-0 bg-gradient-accent opacity-50 rounded-xl -z-10 blur-sm"></div>
      </div>

      {/* Inventory - Mobile list and Desktop table */}
      <div className="card shadow-elegant animate-fade-in" style={{ animationDelay: '0.2s' }}>
        {/* Mobile list (default) */}
        <div className="md:hidden divide-y divide-border">
          {filteredInventory.map((item, index) => (
            <div 
              key={item.sku} 
              className="flex items-center justify-between px-6 py-5 hover:bg-gradient-accent transition-all duration-300 group cursor-pointer"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => viewItemDetails(item)}
            >
              <div className="min-w-0 pr-4 flex-1">
                <div className="font-mono text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                  {item.sku}
                </div>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                  {item.name}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className={`text-2xl font-extrabold transition-all duration-300 ${getStockColor(item)}`}>
                  {item.qty_on_hand.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">
                  {item.qty_on_hand === 0 ? 'Out of Stock' :
                   item.qty_on_hand <= (item.min_qty || 0) ? 'Low Stock' : 'In Stock'}
                </div>
              </div>
            </div>
          ))}

          {filteredInventory.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <PackageIcon className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-40" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? 'No items found' : 'No inventory items'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding items to your inventory'}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="btn-primary px-6 py-3"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-gradient-accent">
                <th className="text-left py-6 px-6 font-bold text-foreground text-lg">Product Code</th>
                <th className="text-left py-6 px-6 font-bold text-foreground text-lg">Description</th>
                <th className="text-center py-6 px-6 font-bold text-foreground text-lg">Stock Level</th>
                <th className="text-center py-6 px-6 font-bold text-foreground text-lg">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item, index) => (
                <tr 
                  key={item.sku} 
                  className="border-b border-border hover:bg-gradient-accent transition-all duration-300 group animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => viewItemDetails(item)}
                >
                  <td className="py-6 px-6">
                    <div className="font-mono text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                      {item.sku}
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="text-foreground font-medium text-base leading-relaxed">
                      {item.name}
                    </div>
                  </td>
                  <td className="py-6 px-6 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`text-2xl font-bold transition-all duration-300 ${getStockColor(item)}`}>
                        {item.qty_on_hand.toLocaleString()}
                      </div>
                      <div className={`text-xs font-semibold px-3 py-1 rounded-full ${getStockBadgeColor(item)}`}>
                        {item.qty_on_hand === 0 ? 'Out of Stock' :
                         item.qty_on_hand <= (item.min_qty || 0) ? 'Low Stock' : 'In Stock'}
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewItemDetails(item);
                        }}
                        className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(item);
                        }}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInventory.length === 0 && (
            <div className="text-center py-20 animate-fade-in">
              <PackageIcon className="h-20 w-20 mx-auto mb-6 text-muted-foreground opacity-40" />
              <h3 className="text-2xl font-semibold text-foreground mb-3">
                {searchTerm ? 'No items found' : 'No inventory items'}
              </h3>
              <p className="text-muted-foreground text-lg mb-8">
                {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding items to your inventory'}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="btn-primary px-8 py-4 text-lg"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{viewingItem.sku}</h3>
                  <p className="text-muted-foreground">{viewingItem.name}</p>
                </div>
              </div>
              <button
                onClick={closeItemDetails}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Product Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Stock Level</span>
                    </div>
                    <div className={`text-2xl font-bold ${getStockColor(viewingItem)}`}>
                      {viewingItem.qty_on_hand.toLocaleString()} {viewingItem.uom}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Min: {viewingItem.min_qty || 0} • {viewingItem.classification === 'non-stocking' ? 'Non-Stocking' : 'Stocking'}
                    </p>
                  </div>

                {viewingItem.unit_cost && (
                  <div className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Unit Cost</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      ${viewingItem.unit_cost.toFixed(2)}
                    </div>
                  </div>
                )}

                {viewingItem.sell_price && (
                  <div className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Sell Price</span>
                    </div>
                    <div className="text-2xl font-bold text-status-high">
                      ${viewingItem.sell_price.toFixed(2)}
                    </div>
                  </div>
                )}

                {viewingItem.location && (
                  <div className="card p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Location</span>
                    </div>
                    <div className="text-lg font-medium text-foreground">
                      {viewingItem.location}
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              {(viewingItem.category || viewingItem.external_id || viewingItem.notes) && (
                <div className="card p-6 mb-8">
                  <h4 className="text-lg font-semibold mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingItem.category && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Category</label>
                        <p className="text-foreground">{viewingItem.category}</p>
                      </div>
                    )}
                    {viewingItem.external_id && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">External ID</label>
                        <p className="text-foreground">{viewingItem.external_id}</p>
                      </div>
                    )}
                    {viewingItem.notes && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-muted-foreground">Notes</label>
                        <p className="text-foreground">{viewingItem.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Shipments */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <TruckIcon className="h-5 w-5 text-primary" />
                  <h4 className="text-lg font-semibold">Recent Shipments</h4>
                </div>

                {loadingShipments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : recentShipments.length > 0 ? (
                  <div className="space-y-4">
                    {recentShipments.map((shipment) => {
                      const relevantItem = shipment.items.find((item: any) => item.itemNo === viewingItem.sku);
                      return (
                        <div key={shipment.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                shipment.type === 'incoming' 
                                  ? 'bg-status-high/20 text-status-high' 
                                  : 'bg-warning/20 text-warning'
                              }`}>
                                {shipment.type === 'incoming' ? 'Incoming' : 'Outgoing'}
                              </span>
                              <span className="font-mono text-sm font-medium">{shipment.shipment_id}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {new Date(shipment.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                          {relevantItem && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Quantity: </span>
                              <span className="font-semibold text-foreground">{relevantItem.quantity} {viewingItem.uom}</span>
                              {relevantItem.description && (
                                <>
                                  <span className="text-muted-foreground ml-4">Description: </span>
                                  <span className="text-foreground">{relevantItem.description}</span>
                                </>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            By {shipment.user_email}
                            {shipment.approved_by && ` • Approved by ${shipment.approved_by}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TruckIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                    <p className="text-muted-foreground">No recent shipments found for this item</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    closeItemDetails();
                    startEdit(viewingItem);
                  }}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Edit Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inventory Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl border border-border max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Edit Inventory: {editingItem.sku}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quantity on Hand
                </label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.qty_on_hand}
                  onChange={(e) => setEditFormData({ ...editFormData, qty_on_hand: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Minimum Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.min_qty}
                  onChange={(e) => setEditFormData({ ...editFormData, min_qty: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Classification
                </label>
                <select
                  value={editFormData.classification}
                  onChange={(e) => setEditFormData({ ...editFormData, classification: e.target.value as 'stocking' | 'non-stocking' })}
                  className="input w-full"
                >
                  <option value="stocking">Stocking</option>
                  <option value="non-stocking">Non-Stocking</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="input w-full h-20 resize-none"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={cancelEdit}
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

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-semibold text-foreground mb-6">
              Add New Inventory Item
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  SKU <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={newItemFormData.sku}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, sku: e.target.value })}
                  className="input w-full"
                  placeholder="Enter SKU"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={newItemFormData.name}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Item name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Classification <span className="text-destructive">*</span>
                </label>
                <select
                  value={newItemFormData.classification}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, classification: e.target.value as 'stocking' | 'non-stocking' })}
                  className="input w-full"
                >
                  <option value="stocking">Stocking</option>
                  <option value="non-stocking">Non-Stocking</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={newItemFormData.category}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, category: e.target.value })}
                  className="input w-full"
                  placeholder="Category"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quantity on Hand
                </label>
                <input
                  type="number"
                  min="0"
                  value={newItemFormData.qty_on_hand}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, qty_on_hand: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Minimum Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={newItemFormData.min_qty}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, min_qty: parseInt(e.target.value) || 0 })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Unit of Measure
                </label>
                <input
                  type="text"
                  value={newItemFormData.uom}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, uom: e.target.value })}
                  className="input w-full"
                  placeholder="ea, box, case, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newItemFormData.location}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, location: e.target.value })}
                  className="input w-full"
                  placeholder="Storage location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Unit Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItemFormData.unit_cost}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, unit_cost: e.target.value })}
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sell Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItemFormData.sell_price}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, sell_price: e.target.value })}
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  External ID
                </label>
                <input
                  type="text"
                  value={newItemFormData.external_id}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, external_id: e.target.value })}
                  className="input w-full"
                  placeholder="External system ID"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes
                </label>
                <textarea
                  value={newItemFormData.notes}
                  onChange={(e) => setNewItemFormData({ ...newItemFormData, notes: e.target.value })}
                  className="input w-full h-20 resize-none"
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError(null);
                }}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewItem}
                disabled={!newItemFormData.sku || !newItemFormData.name}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}