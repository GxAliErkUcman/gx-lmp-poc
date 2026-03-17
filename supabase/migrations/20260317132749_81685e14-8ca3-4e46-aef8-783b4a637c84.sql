
-- Drop existing unsafe policies
DROP POLICY IF EXISTS "Users can view field history" ON public.business_field_history;
DROP POLICY IF EXISTS "Users can insert field history" ON public.business_field_history;

-- Recreate SELECT policy: authenticated only, with proper scoping for deleted business records
CREATE POLICY "Users can view field history"
ON public.business_field_history
FOR SELECT
TO authenticated
USING (
  -- Normal case: business still exists and user can access it
  (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_field_history.business_id
  ))
  OR
  -- Deleted business records: only admins and service_users/client users with client access
  (
    field_name = 'business_deleted'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        public.has_role(auth.uid(), 'service_user')
        AND (old_value::jsonb ->> 'client_id') IN (
          SELECT client_id FROM public.get_user_accessible_clients(auth.uid())
        )
      )
      OR (
        (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'user'))
        AND (old_value::jsonb ->> 'client_id') = public.get_user_client_id()
      )
    )
  )
);

-- Recreate INSERT policy: authenticated only, with role check for deletion tracking
CREATE POLICY "Users can insert field history"
ON public.business_field_history
FOR INSERT
TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = business_field_history.business_id
  ))
  OR
  (
    field_name = 'business_deleted'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'service_user')
      OR public.has_role(auth.uid(), 'client_admin')
    )
  )
);
