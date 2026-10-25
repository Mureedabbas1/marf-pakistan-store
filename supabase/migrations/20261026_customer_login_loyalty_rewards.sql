-- MARF Pakistan customer accounts and delivered-order loyalty rewards
-- 5 points per PKR 100 eligible item subtotal; 100 points are worth PKR 10.
create schema if not exists private;
alter table public.orders add column if not exists customer_id uuid references auth.users(id) on delete set null;
create table if not exists public.customer_profiles(user_id uuid primary key references auth.users(id) on delete cascade,full_name text,phone text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.loyalty_ledger(id uuid primary key default gen_random_uuid(),customer_id uuid not null references auth.users(id) on delete cascade,order_id uuid references public.orders(id) on delete set null,entry_type text not null check(entry_type in ('earned','reversed','redeemed','adjustment')),points_change integer not null check(points_change<>0),note text,created_at timestamptz not null default now());
create index if not exists orders_customer_id_created_at_idx on public.orders(customer_id,created_at desc);
create index if not exists loyalty_ledger_customer_id_created_at_idx on public.loyalty_ledger(customer_id,created_at desc);
create index if not exists loyalty_ledger_order_id_idx on public.loyalty_ledger(order_id);
alter table public.customer_profiles enable row level security;
alter table public.loyalty_ledger enable row level security;
drop policy if exists "Customers can view their own profile" on public.customer_profiles;
create policy "Customers can view their own profile" on public.customer_profiles for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Customers can update their own profile" on public.customer_profiles;
create policy "Customers can update their own profile" on public.customer_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Customers can view their own loyalty ledger" on public.loyalty_ledger;
create policy "Customers can view their own loyalty ledger" on public.loyalty_ledger for select to authenticated using(customer_id=(select auth.uid()));
drop policy if exists "Customers can view their own orders" on public.orders;
create policy "Customers can view their own orders" on public.orders for select to authenticated using(customer_id=(select auth.uid()));
drop policy if exists "Customers can view their own order items" on public.order_items;
create policy "Customers can view their own order items" on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_items.order_id and o.customer_id=(select auth.uid())));
create or replace function private.handle_new_customer() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.customer_profiles(user_id,full_name) values(new.id,nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name','')),'')) on conflict(user_id) do nothing; return new; end; $$;
revoke all on function private.handle_new_customer() from public,anon,authenticated;
drop trigger if exists on_auth_user_created_customer_profile on auth.users;
create trigger on_auth_user_created_customer_profile after insert on auth.users for each row execute function private.handle_new_customer();
create or replace function private.attach_customer_to_order() returns trigger language plpgsql set search_path='' as $$
begin if new.customer_id is null then new.customer_id:=auth.uid(); end if; return new; end; $$;
revoke all on function private.attach_customer_to_order() from public,anon,authenticated;
drop trigger if exists attach_customer_to_order on public.orders;
create trigger attach_customer_to_order before insert on public.orders for each row execute function private.attach_customer_to_order();
create or replace function private.apply_loyalty_on_order_status() returns trigger language plpgsql security definer set search_path='' as $$
declare v_last_type text; v_last_points integer; v_points integer;
begin
if new.customer_id is null then return new; end if;
select l.entry_type,l.points_change into v_last_type,v_last_points from public.loyalty_ledger l where l.order_id=new.id order by l.created_at desc,l.id desc limit 1;
if new.status='delivered' and old.status is distinct from 'delivered' then
 if v_last_type is distinct from 'earned' then
  v_points:=floor(greatest(coalesce(new.subtotal_pkr,0),0)/100)*5;
  if v_points>0 then insert into public.loyalty_ledger(customer_id,order_id,entry_type,points_change,note) values(new.customer_id,new.id,'earned',v_points,'Earned for delivered order #'||new.order_number::text); end if;
 end if;
elsif old.status='delivered' and new.status is distinct from 'delivered' then
 if v_last_type='earned' and coalesce(v_last_points,0)>0 then insert into public.loyalty_ledger(customer_id,order_id,entry_type,points_change,note) values(new.customer_id,new.id,'reversed',-v_last_points,'Reversed because order #'||new.order_number::text||' is no longer delivered'); end if;
end if; return new; end; $$;
revoke all on function private.apply_loyalty_on_order_status() from public,anon,authenticated;
drop trigger if exists apply_loyalty_on_order_status on public.orders;
create trigger apply_loyalty_on_order_status after update of status on public.orders for each row execute function private.apply_loyalty_on_order_status();
grant select on public.customer_profiles to authenticated;
grant update(full_name,phone,updated_at) on public.customer_profiles to authenticated;
grant select on public.loyalty_ledger,public.orders,public.order_items to authenticated;
