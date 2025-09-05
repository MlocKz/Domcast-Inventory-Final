-- Drop existing inventory table if it exists
DROP TABLE IF EXISTS public.inventory CASCADE;

-- Create new inventory table with specified schema
CREATE TABLE public.inventory (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  qty_on_hand INTEGER NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'ea',
  location TEXT,
  unit_cost NUMERIC,
  sell_price NUMERIC,
  external_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow all authenticated users to SELECT
CREATE POLICY "Authenticated users can view inventory" 
ON public.inventory 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Block all writes from client (only service role can write)
-- No INSERT, UPDATE, or DELETE policies means these are blocked for regular users

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the table with provided data
INSERT INTO public.inventory (sku, name, category, qty_on_hand, uom, location, unit_cost, sell_price, external_id, notes, created_at) VALUES
('DF907', 'Dished Catchbasin Frame & Cover', 'Catchbasins', 260, 'ea', 'Aisle 4 - Pallet #440', 0.00, 0.00, 'firestore:400.01', 'Imported from Firebase', '2025-09-05 09:00:00'),
('400.010F', 'Dished Catchbasin - FRAME ONLY', 'Catchbasins', 17, 'ea', 'Rack B2', 0.00, 0.00, 'firestore:400.010F', 'Imported from Firebase', '2025-09-05 09:00:00'),
('2112.01', '12" Concrete Junction Box (PLT QTY 5 #75)', 'JunctionBoxes', 299, 'ea', 'Yard - Pallet #75', 0.00, 0.00, 'firestore:2112.01', 'Imported from Firebase', '2025-09-05 09:00:00'),
('2112.02', '18" Concrete Junction Box (PLT QTY 5 #89)', 'JunctionBoxes', 60, 'ea', 'Yard - Pallet #89', 0.00, 0.00, 'firestore:2112.02', 'Imported from Firebase', '2025-09-05 09:00:00'),
('400.02', 'Flat Catchbasin Cover & Frame (PLT QTY 5 #470)', 'Catchbasins', 369, 'ea', 'Aisle 6 - Pallet #470', 0.00, 0.00, 'firestore:400.02', 'Imported from Firebase', '2025-09-05 09:00:00');