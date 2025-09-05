import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { History, User, Package, Calendar, AlertCircle } from 'lucide-react';

interface HistoryEntry {
  id: string;
  table_name: string;
  operation: string;
  user_email: string;
  timestamp: string;
  old_data: any;
  new_data: any;
}

export function AdminHistoryPage() {
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      
      // Get shipments history (most recent activity)
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (shipmentsError) throw shipmentsError;

      // Get inventory changes (via shipments)
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (inventoryError) throw inventoryError;

      // Format history entries
      const formattedHistory: HistoryEntry[] = [
        ...(shipments?.map(shipment => ({
          id: shipment.id,
          table_name: 'shipments',
          operation: 'INSERT',
          user_email: shipment.user_email || 'Unknown',
          timestamp: shipment.timestamp,
          old_data: null,
          new_data: shipment
        })) || []),
        ...(inventory?.map(item => ({
          id: item.sku,
          table_name: 'inventory',
          operation: 'UPDATE',
          user_email: 'System',
          timestamp: item.updated_at,
          old_data: null,
          new_data: item
        })) || [])
      ];

      // Sort by timestamp descending
      formattedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setHistoryEntries(formattedHistory);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = historyEntries.filter(entry => {
    if (filter === 'all') return true;
    return entry.table_name === filter;
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'INSERT': return <Package className="h-4 w-4 text-green-600" />;
      case 'UPDATE': return <History className="h-4 w-4 text-blue-600" />;
      case 'DELETE': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <History className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading change history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center space-x-2">
            <History className="h-6 w-6" />
            <span>Change History</span>
          </h2>
          <p className="text-muted-foreground">
            Track all changes and activity in the system
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="input w-48"
          >
            <option value="all">All Changes</option>
            <option value="shipments">Shipments Only</option>
            <option value="inventory">Inventory Only</option>
          </select>
        </div>
      </div>

      <div className="card p-6">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No change history available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={`${entry.table_name}-${entry.id}-${entry.timestamp}`} 
                   className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getOperationIcon(entry.operation)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-foreground capitalize">
                          {entry.operation.toLowerCase()}
                        </span>
                        <span className="text-muted-foreground">in</span>
                        <span className="font-medium text-primary capitalize">
                          {entry.table_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{entry.user_email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatTimestamp(entry.timestamp)}</span>
                        </div>
                      </div>

                      {entry.table_name === 'shipments' && entry.new_data && (
                        <div className="text-sm">
                          <p className="text-foreground">
                            <span className="font-medium">Shipment ID:</span> {entry.new_data.shipment_id}
                          </p>
                          <p className="text-foreground">
                            <span className="font-medium">Type:</span> 
                            <span className={`ml-1 capitalize ${
                              entry.new_data.type === 'incoming' ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {entry.new_data.type}
                            </span>
                          </p>
                          {entry.new_data.items && Array.isArray(entry.new_data.items) && (
                            <p className="text-muted-foreground">
                              {entry.new_data.items.length} item(s) processed
                            </p>
                          )}
                        </div>
                      )}

                      {entry.table_name === 'inventory' && entry.new_data && (
                        <div className="text-sm">
                          <p className="text-foreground">
                            <span className="font-medium">SKU:</span> {entry.new_data.sku}
                          </p>
                          <p className="text-foreground">
                            <span className="font-medium">Name:</span> {entry.new_data.name}
                          </p>
                          <p className="text-foreground">
                            <span className="font-medium">Quantity:</span> {entry.new_data.qty_on_hand}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}