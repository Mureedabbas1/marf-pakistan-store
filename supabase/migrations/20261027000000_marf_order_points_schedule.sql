-- MARF Rewards order earning schedule
-- PKR 500 = 10 points; PKR 1,000 = 30; then 10 points per additional PKR 500,
-- plus the 10-point bonus for each complete PKR 1,000.
create or replace function private.apply_loyalty_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last_type text;
  v_last_points integer;
  v_points integer;
  v_subtotal numeric(12,2);
begin
  if new.customer_id is null then
    return new;
  end if;

  select l.entry_type, l.points_change
    into v_last_type, v_last_points
  from public.loyalty_ledger l
  where l.order_id = new.id
  order by l.created_at desc, l.id desc
  limit 1;

  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    if v_last_type is distinct from 'earned' then
      v_subtotal := greatest(coalesce(new.subtotal_pkr, 0), 0);
      v_points := floor(v_subtotal / 1000)::integer * 30
                + floor(mod(v_subtotal, 1000) / 500)::integer * 10;

      if v_points > 0 then
        insert into public.loyalty_ledger(customer_id, order_id, entry_type, points_change, note)
        values (
          new.customer_id,
          new.id,
          'earned',
          v_points,
          'MARF Rewards: points for delivered order #' || new.order_number::text || ' using PKR 500 / 1,000 earning schedule'
        );
      end if;
    end if;
  elsif old.status = 'delivered' and new.status is distinct from 'delivered' then
    if v_last_type = 'earned' and coalesce(v_last_points, 0) > 0 then
      insert into public.loyalty_ledger(customer_id, order_id, entry_type, points_change, note)
      values (
        new.customer_id,
        new.id,
        'reversed',
        -v_last_points,
        'Reversed because order #' || new.order_number::text || ' is no longer delivered'
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.apply_loyalty_on_order_status() from public, anon, authenticated;
