-- Once a courier has reached the pickup, the delivery can't be handed to someone else or rolled back,
-- and the customer can't cancel after it's collected. Only DART admin can change these.
create or replace function public.guard_order() returns trigger language plpgsql as $$
declare
  early text[] := array['awaiting', 'assigned', 'to_pickup'];
  started text[] := array['at_pickup', 'collected', 'in_transit', 'at_dest', 'delivered'];
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') or public.is_admin() then return new; end if;
  if old.status = any(started) and new.courier_id is distinct from old.courier_id then
    raise exception 'This delivery is already under way. Contact DART to change the courier.';
  end if;
  if old.status = any(started) and (new.status = any(early) or new.status = 'cancelled') then
    raise exception 'This delivery is already under way. Contact DART.';
  end if;
  if old.status = 'delivered' and new.status is distinct from old.status then
    raise exception 'This delivery is finished.';
  end if;
  return new;
end; $$;
drop trigger if exists guard_order on public.orders;
create trigger guard_order before update on public.orders for each row execute function public.guard_order();
