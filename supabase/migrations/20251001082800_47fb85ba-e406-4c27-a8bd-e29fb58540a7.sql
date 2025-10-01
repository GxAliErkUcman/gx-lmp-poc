-- Change client_id from UUID to TEXT to support numeric string IDs

-- Step 1: Drop all RLS policies that reference client_id
DROP POLICY IF EXISTS "Users can view profiles within their client" ON public.profiles;
DROP POLICY IF EXISTS "Users can view businesses from their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can create businesses for their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can update businesses from their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete businesses from their client" ON public.businesses;

-- Step 2: Drop foreign key constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_client_id_fkey;
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_client_id_fkey;

-- Step 3: Drop the trigger, then the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_user_client_id();
DROP FUNCTION IF EXISTS public.get_client_statistics();

-- Step 4: Change the column types
ALTER TABLE public.clients ALTER COLUMN id TYPE TEXT USING id::TEXT;
ALTER TABLE public.profiles ALTER COLUMN client_id TYPE TEXT USING client_id::TEXT;
ALTER TABLE public.businesses ALTER COLUMN client_id TYPE TEXT USING client_id::TEXT;

-- Step 5: Recreate foreign key constraints
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES public.clients(id) 
  ON DELETE CASCADE;

ALTER TABLE public.businesses 
  ADD CONSTRAINT businesses_client_id_fkey 
  FOREIGN KEY (client_id) 
  REFERENCES public.clients(id) 
  ON DELETE CASCADE;

-- Step 6: Recreate functions with TEXT return type
CREATE FUNCTION public.get_user_client_id()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT client_id FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

CREATE FUNCTION public.get_client_statistics()
RETURNS TABLE(client_id TEXT, client_name text, user_count bigint, active_locations bigint, pending_locations bigint, last_updated timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    COALESCE(user_stats.user_count, 0) as user_count,
    COALESCE(business_stats.active_locations, 0) as active_locations,
    COALESCE(business_stats.pending_locations, 0) as pending_locations,
    GREATEST(c.updated_at, business_stats.last_business_update) as last_updated
  FROM public.clients c
  LEFT JOIN (
    SELECT 
      p.client_id,
      COUNT(*) as user_count
    FROM public.profiles p
    WHERE p.client_id IS NOT NULL
    GROUP BY p.client_id
  ) user_stats ON c.id = user_stats.client_id
  LEFT JOIN (
    SELECT 
      b.client_id,
      COUNT(CASE WHEN b.status = 'active' THEN 1 END) as active_locations,
      COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_locations,
      MAX(b.updated_at) as last_business_update
    FROM public.businesses b
    WHERE b.client_id IS NOT NULL
    GROUP BY b.client_id
  ) business_stats ON c.id = business_stats.client_id
  ORDER BY c.name;
END;
$function$;

CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assigned_client_id TEXT;
  new_client_id TEXT;
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
  assigned_client_id := (NEW.raw_user_meta_data ->> 'client_id')::TEXT;
  
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
    
    -- Generate a numeric string client ID (13 digits, similar to the example)
    new_client_id := LPAD(FLOOR(RANDOM() * 10000000000000)::TEXT, 13, '0');
    
    -- Insert new client
    INSERT INTO public.clients (id, name) 
    VALUES (new_client_id, client_name);
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
$function$;

-- Step 7: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 8: Recreate RLS policies
CREATE POLICY "Users can view profiles within their client" 
  ON public.profiles 
  FOR SELECT 
  USING (client_id = get_user_client_id());

CREATE POLICY "Users can view businesses from their client" 
  ON public.businesses 
  FOR SELECT 
  USING ((client_id = get_user_client_id()) OR ((client_id IS NULL) AND (auth.uid() = user_id)));

CREATE POLICY "Users can create businesses for their client" 
  ON public.businesses 
  FOR INSERT 
  WITH CHECK ((client_id = get_user_client_id()) OR ((client_id IS NULL) AND (auth.uid() = user_id)));

CREATE POLICY "Users can update businesses from their client" 
  ON public.businesses 
  FOR UPDATE 
  USING ((client_id = get_user_client_id()) OR ((client_id IS NULL) AND (auth.uid() = user_id)))
  WITH CHECK ((client_id = get_user_client_id()) OR ((client_id IS NULL) AND (auth.uid() = user_id)));

CREATE POLICY "Users can delete businesses from their client" 
  ON public.businesses 
  FOR DELETE 
  USING ((client_id = get_user_client_id()) OR ((client_id IS NULL) AND (auth.uid() = user_id)));