-- Add status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN status text NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update the handle_new_user function to set status as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, status)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'submitter'),
    'pending'
  );
  RETURN NEW;
END;
$$;

-- Update RLS policies to require approved status
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
CREATE POLICY "Approved users can view inventory" 
ON public.inventory 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND status = 'approved'
));

DROP POLICY IF EXISTS "Inventory insert by admins and editors" ON public.inventory;
CREATE POLICY "Inventory insert by approved admins and editors" 
ON public.inventory 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() 
  AND status = 'approved' 
  AND role = ANY (ARRAY['admin'::text, 'editor'::text])
));

DROP POLICY IF EXISTS "Inventory update by admins, editors and submitters" ON public.inventory;
CREATE POLICY "Inventory update by approved users" 
ON public.inventory 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() 
  AND status = 'approved' 
  AND role = ANY (ARRAY['admin'::text, 'editor'::text, 'submitter'::text])
));

-- Update shipments policies
DROP POLICY IF EXISTS "Shipments readable by authenticated" ON public.shipments;
CREATE POLICY "Shipments readable by approved users" 
ON public.shipments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() AND status = 'approved'
));

DROP POLICY IF EXISTS "Shipments insert by editors and admins" ON public.shipments;
CREATE POLICY "Shipments insert by approved editors and admins" 
ON public.shipments 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() 
  AND status = 'approved' 
  AND (role = ANY (ARRAY['admin'::text, 'editor'::text]) OR auth.uid() = user_id)
));

-- Update get_current_user_role function to check approved status
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN status = 'approved' THEN role 
    ELSE NULL 
  END 
  FROM public.profiles 
  WHERE id = auth.uid();
$$;