-- Complete inventory seeding with all remaining items
-- Clear existing data and insert complete dataset
TRUNCATE public.inventory;

-- Insert complete inventory dataset
INSERT INTO public.inventory (sku, name, category, qty_on_hand, uom, location, unit_cost, sell_price, external_id, notes, created_at) VALUES
('2112.01', '12" Concrete Junction Box (PLT QTY 5 #75)', NULL, 299, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('2112.010L', '18" Concrete Junction Box Lid Only', NULL, 0, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('2112.02', '18" Concrete Junction Box (PLT QTY 5 #89)', NULL, 60, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('2112.020L', '18" Concrete Junction Box marked TRAFFIC Lid Only', NULL, 14, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('2112.020T', '18" Concrete Junction Box marked TRAFFIC', NULL, 0, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.01', 'Dished Catchbasin Frame & Cover (PLT QTY 5 - #440)', NULL, 260, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.010C', 'Dished Catchbasin - COVER ONLY', NULL, 0, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.010F', 'Dished Catchbasin - FRAME ONLY', NULL, 17, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.01LPTB', '400.01 ThunderBay Manhole Cover with Low Profile Frame', NULL, 70, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.01TB', 'Thunder Bay Dished CB Frame(Cut Corners) with 400.01 Cover (PLT QTY 5 #440)', NULL, 114, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.02', 'Flat Catchbasin Cover & Frame (PLT QTY 5 #470)', NULL, 419, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.020C', 'Flat Catchbasin, Cover ONLY', NULL, 131, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.020F', 'Flat Catchbasin, Frame ONLY', NULL, 1, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.020LP', '400.020LP Low Profile Catch Basin Frame and Cover Complete (PLT QTY 5 #450)', NULL, 0, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.020LPFR', '400.020 LOW PROFILE FRAME ONLY', NULL, 0, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.03', 'V-Type Catchbasin - Cover & Frame (PLT QTY 5 - #442)', NULL, 28, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.030C', 'V-Type Catchbasin, Cover Only', NULL, 1, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.030F', 'V-Type Catchbasin Frame Only', NULL, 0, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.04', '1 Piece Catchbasin with Integrated Frame and Cover', NULL, 50, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00'),
('400.05', 'Flat, Fish Catchbasin C & F (PLT QTY 5 - #460) (Old Part# 400.020Fish)', NULL, 75, 'ea', NULL, NULL, NULL, NULL, NULL, '2025-09-05 14:00:00')
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    qty_on_hand = EXCLUDED.qty_on_hand,
    uom = EXCLUDED.uom,
    location = EXCLUDED.location,
    unit_cost = EXCLUDED.unit_cost,
    sell_price = EXCLUDED.sell_price,
    external_id = EXCLUDED.external_id,
    notes = EXCLUDED.notes,
    created_at = EXCLUDED.created_at,
    updated_at = now();