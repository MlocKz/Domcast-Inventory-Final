-- Add UPDATE policy for shipments (admins and editors can update)
CREATE POLICY "Shipments update by admins and editors" 
ON public.shipments 
FOR UPDATE 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));

-- Add UPDATE policy for inventory (admins and editors can update)
CREATE POLICY "Inventory update by admins and editors" 
ON public.inventory 
FOR UPDATE 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));

-- Add INSERT policy for inventory (admins and editors can add new items)
CREATE POLICY "Inventory insert by admins and editors" 
ON public.inventory 
FOR INSERT 
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin'::text, 'editor'::text]));

-- Add DELETE policy for shipments (admins can delete)
CREATE POLICY "Shipments delete by admins" 
ON public.shipments 
FOR DELETE 
USING (get_current_user_role() = 'admin'::text);