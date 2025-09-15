-- Create admin user and fix client assignment for new users

-- Create a client for the admin user
INSERT INTO public.clients (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'GX Admin');

-- Create admin user (this will be handled by Supabase Auth manually)
-- The user creation needs to be done through Supabase dashboard or auth admin

-- Update the handle_new_user function to automatically create a client for each new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  new_client_id UUID;
  user_first_name TEXT;
  user_last_name TEXT;
  user_email TEXT;
  client_name TEXT;
BEGIN
  -- Extract user metadata
  user_first_name := COALESCE(NEW.raw_user_meta_data ->> 'first_name', '');
  user_last_name := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');
  user_email := NEW.email;
  
  -- Create a new client for this user (using first name + last name or email if names not available)
  IF user_first_name != '' AND user_last_name != '' THEN
    client_name := user_first_name || ' ' || user_last_name || ' Client';
  ELSE
    client_name := SPLIT_PART(user_email, '@', 1) || ' Client';
  END IF;
  
  -- Insert new client
  INSERT INTO public.clients (name) 
  VALUES (client_name)
  RETURNING id INTO new_client_id;
  
  -- Insert profile with the new client_id
  INSERT INTO public.profiles (user_id, first_name, last_name, email, client_id)
  VALUES (
    NEW.id, 
    user_first_name,
    user_last_name,
    user_email,
    new_client_id
  );
  
  RETURN NEW;
END;
$$;

-- Create the admin profile manually (after the admin user is created)
-- This will be inserted after the user is created in Supabase Auth
-- We'll handle this programmatically