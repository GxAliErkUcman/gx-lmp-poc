-- Drop role column from profiles table
-- This column is now deprecated in favor of the user_roles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;