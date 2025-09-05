-- Update user role to admin
UPDATE public.profiles 
SET role = 'admin', updated_at = NOW() 
WHERE id = '36c7f558-90ea-4ca5-b6b9-ff23a0bf36ea';