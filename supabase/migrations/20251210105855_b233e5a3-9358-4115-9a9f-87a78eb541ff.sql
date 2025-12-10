-- Drop the foreign key constraint that causes CASCADE deletion of history records
ALTER TABLE public.business_field_history 
DROP CONSTRAINT IF EXISTS business_field_history_business_id_fkey;