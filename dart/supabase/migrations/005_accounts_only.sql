-- Every booking now comes from a logged-in DART account: guests can no longer create deliveries.
drop policy if exists "orders: book" on public.orders;
create policy "orders: book" on public.orders for insert with check (public.is_admin() or customer_id = public.uid());
