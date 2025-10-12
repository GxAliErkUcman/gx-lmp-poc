-- Allow client_admins to assign user/store_owner roles within their own client
DROP POLICY IF EXISTS "Client admins can insert roles in their client" ON public.user_roles;

CREATE POLICY "Client admins can insert roles in their client"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'client_admin')
    AND role IN ('user','store_owner')
    AND EXISTS (
      SELECT 1 
      FROM public.profiles p_admin
      JOIN public.profiles p_target ON p_admin.client_id = p_target.client_id
      WHERE p_admin.user_id = auth.uid()
        AND p_target.user_id = user_roles.user_id
    )
  );