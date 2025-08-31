-- Points awarding rules: members, technicians (SR), sales (SE)

-- Function to apply points for a newly inserted order
create or replace function public.apply_points_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  o record;
  v_amount numeric := 0;
  v_prefix text := '';
  v_ref text := '';
  v_member_points int := 0;
  v_ref_points int := 0;
begin
  select * into o from public.orders where id = p_order_id;
  if not found then return; end if;

  -- Sum line total from service_items JSON
  select coalesce(sum(((it->>'unitPrice')::numeric) * ((it->>'quantity')::int)),0)
    into v_amount
  from jsonb_array_elements(coalesce(o.service_items,'[]'::jsonb)) it;

  -- 1) Member points: every $100 => 1 pt
  if o.member_id is not null then
    v_member_points := floor(coalesce(v_amount,0) / 100.0);
    if v_member_points > 0 then
      update public.members set points = coalesce(points,0) + v_member_points where id = o.member_id;
    end if;
  end if;

  -- 2) Referrer SR/SE: + floor(amount/300) points (active only)
  v_ref := coalesce(o.referrer_code,'');
  if length(v_ref) >= 2 then
    v_prefix := upper(substr(v_ref,1,2));
    if v_prefix = 'SR' then
      v_ref_points := floor(coalesce(v_amount,0) / 300.0);
      if v_ref_points > 0 then
        update public.technicians set points = coalesce(points,0) + v_ref_points
          where upper(code) = upper(v_ref) and status = 'active';
      end if;
    elsif v_prefix = 'SE' then
      v_ref_points := floor(coalesce(v_amount,0) / 300.0);
      if v_ref_points > 0 then
        update public.staff set points = coalesce(points,0) + v_ref_points
          where upper(coalesce(ref_code,'')) = upper(v_ref) and status = 'active' and role = 'sales';
      end if;
    end if;
  end if;
end $$;

-- Trigger wrapper to call above function on orders insert
create or replace function public.tg_apply_points_for_order()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.apply_points_for_order(NEW.id);
  return NEW;
end $$;

do $$ begin
  begin execute 'drop trigger if exists trg_apply_points_for_order on public.orders'; exception when others then end;
  execute 'create trigger trg_apply_points_for_order after insert on public.orders for each row execute function public.tg_apply_points_for_order()';
end $$;


