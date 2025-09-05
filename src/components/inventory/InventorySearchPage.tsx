import React, { useState, useEffect, useMemo } from 'react';
import { SearchIcon, PackageIcon, AlertCircle, Download } from 'lucide-react';
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
  created_at: string;
  updated_at: string;
}

export function InventorySearchPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    qty_on_hand: 0,
    min_qty: 0,
    notes: ''
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
      setInventory(data || []);
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
      notes: item.notes || ''
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
          notes: editFormData.notes || null
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
      notes: ''
    });
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
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <Download className="h-5 w-5" />
          Export CSV
        </button>
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
              className="flex items-center justify-between px-6 py-5 hover:bg-gradient-accent transition-all duration-300 group"
              style={{ animationDelay: `${index * 0.05}s` }}
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
                <div className={`text-2xl font-extrabold transition-all duration-300 ${
                  item.qty_on_hand === 0 ? 'text-destructive' :
                  item.qty_on_hand <= (item.min_qty || 0) ? 'text-warning' : 'text-status-high'
                }`}>
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
                  className="border-b border-border hover:bg-gradient-accent transition-all duration-300 group animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
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
                      <div className={`text-2xl font-bold transition-all duration-300 ${
                        item.qty_on_hand === 0 ? 'text-destructive' :
                        item.qty_on_hand <= (item.min_qty || 0) ? 'text-warning' : 'text-status-high'
                      }`}>
                        {item.qty_on_hand.toLocaleString()}
                      </div>
                      <div className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        item.qty_on_hand === 0 ? 'bg-destructive/20 text-destructive' :
                        item.qty_on_hand <= (item.min_qty || 0) ? 'bg-warning/20 text-warning' : 'bg-status-high/20 text-status-high'
                      }`}>
                        {item.qty_on_hand === 0 ? 'Out of Stock' :
                         item.qty_on_hand <= (item.min_qty || 0) ? 'Low Stock' : 'In Stock'}
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-center">
                    <button
                      onClick={() => startEdit(item)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                      Edit
                    </button>
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
    </div>
  );
}