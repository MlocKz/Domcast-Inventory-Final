-- Update existing users to approved status so they don't get locked out
UPDATE public.profiles 
SET status = 'approved' 
WHERE status = 'pending';