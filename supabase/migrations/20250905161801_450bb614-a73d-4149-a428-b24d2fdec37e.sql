-- Update inventory update policy to include submitters
DROP POLICY IF EXISTS "Inventory update by admins and editors" ON public.inventory;

CREATE POLICY "Inventory update by admins, editors and submitters" 
ON public.inventory 
FOR UPDATE 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'editor'::text, 'submitter'::text]));