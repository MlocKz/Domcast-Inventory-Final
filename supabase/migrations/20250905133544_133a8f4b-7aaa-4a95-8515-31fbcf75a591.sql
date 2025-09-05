-- Create inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_no TEXT NOT NULL UNIQUE,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('incoming','outgoing')),
  items JSONB NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT,
  approved_by TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shipment_requests table
CREATE TABLE IF NOT EXISTS public.shipment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('incoming','outgoing')),
  items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requestor_id UUID NOT NULL,
  requestor_email TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_requests ENABLE ROW LEVEL SECURITY;

-- Inventory policies
DROP POLICY IF EXISTS "Inventory is readable by authenticated" ON public.inventory;
CREATE POLICY "Inventory is readable by authenticated" ON public.inventory
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Inventory can be modified by editors and admins" ON public.inventory;
CREATE POLICY "Inventory can be modified by editors and admins" ON public.inventory
FOR INSERT TO authenticated WITH CHECK (public.get_current_user_role() IN ('admin','editor'));

CREATE POLICY "Inventory update by editors and admins" ON public.inventory
FOR UPDATE TO authenticated USING (public.get_current_user_role() IN ('admin','editor')) WITH CHECK (public.get_current_user_role() IN ('admin','editor'));

CREATE POLICY "Inventory delete by admins" ON public.inventory
FOR DELETE TO authenticated USING (public.get_current_user_role() = 'admin');

-- Shipments policies
DROP POLICY IF EXISTS "Shipments readable by authenticated" ON public.shipments;
CREATE POLICY "Shipments readable by authenticated" ON public.shipments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Shipments insert by editors and admins" ON public.shipments
FOR INSERT TO authenticated WITH CHECK (
  public.get_current_user_role() IN ('admin','editor') OR auth.uid() = user_id
);

-- Shipment requests policies
DROP POLICY IF EXISTS "Requests readable by requester or admin" ON public.shipment_requests;
CREATE POLICY "Requests readable by requester or admin" ON public.shipment_requests
FOR SELECT TO authenticated USING (
  requestor_id = auth.uid() OR public.get_current_user_role() = 'admin'
);

CREATE POLICY "Requests insert by requester" ON public.shipment_requests
FOR INSERT TO authenticated WITH CHECK (requestor_id = auth.uid());

CREATE POLICY "Requests delete by admin" ON public.shipment_requests
FOR DELETE TO authenticated USING (public.get_current_user_role() = 'admin');

-- Timestamp update function (already exists but ensure present and correct)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for inventory updated_at
DROP TRIGGER IF EXISTS update_inventory_updated_at ON public.inventory;
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();