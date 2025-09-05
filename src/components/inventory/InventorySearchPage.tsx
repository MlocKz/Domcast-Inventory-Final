import React, { useState, useEffect, useMemo } from 'react';
import { SearchIcon, PackageIcon, AlertCircle } from 'lucide-react';
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
  created_at: string;
  updated_at: string;
}

export function InventorySearchPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            {filteredInventory.length} items {searchTerm && `(filtered from ${inventory.length})`}
          </p>
        </div>
      </div>

      {/* Search Box */}
      <div className="relative max-w-md">
        <SearchIcon className="h-5 w-5 absolute left-3 top-3 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by SKU or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-card rounded-lg border border-border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-4 px-4 font-semibold text-foreground">SKU</th>
                <th className="text-left py-4 px-4 font-semibold text-foreground">Name</th>
                <th className="text-center py-4 px-4 font-semibold text-foreground">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr key={item.sku} className="border-b border-border hover:bg-muted/25 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-mono text-base font-bold text-foreground">
                      {item.sku}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-foreground font-medium">
                      {item.name}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className={`text-xl font-bold ${
                      item.qty_on_hand === 0 ? 'text-destructive' :
                      item.qty_on_hand < 10 ? 'text-orange-500' : 
                      item.qty_on_hand < 50 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {item.qty_on_hand.toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredInventory.length === 0 && (
            <div className="text-center py-12">
              <PackageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No items match your search criteria' : 'No inventory items found'}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-primary hover:text-primary/80 underline"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}