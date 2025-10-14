-- Allow service users to view profiles within clients they are assigned to
create policy "Service users can view profiles in assigned clients"
  on public.profiles
  for select
  using (
    has_role(auth.uid(), 'service_user')
    and client_id in (
      select client_id from public.get_user_accessible_clients(auth.uid())
    )
  );

-- Allow service users to view roles for users belonging to their assigned clients
create policy "Service users can view roles in assigned clients"
  on public.user_roles
  for select
  using (
    has_role(auth.uid(), 'service_user')
    and exists (
      select 1
      from public.profiles p
      where p.user_id = user_roles.user_id
        and p.client_id in (
          select client_id from public.get_user_accessible_clients(auth.uid())
        )
    )
  );