// Utility to seed complete inventory data from TSV
export const seedInventoryData = async (supabase: any) => {
  const inventoryData = [
    // First batch already seeded, continuing with remaining data
    { sku: '401.010B', name: 'Manhole, Frame and Perforated Cover (PLT QTY 5 - #366)', category: null, qty_on_hand: 29, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: '401.010BC', name: 'Manhole, Perforated Cover Only', category: null, qty_on_hand: 0, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: '401.010BSTM', name: 'Storm Manhole, Frame and Perforated Cover marked "STORM" (PLT QTY 5 #366)', category: null, qty_on_hand: 50, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: '401.010BSTMC', name: 'Manhole, Perforated Cover marked "STORM" Only', category: null, qty_on_hand: 50, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: '401.010C', name: 'Manhole, Solid Cover Only', category: null, qty_on_hand: 90, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: '401.010E', name: 'Electrical Manhole, Frame and Cover', category: null, qty_on_hand: 97, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: 'ADV1824', name: '18x24 Detection Plate Raw (#29)', category: null, qty_on_hand: 25, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: 'ADV2424', name: '24x24 Detecton Plate Raw (#40)', category: null, qty_on_hand: 430, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: 'CMJBP04', name: '4" Plain Alloy Bolt Pack with Gasket 3.6# ( Box Qty 300)', category: null, qty_on_hand: 359, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: 'CMJBP06', name: '6" Plain Alloy Bolt Pack with Gasket 5.4# (Box Qty 200)', category: null, qty_on_hand: 1174, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: 'CMJBP08', name: '8" Plain Alloy Bolt Pack with Gasket 6# (Box Qty 200)', category: null, qty_on_hand: 1545, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: 'DF44', name: '4" Sewer Cleanout - Cover & Frame (QTY 50/BOX 7#)', category: null, qty_on_hand: 283, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: 'DF66I', name: '6" Sewer Cleanout w. Built-in-Gasket (QTY 30/BOX #19)', category: null, qty_on_hand: 196, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: 'DF88', name: '8" Sewer Cleanout w. Built-in-Gasket (QTY 25/BOX #33)', category: null, qty_on_hand: 225, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' },
    { sku: 'LD24R150', name: '24" x 1 1/2" Manhole Adjustment Unit (PLT QTY 58 - #4.75)', category: null, qty_on_hand: 208, uom: 'ea', location: null, unit_cost: null, sell_price: null, external_id: null, notes: null, created_at: '2025-09-05 14:00:00' }
  ];

  // Insert data with upsert
  for (const item of inventoryData) {
    const { error } = await supabase
      .from('inventory')
      .upsert(item, { 
        onConflict: 'sku',
        returning: 'minimal'
      });
    
    if (error) {
      console.error('Error upserting inventory item:', error, item);
    }
  }
};