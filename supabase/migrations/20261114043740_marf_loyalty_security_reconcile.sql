-- MARF Pakistan loyalty and COD RPC reconciliation
-- Keeps the current checkout API, removes the obsolete anonymous overload,
-- makes the membership schema reproducible, and adds the missing FK index.

alter table public.customer_profiles
  add column if not exists membership_tier text not null default 'silver';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customer_profiles_membership_tier_check'
      and conrelid = 'public.customer_profiles'::regclass
  ) then
    alter table public.customer_profiles
      add constraint customer_profiles_membership_tier_check
      check (membership_tier in ('silver', 'gold', 'prive'));
  end if;
end;
$$;

-- Keep one auth.users trigger for profile creation and the 30-point welcome award.
create or replace function private.handle_new_marf_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.customer_profiles (user_id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (user_id) do nothing;

  insert into public.loyalty_ledger (customer_id, entry_type, points_change, note)
  select new.id, 'earned', 30, 'Welcome bonus — 30 free points'
  where not exists (
    select 1 from public.loyalty_ledger
    where customer_id = new.id
      and entry_type = 'earned'
      and order_id is null
      and note = 'Welcome bonus — 30 free points'
  );

  return new;
end;
$$;
revoke all on function private.handle_new_marf_customer() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_customer_profile on auth.users;
drop trigger if exists on_auth_user_created_marf on auth.users;
create trigger on_auth_user_created_marf
  after insert on auth.users
  for each row execute function private.handle_new_marf_customer();

-- Membership tiers are achievement-based: Silver -> Gold at 1,200 points,
-- Gold -> Privé at 2,500 points; tiers never automatically downgrade.
create or replace function private.sync_membership_tier_from_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance bigint;
  v_tier text;
  v_target text;
begin
  if new.customer_id is null then
    return new;
  end if;

  select coalesce(sum(points_change), 0)
    into v_balance
  from public.loyalty_ledger
  where customer_id = new.customer_id;

  select membership_tier
    into v_tier
  from public.customer_profiles
  where user_id = new.customer_id
  for update;

  if not found then
    return new;
  end if;

  v_target := v_tier;
  if v_balance >= 2500 then
    v_target := 'prive';
  elsif v_balance >= 1200 and v_tier = 'silver' then
    v_target := 'gold';
  end if;

  if v_target is distinct from v_tier then
    update public.customer_profiles
       set membership_tier = v_target, updated_at = now()
     where user_id = new.customer_id;
  end if;

  return new;
end;
$$;
revoke all on function private.sync_membership_tier_from_points() from public, anon, authenticated;
drop trigger if exists sync_membership_tier_from_points on public.loyalty_ledger;
create trigger sync_membership_tier_from_points
  after insert on public.loyalty_ledger
  for each row execute function private.sync_membership_tier_from_points();

-- Customer profile updates may not self-assign a higher membership tier.
create or replace function private.guard_customer_membership_tier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.membership_tier is distinct from old.membership_tier
     and not coalesce(private.is_admin(), false)
     and pg_trigger_depth() <= 1 then
    raise exception 'Only MARF administrators or the loyalty achievement system can change a membership tier';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_customer_membership_tier() from public, anon, authenticated;
drop trigger if exists guard_customer_membership_tier on public.customer_profiles;
create trigger guard_customer_membership_tier
  before update on public.customer_profiles
  for each row execute function private.guard_customer_membership_tier();

-- The seven-argument legacy overload is no longer used by the storefront.
-- The eight-argument overload remains available for guest and signed-in COD.
-- The nine-argument overload is restricted to signed-in customers redeeming points.
revoke all on function public.place_order(text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.place_order(text, text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.place_order(text, text, text, text, text, text, text, jsonb)
  to anon, authenticated;
revoke all on function public.place_order(text, text, text, text, text, text, text, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function public.place_order(text, text, text, text, text, text, text, jsonb, boolean)
  to authenticated;

create index if not exists order_items_product_id_idx
  on public.order_items(product_id);

grant select on public.customer_profiles to authenticated;
grant update(full_name, phone, updated_at) on public.customer_profiles to authenticated;
grant select on public.loyalty_ledger, public.orders, public.order_items to authenticated;
