-- Allow admins to update any profile
CREATE POLICY IF NOT EXISTS "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (get_current_user_role() = 'admin');

-- Add minimum quantity column to inventory
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS min_qty integer NOT NULL DEFAULT 0;