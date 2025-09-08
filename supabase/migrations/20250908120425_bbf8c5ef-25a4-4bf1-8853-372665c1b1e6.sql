-- Create trigger to handle new user registrations
-- This ensures all new users start with 'pending' status and can only see the approval page

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();