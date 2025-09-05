-- Allow admins to update any profile (DROP and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (get_current_user_role() = 'admin');

-- Add minimum quantity column to inventory
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS min_qty integer DEFAULT 0;