-- First, ensure we have the trigger to automatically create profiles for new users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create the missing profile for cole@domcastmetals.com
-- We'll look up the user ID from auth.users and create the profile
INSERT INTO public.profiles (id, email, role)
SELECT 
  id,
  email,
  'admin' as role
FROM auth.users 
WHERE email = 'cole@domcastmetals.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role;