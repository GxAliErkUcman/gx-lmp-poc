-- Update the handle_new_user function to respect client_id from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  assigned_client_id UUID;
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
  
  -- Check if client_id was provided in metadata (from admin panel creation)
  assigned_client_id := (NEW.raw_user_meta_data ->> 'client_id')::uuid;
  
  IF assigned_client_id IS NOT NULL THEN
    -- Use the assigned client_id
    new_client_id := assigned_client_id;
  ELSE
    -- Create a new client for this user (existing behavior)
    IF user_first_name != '' AND user_last_name != '' THEN
      client_name := user_first_name || ' ' || user_last_name || ' Client';
    ELSE
      client_name := SPLIT_PART(user_email, '@', 1) || ' Client';
    END IF;
    
    -- Insert new client
    INSERT INTO public.clients (name) 
    VALUES (client_name)
    RETURNING id INTO new_client_id;
  END IF;
  
  -- Insert profile with the client_id (either assigned or newly created)
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
$function$