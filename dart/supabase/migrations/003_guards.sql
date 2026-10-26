-- The safety rules apply to people using the apps; the database owner and server functions may still make changes.
create or replace function public.guard_credit() returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin()
     and current_setting('dart.server', true) is distinct from 'on'
     and coalesce((new.data ->> 'credit')::numeric, 0) > coalesce((old.data ->> 'credit')::numeric, 0) then
    raise exception 'Only DART can add credit';
  end if;
  return new;
end; $$;
create or replace function public.guard_courier() returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') and not public.is_admin()
     and (new.data ->> 'status') is distinct from (old.data ->> 'status') then
    raise exception 'Only DART can approve couriers';
  end if;
  return new;
end; $$;
