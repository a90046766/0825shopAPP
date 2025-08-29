-- Protect primary accounts in staff & technicians tables
do $$ begin
  create or replace function public.block_modification_on_primary_staff()
  returns trigger
  language plpgsql
  as $$
  begin
    if lower(OLD.email) in (
      'a90046766@gmail.com',
      'xiaofu888@yahoo.com.tw',
      'jason660628@yahoo.com.tw'
    ) then
      raise exception 'PRIMARY_STAFF_ACCOUNT_PROTECTED';
    end if;
    return null;
  end $$;
exception when others then null; end $$;

do $$ begin
  perform 1 from pg_trigger where tgname = 'tg_staff_block_primary_delete';
  if not found then
    create trigger tg_staff_block_primary_delete
      before delete on public.staff
      for each row execute function public.block_modification_on_primary_staff();
  end if;
exception when others then null; end $$;

do $$ begin
  perform 1 from pg_trigger where tgname = 'tg_staff_block_primary_update';
  if not found then
    create trigger tg_staff_block_primary_update
      before update on public.staff
      for each row when (lower(OLD.email) in (
        'a90046766@gmail.com',
        'xiaofu888@yahoo.com.tw'
      )) execute function public.block_modification_on_primary_staff();
  end if;
exception when others then null; end $$;

-- Optional: protect primary technician by email as well (if needed)
do $$ begin
  create or replace function public.block_modification_on_primary_technician()
  returns trigger
  language plpgsql
  as $$
  begin
    if lower(OLD.email) in (
      'jason660628@yahoo.com.tw'
    ) then
      raise exception 'PRIMARY_TECH_ACCOUNT_PROTECTED';
    end if;
    return null;
  end $$;
exception when others then null; end $$;

do $$ begin
  perform 1 from pg_trigger where tgname = 'tg_technicians_block_primary_delete';
  if not found then
    create trigger tg_technicians_block_primary_delete
      before delete on public.technicians
      for each row execute function public.block_modification_on_primary_technician();
  end if;
exception when others then null; end $$;

do $$ begin
  perform 1 from pg_trigger where tgname = 'tg_technicians_block_primary_update';
  if not found then
    create trigger tg_technicians_block_primary_update
      before update on public.technicians
      for each row when (lower(OLD.email) in ('jason660628@yahoo.com.tw'))
      execute function public.block_modification_on_primary_technician();
  end if;
exception when others then null; end $$;


