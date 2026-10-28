-- Fix for 004: inside a BEFORE UPDATE trigger the generated columns (status, courier_id) are not
-- computed yet for the new row, so compare the values in the document itself.
create or replace function public.guard_order() returns trigger language plpgsql as $$
declare
  early text[] := array['awaiting', 'assigned', 'to_pickup'];
  started text[] := array['at_pickup', 'collected', 'in_transit', 'at_dest', 'delivered'];
  old_status text := old.data ->> 'status';
  new_status text := new.data ->> 'status';
  old_courier text := old.data -> 'courier' ->> 'id';
  new_courier text := new.data -> 'courier' ->> 'id';
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') or public.is_admin() then return new; end if;
  if old_status = any(started) and new_courier is distinct from old_courier then
    raise exception 'This delivery is already under way. Contact DART to change the courier.';
  end if;
  if old_status = any(started) and (new_status = any(early) or new_status = 'cancelled') then
    raise exception 'This delivery is already under way. Contact DART.';
  end if;
  if old_status = 'delivered' and new_status is distinct from old_status then
    raise exception 'This delivery is finished.';
  end if;
  return new;
end; $$;
