-- Add RLS policy for client admins to view user roles in their client
CREATE POLICY "Client admins can view roles in their client"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_admin')
    AND EXISTS (
      SELECT 1 
      FROM public.profiles p1
      INNER JOIN public.profiles p2 ON p1.client_id = p2.client_id
      WHERE p1.user_id = auth.uid()
        AND p2.user_id = user_roles.user_id
    )
  );