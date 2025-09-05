-- Insert admin profile manually (in case signup trigger didn't fire)
INSERT INTO public.profiles (id, email, role)
VALUES ('36c7f558-90ea-4ca5-b6b9-ff23a0bf36ea', 'admin@example.com', 'admin')
ON CONFLICT (id) 
DO UPDATE SET role = 'admin', updated_at = NOW();