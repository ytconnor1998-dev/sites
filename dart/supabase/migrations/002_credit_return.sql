-- Give back the DART credit a customer used on a booking they cancelled (once).
create or replace function public.return_credit(p_order text) returns boolean language plpgsql security definer set search_path = public as $$
declare o record; amt numeric; n int;
begin
  select * into o from public.orders where id = p_order and status = 'cancelled' and customer_id = auth.uid()::text
    and coalesce(data ->> 'creditReturned', '') = '' for update;
  if not found then return false; end if;
  amt := coalesce((o.data -> 'billing' ->> 'credit')::numeric, 0);
  if amt <= 0 then return false; end if;
  update public.orders set data = data || jsonb_build_object('creditReturned', (extract(epoch from now()) * 1000)::bigint) where id = p_order;
  perform set_config('dart.server', 'on', true);
  update public.accounts set data = data || jsonb_build_object(
      'credit', round(coalesce((data ->> 'credit')::numeric, 0) + amt, 2),
      'creditLog', coalesce(data -> 'creditLog', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('amount', amt, 'reason', 'Returned from cancelled ' || p_order, 'at', (extract(epoch from now()) * 1000)::bigint)))
  where id = o.customer_id;
  get diagnostics n = row_count; return n > 0;
end; $$;
grant execute on function public.return_credit(text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
