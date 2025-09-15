-- Create clients table
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add client_id to businesses table
ALTER TABLE public.businesses 
ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create RLS policies for clients (admin only)
CREATE POLICY "Only service role can manage clients" 
ON public.clients 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Update businesses RLS policies to include client context
DROP POLICY "Users can view their own businesses" ON public.businesses;
DROP POLICY "Users can create their own businesses" ON public.businesses;
DROP POLICY "Users can update their own businesses" ON public.businesses;
DROP POLICY "Users can delete their own businesses" ON public.businesses;

CREATE POLICY "Users can view their own businesses" 
ON public.businesses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own businesses" 
ON public.businesses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND client_id IN (SELECT client_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own businesses" 
ON public.businesses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own businesses" 
ON public.businesses 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all businesses" 
ON public.businesses 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for clients updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to get user statistics for admin panel
CREATE OR REPLACE FUNCTION public.get_client_statistics()
RETURNS TABLE (
  client_id uuid,
  client_name text,
  user_count bigint,
  active_locations bigint,
  pending_locations bigint,
  last_updated timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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
      client_id,
      COUNT(*) as user_count
    FROM public.profiles 
    WHERE client_id IS NOT NULL
    GROUP BY client_id
  ) user_stats ON c.id = user_stats.client_id
  LEFT JOIN (
    SELECT 
      client_id,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_locations,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_locations,
      MAX(updated_at) as last_business_update
    FROM public.businesses 
    WHERE client_id IS NOT NULL
    GROUP BY client_id
  ) business_stats ON c.id = business_stats.client_id
  ORDER BY c.name;
END;
$$;