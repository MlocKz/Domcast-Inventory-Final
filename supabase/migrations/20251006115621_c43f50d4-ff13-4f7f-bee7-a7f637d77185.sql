-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'submitter');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Add name field to profiles
ALTER TABLE public.profiles ADD COLUMN display_name TEXT;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role 
FROM public.profiles
WHERE role IS NOT NULL;

-- 5. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- 6. Update get_current_user_role to use new table
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN p.status = 'approved' THEN ur.role::text
    ELSE NULL 
  END 
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- 7. RLS Policies for user_roles table
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Drop and recreate inventory policies without role dependency
DROP POLICY IF EXISTS "Inventory insert by approved admins and editors" ON public.inventory;
DROP POLICY IF EXISTS "Inventory update by approved users" ON public.inventory;

CREATE POLICY "Inventory insert by approved admins and editors"
ON public.inventory
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.status = 'approved'
      AND ur.role IN ('admin', 'editor')
  )
);

CREATE POLICY "Inventory update by approved users"
ON public.inventory
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.status = 'approved'
      AND ur.role IN ('admin', 'editor', 'submitter')
  )
);

-- 9. Drop and recreate shipments policy without role dependency
DROP POLICY IF EXISTS "Shipments insert by approved editors and admins" ON public.shipments;

CREATE POLICY "Shipments insert by approved editors and admins"
ON public.shipments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.status = 'approved'
      AND (ur.role IN ('admin', 'editor') OR auth.uid() = shipments.user_id)
  )
);

-- 10. Now safe to drop role column from profiles
ALTER TABLE public.profiles DROP COLUMN role;

-- 11. Remove email columns from shipments
ALTER TABLE public.shipments DROP COLUMN IF EXISTS user_email;
ALTER TABLE public.shipments DROP COLUMN IF EXISTS approved_by;

-- 12. Remove email column from shipment_requests
ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS requestor_email;

-- 13. Update handle_new_user trigger to set default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, status)
  VALUES (
    NEW.id, 
    NEW.email,
    'pending'
  );
  
  -- Insert default submitter role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'submitter');
  
  RETURN NEW;
END;
$$;