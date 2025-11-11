import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { History, User, Package, Calendar, AlertCircle } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface HistoryEntry {
  id: string;
  table_name: string;
  operation: string;
  user_email: string;
  timestamp: string;
  old_data: any;
  new_data: any;
  changes?: Record<string, { old: any; new: any }> | null;
}

interface AdminHistoryPageProps {
  user: SupabaseUser | null;
}

export function AdminHistoryPage({ user }: AdminHistoryPageProps) {
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get ALL shipments history (not just current user's)
      const { data: shipments, error: shipmentsError } = await supabase
        .from('shipments')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);

      if (shipmentsError) throw shipmentsError;

      // Get all unique user IDs from shipments
      const userIds = [...new Set(shipments?.map(s => s.user_id).filter(Boolean) || [])];
      
      // Fetch all user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds);

      const userMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Format history entries - show shipments and inventory changes
      const formattedHistory: HistoryEntry[] = [];
      
      for (const shipment of shipments || []) {
        try {
          // Get user info for this shipment
          const userProfile = userMap.get(shipment.user_id);
          const userEmail = userProfile?.display_name || userProfile?.email || 'Unknown';

          // Check if this is an inventory change (shipment_id starts with INV-CHANGE-)
          const isInventoryChange = shipment.shipment_id && shipment.shipment_id.startsWith('INV-CHANGE-');

          if (isInventoryChange) {
            // Extract SKU from shipment_id format: INV-CHANGE-{SKU}-{timestamp}
            const skuMatch = shipment.shipment_id.match(/INV-CHANGE-(.+?)-/);
            const sku = skuMatch ? skuMatch[1] : 'Unknown';
            
            // Extract old quantity from items array if available
            let oldQty = null;
            let changes = null;
            if (shipment.items && Array.isArray(shipment.items) && shipment.items.length > 0) {
              const changeItem = shipment.items[0] as any;
              if (changeItem && typeof changeItem === 'object') {
                if (changeItem.old_qty !== undefined) {
                  oldQty = changeItem.old_qty;
                }
                if (changeItem.changes) {
                  changes = changeItem.changes;
                  // Also extract old quantity from changes if available
                  if (changes.qty_on_hand && changes.qty_on_hand.old !== undefined) {
                    oldQty = changes.qty_on_hand.old;
                  }
                }
              }
            }
            
            // Fetch the current inventory item to show details
            try {
              const { data: inventoryItem } = await supabase
                .from('inventory')
                .select('sku, name, qty_on_hand, min_qty, location, category')
                .eq('sku', sku)
                .single();
              
              formattedHistory.push({
                id: shipment.id,
                table_name: 'inventory',
                operation: 'UPDATE',
                user_email: userEmail,
                timestamp: shipment.timestamp,
                old_data: oldQty !== null ? { qty_on_hand: oldQty } : null,
                new_data: inventoryItem || { sku, name: 'Unknown Item', qty_on_hand: 0 },
                changes: changes
              });
            } catch (err) {
              // If item not found, still add entry with SKU
              formattedHistory.push({
                id: shipment.id,
                table_name: 'inventory',
                operation: 'UPDATE',
                user_email: userEmail,
                timestamp: shipment.timestamp,
                old_data: oldQty !== null ? { qty_on_hand: oldQty } : null,
                new_data: { sku, name: 'Item Not Found', qty_on_hand: 0 },
                changes: changes
              });
            }
          } else {
            // Check if this is a shipment update (shipment_id starts with UPDATE-)
            const isShipmentUpdate = shipment.shipment_id && shipment.shipment_id.startsWith('UPDATE-');
            
            if (isShipmentUpdate) {
              // Extract original shipment ID
              const originalIdMatch = shipment.shipment_id.match(/UPDATE-(.+?)-/);
              const originalShipmentId = originalIdMatch ? originalIdMatch[1] : 'Unknown';
              
              formattedHistory.push({
                id: shipment.id,
                table_name: 'shipments',
                operation: 'UPDATE',
                user_email: userEmail,
                timestamp: shipment.timestamp,
                old_data: { shipment_id: originalShipmentId },
                new_data: shipment,
                changes: null
              });
            } else {
              // This is a regular shipment creation
              formattedHistory.push({
                id: shipment.id,
                table_name: 'shipments',
                operation: 'INSERT',
                user_email: userEmail,
                timestamp: shipment.timestamp,
                old_data: null,
                new_data: shipment,
                changes: null
              });
            }
          }
        } catch (err) {
          console.error('Error processing shipment:', shipment.id, err);
          // Skip this shipment if there's an error
        }
      }

      // Sort by timestamp descending
      formattedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setHistoryEntries(formattedHistory);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistoryEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = historyEntries.filter(entry => {
    if (filter === 'all') return true;
    return entry.table_name === filter;
  });

  const toggleEntry = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

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
            {filteredEntries.map((entry) => {
              const entryId = `${entry.table_name}-${entry.id}-${entry.timestamp}`;
              const isExpanded = expandedEntries.has(entryId);
              
              return (
              <div key={entryId} 
                   className="border border-border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors">
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => toggleEntry(entryId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
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

                        {/* Summary info - always visible */}
                        {entry.table_name === 'shipments' && entry.new_data && (
                          <div className="text-sm">
                            <p className="text-foreground">
                              <span className="font-medium">Shipment ID:</span> {
                                entry.new_data?.shipment_id?.startsWith('UPDATE-') 
                                  ? entry.new_data.shipment_id.replace(/^UPDATE-(.+?)-.+$/, '$1')
                                  : entry.new_data?.shipment_id || 'Unknown'
                              }
                            </p>
                            <p className="text-foreground">
                              <span className="font-medium">Type:</span> 
                              <span className={`ml-1 capitalize ${
                                entry.new_data?.type === 'incoming' ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {entry.new_data?.type || 'unknown'}
                              </span>
                            </p>
                            {entry.new_data?.items && Array.isArray(entry.new_data.items) && (
                              <p className="text-muted-foreground text-xs mt-1">
                                {entry.new_data.items.length} item(s) • Click to view details
                              </p>
                            )}
                          </div>
                        )}

                        {entry.table_name === 'inventory' && entry.new_data && (
                          <div className="text-sm">
                            <p className="text-foreground">
                              <span className="font-medium">SKU:</span> {entry.new_data?.sku || 'Unknown'}
                            </p>
                            <p className="text-foreground">
                              <span className="font-medium">Name:</span> {entry.new_data?.name || 'Unknown'}
                            </p>
                            {(entry.old_data && entry.old_data.qty_on_hand !== undefined) || 
                             (entry.changes && entry.changes.qty_on_hand) ? (
                              <p className="text-foreground mt-1">
                                <span className="font-medium">Quantity:</span> 
                                <span className="text-red-600 line-through ml-1">
                                  {entry.changes?.qty_on_hand?.old ?? entry.old_data?.qty_on_hand ?? 'Unknown'}
                                </span>
                                <span className="text-muted-foreground mx-1">→</span>
                                <span className="text-green-600 font-semibold">
                                  {entry.changes?.qty_on_hand?.new ?? entry.new_data?.qty_on_hand ?? 0}
                                </span>
                              </p>
                            ) : (
                              <p className="text-muted-foreground text-xs mt-1">
                                Quantity: {entry.new_data?.qty_on_hand || 0} • Click to view details
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <svg 
                        className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border bg-secondary/20 animate-accordion-down">
                    {entry.table_name === 'shipments' && entry.new_data && (
                      <div className="pt-4 text-sm space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-foreground">
                              <span className="font-medium">Shipment ID:</span> {
                                entry.new_data.shipment_id.startsWith('UPDATE-') 
                                  ? entry.new_data.shipment_id.replace(/^UPDATE-(.+?)-.+$/, '$1')
                                  : entry.new_data.shipment_id
                              }
                            </p>
                            <p className="text-foreground">
                              <span className="font-medium">Type:</span> 
                              <span className={`ml-1 capitalize ${
                                entry.new_data.type === 'incoming' ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {entry.new_data.type}
                              </span>
                            </p>
                          </div>
                          <div>
                            {entry.new_data.items && Array.isArray(entry.new_data.items) && (
                              <>
                                <p className="text-muted-foreground">
                                  <span className="font-medium">Items:</span> {entry.new_data.items.length} item(s)
                                </p>
                                <p className="text-muted-foreground text-xs mt-1">
                                  Total Quantity: {entry.new_data.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Show item details */}
                        {entry.new_data.items && Array.isArray(entry.new_data.items) && entry.new_data.items.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items:</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {entry.new_data.items.map((item: any, idx: number) => (
                                <div key={idx} className="text-xs flex justify-between p-2 bg-card rounded">
                                  <div>
                                    <span className="text-foreground font-medium">{item.itemNo}</span>
                                    {item.description && (
                                      <span className="text-muted-foreground ml-2">{item.description}</span>
                                    )}
                                  </div>
                                  <span className="text-muted-foreground ml-2">Qty: {item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {entry.table_name === 'inventory' && entry.new_data && (
                      <div className="pt-4 text-sm space-y-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-foreground">
                              <span className="font-medium">SKU:</span> {entry.new_data.sku}
                            </p>
                            <p className="text-foreground">
                              <span className="font-medium">Name:</span> {entry.new_data.name}
                            </p>
                          </div>
                          <div>
                            {entry.old_data && entry.old_data.qty_on_hand !== undefined ? (
                              <div>
                                <p className="text-foreground">
                                  <span className="font-medium">Quantity Changed:</span>
                                </p>
                                <p className="text-sm">
                                  <span className="text-red-600 line-through">{entry.old_data.qty_on_hand}</span>
                                  <span className="text-muted-foreground mx-2">→</span>
                                  <span className="text-green-600 font-semibold">{entry.new_data.qty_on_hand}</span>
                                </p>
                              </div>
                            ) : (
                              <p className="text-foreground">
                                <span className="font-medium">Quantity:</span> {entry.new_data.qty_on_hand}
                              </p>
                            )}
                            {entry.new_data.min_qty !== null && entry.new_data.min_qty !== undefined && (
                              <p className="text-muted-foreground text-xs mt-1">
                                Min Qty: {entry.new_data.min_qty}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Show all changes if available */}
                        {entry.changes && Object.keys(entry.changes).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">All Changes:</p>
                            <div className="space-y-1">
                              {Object.entries(entry.changes).map(([field, change]: [string, any]) => {
                                const fieldLabels: Record<string, string> = {
                                  qty_on_hand: 'Quantity on Hand',
                                  min_qty: 'Minimum Quantity',
                                  notes: 'Notes',
                                  classification: 'Classification'
                                };
                                return (
                                  <div key={field} className="text-xs flex justify-between p-2 bg-card rounded">
                                    <span className="font-medium text-foreground">{fieldLabels[field] || field}:</span>
                                    <div>
                                      <span className="text-red-600 line-through">{String(change.old)}</span>
                                      <span className="text-muted-foreground mx-1">→</span>
                                      <span className="text-green-600">{String(change.new)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {(entry.new_data.location || entry.new_data.category) && (
                          <div className="mt-3 pt-3 border-t border-border">
                            {entry.new_data.location && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Location:</span> {entry.new_data.location}
                              </p>
                            )}
                            {entry.new_data.category && (
                              <p className="text-xs text-muted-foreground">
                                <span className="font-medium">Category:</span> {entry.new_data.category}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}