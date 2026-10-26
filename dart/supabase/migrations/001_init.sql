-- DART database, phase 1.
-- Each collection the app uses is a table of JSON documents (id + data), so the
-- tested app logic carries over unchanged. Access is enforced here with row-level
-- security; columns used by the rules are pulled out of the JSON automatically.

-- ---------- Admins ----------
create table if not exists public.staff (email text primary key, added_at timestamptz not null default now());
alter table public.staff enable row level security;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff s where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
create policy "staff: admins read" on public.staff for select using (public.is_admin());

-- ---------- Helpers ----------
-- Merge a patch into a document: objects merge key by key, anything else is replaced.
create or replace function public.jsonb_merge(a jsonb, b jsonb) returns jsonb language sql immutable as $$
  select case
    when jsonb_typeof(a) = 'object' and jsonb_typeof(b) = 'object' then
      coalesce((select jsonb_object_agg(k, case
          when a ? k and b ? k then public.jsonb_merge(a -> k, b -> k)
          when b ? k then b -> k else a -> k end)
        from (select jsonb_object_keys(a) as k union select jsonb_object_keys(b)) keys), '{}'::jsonb)
    else b end;
$$;
create or replace function public.touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

-- ---------- Tables ----------
create table if not exists public.config (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.plans (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.accounts (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now(),
  email text generated always as (lower(data ->> 'email')) stored);
create table if not exists public.couriers (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now(),
  status text generated always as (data ->> 'status') stored);
create table if not exists public.courier_docs (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now());
create table if not exists public.orders (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now(),
  customer_id text generated always as (data -> 'customer' ->> 'id') stored,
  customer_email text generated always as (lower(data -> 'customer' ->> 'email')) stored,
  courier_id text generated always as (data -> 'courier' ->> 'id') stored,
  offer_to text generated always as (data -> 'offer' ->> 'to') stored,
  status text generated always as (data ->> 'status') stored,
  code text generated always as (data ->> 'code') stored);
create table if not exists public.messages (order_id text not null references public.orders(id) on delete cascade, id text not null,
  data jsonb not null default '{}', updated_at timestamptz not null default now(), primary key (order_id, id));
create table if not exists public.invoices (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now(),
  account_id text generated always as (data ->> 'accountId') stored);
create table if not exists public.tickets (id text primary key, data jsonb not null default '{}', updated_at timestamptz not null default now(),
  account_id text generated always as (data ->> 'accountId') stored,
  courier_id text generated always as (data ->> 'courierId') stored);

create index if not exists orders_customer on public.orders (customer_id);
create index if not exists orders_courier on public.orders (courier_id);
create index if not exists orders_status on public.orders (status);
create index if not exists invoices_account on public.invoices (account_id);

do $$ declare t text; begin
  foreach t in array array['config','plans','accounts','couriers','courier_docs','orders','messages','invoices','tickets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch()', t);
  end loop;
end $$;

-- Who is signed in, as text, so it compares with document ids.
create or replace function public.uid() returns text language sql stable as $$ select auth.uid()::text $$;
create or replace function public.is_courier() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.couriers c where c.id = auth.uid()::text and c.status = 'approved');
$$;

-- ---------- Access rules ----------
-- Settings, prices, rules and plans: everyone reads, admins write.
create policy "config: read" on public.config for select using (true);
create policy "config: admin writes" on public.config for all using (public.is_admin()) with check (public.is_admin());
create policy "plans: read" on public.plans for select using (true);
create policy "plans: admin writes" on public.plans for all using (public.is_admin()) with check (public.is_admin());

-- Accounts: your own, or admin.
create policy "accounts: own or admin" on public.accounts for select using (id = public.uid() or public.is_admin());
create policy "accounts: create own" on public.accounts for insert with check (id = public.uid() or public.is_admin());
create policy "accounts: update own or admin" on public.accounts for update using (id = public.uid() or public.is_admin());
create policy "accounts: admin deletes" on public.accounts for delete using (public.is_admin());
-- Customers can't give themselves credit: only admin (or the server) can raise it.
create or replace function public.guard_credit() returns trigger language plpgsql as $$
begin
  if not public.is_admin() and coalesce((new.data ->> 'credit')::numeric, 0) > coalesce((old.data ->> 'credit')::numeric, 0)
     and current_setting('dart.server', true) is distinct from 'on' then
    raise exception 'Only DART can add credit';
  end if;
  return new;
end; $$;
drop trigger if exists guard_credit on public.accounts;
create trigger guard_credit before update on public.accounts for each row execute function public.guard_credit();

-- Couriers: your own record, admin, and approved couriers (needed while offers are handed out by the apps).
create policy "couriers: read" on public.couriers for select using (id = public.uid() or public.is_admin() or public.is_courier());
create policy "couriers: apply" on public.couriers for insert with check (id = public.uid() and (data ->> 'status') = 'pending');
create policy "couriers: update own or admin" on public.couriers for update using (id = public.uid() or public.is_admin());
create policy "couriers: admin deletes" on public.couriers for delete using (public.is_admin());
create or replace function public.guard_courier() returns trigger language plpgsql as $$
begin
  if not public.is_admin() and (new.data ->> 'status') is distinct from (old.data ->> 'status') then
    raise exception 'Only DART can approve couriers';
  end if;
  return new;
end; $$;
drop trigger if exists guard_courier on public.couriers;
create trigger guard_courier before update on public.couriers for each row execute function public.guard_courier();

-- Courier documents: the courier and admin only.
create policy "courier docs: own or admin" on public.courier_docs for all using (id = public.uid() or public.is_admin()) with check (id = public.uid() or public.is_admin());

-- Deliveries.
create policy "orders: read" on public.orders for select using (
  public.is_admin() or customer_id = public.uid() or courier_id = public.uid() or offer_to = public.uid()
  or (status = 'awaiting' and public.is_courier()));
create policy "orders: book" on public.orders for insert with check (
  public.is_admin() or customer_id = public.uid()
  or (auth.uid() is null and (data -> 'customer' ->> 'guest') = 'true' and customer_id like 'g-%'));
create policy "orders: update" on public.orders for update using (
  public.is_admin() or customer_id = public.uid() or courier_id = public.uid() or offer_to = public.uid()
  or (status = 'awaiting' and public.is_courier()));
create policy "orders: admin deletes" on public.orders for delete using (public.is_admin());

-- Chat: anyone who can see the delivery.
create policy "messages: read" on public.messages for select using (exists (select 1 from public.orders o where o.id = order_id));
create policy "messages: write" on public.messages for insert with check (exists (select 1 from public.orders o where o.id = order_id));
create policy "messages: update" on public.messages for update using (exists (select 1 from public.orders o where o.id = order_id));

-- Invoices: your own, or admin. The courier's app issues the invoice at delivery.
create policy "invoices: own or admin" on public.invoices for select using (account_id = public.uid() or public.is_admin());
create policy "invoices: issue" on public.invoices for insert with check (auth.uid() is not null);
create policy "invoices: admin updates" on public.invoices for update using (public.is_admin() or account_id = public.uid());

-- Support: anyone can write in; you see your own; admin sees all.
create policy "tickets: read" on public.tickets for select using (public.is_admin() or account_id = public.uid() or courier_id = public.uid());
create policy "tickets: create" on public.tickets for insert with check (true);
create policy "tickets: update" on public.tickets for update using (public.is_admin() or account_id = public.uid() or courier_id = public.uid());

-- ---------- Document operations used by the apps ----------
create or replace function public._dart_table(p text) returns text language sql immutable as $$
  select case p when 'courierDocs' then 'courier_docs' else p end
  where p in ('config','plans','accounts','couriers','courierDocs','courier_docs','orders','invoices','tickets');
$$;
-- Merge a patch into one document (row-level security still applies).
create or replace function public.patch_doc(p_table text, p_id text, p_patch jsonb) returns boolean language plpgsql security invoker as $$
declare t text := public._dart_table(p_table); n int;
begin
  if t is null then raise exception 'Unknown collection %', p_table; end if;
  execute format('update public.%I set data = public.jsonb_merge(data, $1) where id = $2', t) using p_patch, p_id;
  get diagnostics n = row_count; return n > 0;
end; $$;
-- Apply a patch only if the document hasn't changed since it was read (single winner).
create or replace function public.claim_doc(p_table text, p_id text, p_patch jsonb, p_seen timestamptz) returns boolean language plpgsql security invoker as $$
declare t text := public._dart_table(p_table); n int;
begin
  if t is null then raise exception 'Unknown collection %', p_table; end if;
  execute format('update public.%I set data = public.jsonb_merge(data, $1) where id = $2 and updated_at = $3', t) using p_patch, p_id, p_seen;
  get diagnostics n = row_count; return n > 0;
end; $$;

-- ---------- Server-side helpers that look across customers ----------
-- Track a guest delivery with its code and the email used to book.
create or replace function public.track_order(p_code text, p_email text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', o.id) || o.data from public.orders o
  where o.id = upper(trim(p_code)) and o.customer_email = lower(trim(p_email)) limit 1;
$$;
-- Guest cancels before collection.
create or replace function public.guest_cancel(p_code text, p_email text) returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.orders set data = public.jsonb_merge(data, jsonb_build_object('status', 'cancelled', 'cancelledBy', 'customer',
      'timeline', jsonb_build_object('cancelled', (extract(epoch from now()) * 1000)::bigint),
      'billing', case when data -> 'billing' ->> 'status' = 'paid' then jsonb_build_object('status', 'refunded') else '{}'::jsonb end))
  where id = upper(trim(p_code)) and customer_email = lower(trim(p_email)) and status in ('awaiting', 'assigned', 'to_pickup');
  get diagnostics n = row_count; return n > 0;
end; $$;
-- Who a referral code belongs to (first name only).
create or replace function public.referrer_for(p_code text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', a.id, 'name', split_part(coalesce(a.data ->> 'name', ''), ' ', 1)) from public.accounts a
  where upper(coalesce(a.data ->> 'refCode', upper(left(regexp_replace(split_part(coalesce(a.data ->> 'name', ''), ' ', 1), '[^A-Za-z]', '', 'g'), 6)) || upper(right(regexp_replace(a.id, '[^A-Za-z0-9]', '', 'g'), 3)))) = upper(p_code)
  limit 1;
$$;
-- How many times a code has been used, overall and by one customer.
create or replace function public.code_uses(p_code text, p_uid text, p_email text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'total', count(*),
    'mine', count(*) filter (where customer_id = p_uid or customer_email = lower(coalesce(p_email, ''))),
    'booked', (select count(*) from public.orders o2 where o2.status <> 'cancelled' and (o2.customer_id = p_uid or o2.customer_email = lower(coalesce(p_email, '')))))
  from public.orders where data -> 'billing' -> 'discount' ->> 'code' = upper(p_code) and status <> 'cancelled';
$$;
-- Give the referrer their credit once the friend's first delivery is delivered.
create or replace function public.reward_referral(p_order text) returns boolean language plpgsql security definer set search_path = public as $$
declare o record; ref text; amt numeric; acc record; n int;
begin
  select * into o from public.orders where id = p_order and status = 'delivered' and coalesce(data ->> 'refRewarded', '') = '' for update;
  if not found then return false; end if;
  ref := o.data -> 'billing' -> 'discount' ->> 'referrer'; if ref is null then return false; end if;
  select (c.data ->> 'referralReward')::numeric into amt from public.config c where c.id = 'pricing';
  amt := coalesce(amt, 5);
  update public.orders set data = data || jsonb_build_object('refRewarded', (extract(epoch from now()) * 1000)::bigint) where id = p_order;
  perform set_config('dart.server', 'on', true);
  update public.accounts set data = data || jsonb_build_object(
      'credit', round(coalesce((data ->> 'credit')::numeric, 0) + amt, 2),
      'creditLog', coalesce(data -> 'creditLog', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('amount', amt, 'reason', 'Friend''s first delivery: ' || split_part(coalesce(o.data -> 'customer' ->> 'name', ''), ' ', 1), 'at', (extract(epoch from now()) * 1000)::bigint)))
  where id = ref;
  get diagnostics n = row_count; return n > 0;
end; $$;

grant execute on function public.track_order(text, text), public.guest_cancel(text, text), public.referrer_for(text), public.code_uses(text, text, text) to anon, authenticated;
grant execute on function public.patch_doc(text, text, jsonb), public.claim_doc(text, text, jsonb, timestamptz), public.reward_referral(text) to authenticated;

-- ---------- Live updates ----------
do $$ declare t text; begin
  foreach t in array array['config','plans','accounts','couriers','orders','messages','invoices','tickets'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t); exception when duplicate_object then null; end;
  end loop;
end $$;
