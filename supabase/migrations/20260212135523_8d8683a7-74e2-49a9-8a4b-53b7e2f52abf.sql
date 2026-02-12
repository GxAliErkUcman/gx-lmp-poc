
-- Backfill: For all existing clients, ensure storeCode is locked for user and store_owner
INSERT INTO public.client_permissions (client_id, field_id, locked_for_user, locked_for_store_owner, locked_for_client_admin)
SELECT c.id, '44f98660-fc7f-4036-9568-d63acdcddfb9', true, true, false
FROM public.clients c
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_permissions cp 
  WHERE cp.client_id = c.id AND cp.field_id = '44f98660-fc7f-4036-9568-d63acdcddfb9'
);

-- Update any existing permissions that aren't locked yet
UPDATE public.client_permissions
SET locked_for_user = true, locked_for_store_owner = true
WHERE field_id = '44f98660-fc7f-4036-9568-d63acdcddfb9'
  AND (locked_for_user = false OR locked_for_store_owner = false);

-- Create trigger function to auto-lock storeCode for new clients
CREATE OR REPLACE FUNCTION public.auto_lock_store_code_for_new_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.client_permissions (client_id, field_id, locked_for_user, locked_for_store_owner, locked_for_client_admin)
  VALUES (NEW.id, '44f98660-fc7f-4036-9568-d63acdcddfb9', true, true, false)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on clients table
DROP TRIGGER IF EXISTS auto_lock_store_code ON public.clients;
CREATE TRIGGER auto_lock_store_code
AFTER INSERT ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.auto_lock_store_code_for_new_client();
