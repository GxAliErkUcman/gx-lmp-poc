-- Allow service users to create users in their assigned clients
-- They can insert into profiles for users in their clients
create policy "Service users can create profiles in assigned clients"
  on public.profiles
  for insert
  with check (
    has_role(auth.uid(), 'service_user')
    and client_id in (
      select client_id from public.get_user_accessible_clients(auth.uid())
    )
  );

-- Allow service users to assign roles (user, store_owner, client_admin) to users in their clients
create policy "Service users can assign roles in assigned clients"
  on public.user_roles
  for insert
  with check (
    has_role(auth.uid(), 'service_user')
    and role in ('user', 'store_owner', 'client_admin')
    and exists (
      select 1
      from public.profiles p
      where p.user_id = user_roles.user_id
        and p.client_id in (
          select client_id from public.get_user_accessible_clients(auth.uid())
        )
    )
  );

-- Allow service users to manage store owner access for their assigned clients
create policy "Service users can assign store owners in assigned clients"
  on public.store_owner_access
  for insert
  with check (
    has_role(auth.uid(), 'service_user')
    and exists (
      select 1
      from public.businesses b
      where b.id = store_owner_access.business_id
        and b.client_id in (
          select client_id from public.get_user_accessible_clients(auth.uid())
        )
    )
  );