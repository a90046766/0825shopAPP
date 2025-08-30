-- Fix staff RLS policies to avoid recursion and allow anon/authenticated basic CRUD
do $$ begin
  if to_regclass('public.staff') is null then return; end if;
  begin execute 'alter table public.staff enable row level security'; exception when others then end;
  begin execute 'drop policy if exists staff_select on public.staff'; exception when others then end;
  begin execute 'drop policy if exists staff_insert on public.staff'; exception when others then end;
  begin execute 'drop policy if exists staff_update on public.staff'; exception when others then end;
  begin execute 'drop policy if exists staff_delete on public.staff'; exception when others then end;
  -- Simplest open policies for now (adjust later per role)
  execute 'create policy staff_select on public.staff for select using (true)';
  execute 'create policy staff_insert on public.staff for insert with check (true)';
  execute 'create policy staff_update on public.staff for update using (true) with check (true)';
  execute 'create policy staff_delete on public.staff for delete using (true)';
end $$;


