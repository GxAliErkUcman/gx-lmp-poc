-- Update the existing admin@g-experts.net user to have admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'admin@g-experts.net';