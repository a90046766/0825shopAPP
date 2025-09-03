-- Site CMS tables: nav, banners, sections, settings
do $$ begin
  -- site_nav
  if to_regclass('public.site_nav') is null then
    create table public.site_nav (
      id uuid primary key default gen_random_uuid(),
      label text not null,
      path text not null,
      sort_order integer default 0,
      active boolean default true,
      updated_at timestamptz default now()
    );
  end if;

  -- site_banners
  if to_regclass('public.site_banners') is null then
    create table public.site_banners (
      id uuid primary key default gen_random_uuid(),
      slot text not null, -- e.g. home-hero, home-scroller, cleaning-hero, etc.
      title text,
      subtitle text,
      image_url text,
      href text,
      sort_order integer default 0,
      active boolean default true,
      updated_at timestamptz default now()
    );
  end if;

  -- site_sections
  if to_regclass('public.site_sections') is null then
    create table public.site_sections (
      id uuid primary key default gen_random_uuid(),
      page text not null,   -- '/', 'services/cleaning', 'services/home', 'appliances', 'used'
      kind text default 'content',
      title text,
      content text,
      image_url text,
      sort_order integer default 0,
      active boolean default true,
      updated_at timestamptz default now()
    );
  end if;

  -- site_settings
  if to_regclass('public.site_settings') is null then
    create table public.site_settings (
      id text primary key,
      brand_color text,
      phone text,
      email text,
      line_url text,
      updated_at timestamptz default now()
    );
    insert into public.site_settings(id, brand_color)
      values ('default', '#00B5AD') on conflict (id) do nothing;
  end if;

  -- updated_at trigger
  begin execute 'create or replace function public.set_updated_at() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql'; exception when others then end;
  begin execute 'drop trigger if exists trg_site_nav_upd on public.site_nav'; exception when others then end;
  begin execute 'create trigger trg_site_nav_upd before update on public.site_nav for each row execute function public.set_updated_at()'; exception when others then end;
  begin execute 'drop trigger if exists trg_site_banners_upd on public.site_banners'; exception when others then end;
  begin execute 'create trigger trg_site_banners_upd before update on public.site_banners for each row execute function public.set_updated_at()'; exception when others then end;
  begin execute 'drop trigger if exists trg_site_sections_upd on public.site_sections'; exception when others then end;
  begin execute 'create trigger trg_site_sections_upd before update on public.site_sections for each row execute function public.set_updated_at()'; exception when others then end;
  begin execute 'drop trigger if exists trg_site_settings_upd on public.site_settings'; exception when others then end;
  begin execute 'create trigger trg_site_settings_upd before update on public.site_settings for each row execute function public.set_updated_at()'; exception when others then end;

  -- Enable RLS
  begin execute 'alter table public.site_nav enable row level security'; exception when others then end;
  begin execute 'alter table public.site_banners enable row level security'; exception when others then end;
  begin execute 'alter table public.site_sections enable row level security'; exception when others then end;
  begin execute 'alter table public.site_settings enable row level security'; exception when others then end;

  -- Drop old policies
  perform 1;
  for pol in select policyname, tablename from pg_policies where schemaname='public' and tablename in ('site_nav','site_banners','site_sections','site_settings') loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;

  -- Read: allow all
  execute $$ create policy site_nav_select on public.site_nav for select using (true) $$;
  execute $$ create policy site_banners_select on public.site_banners for select using (true) $$;
  execute $$ create policy site_sections_select on public.site_sections for select using (true) $$;
  execute $$ create policy site_settings_select on public.site_settings for select using (true) $$;

  -- Write: staff admin/support only
  execute $$
    create policy site_nav_write on public.site_nav
    for all using (
      exists (select 1 from public.staff s where lower(s.email)=lower(auth.email()) and s.role in ('admin','support'))
    ) with check (
      exists (select 1 from public.staff s where lower(s.email)=lower(auth.email()) and s.role in ('admin','support'))
    )
  $$;
  execute $$
    create policy site_banners_write on public.site_banners
    for all using (
      exists (select 1 from public.staff s where lower(s.email)=lower(auth.email()) and s.role in ('admin','support'))
    ) with check (
      exists (select 1 from public.staff s where lower(s.email)=lower(auth.email()) and s.role in ('admin','support'))
    )
  $$;
  execute $$
    create policy site_sections_write on public.site_sections
    for all using (
      exists (select 1 from public.staff s where lower(s.email)=lower(auth.email()) and s.role in ('admin','support'))
    ) with check (
      exists (select 1 from public.staff s where lower(s.email)=lower(auth.email()) and s.role in ('admin','support'))
    )
  $$;
  execute $$
    create policy site_settings_write on public.site_settings
    for all using (
      exists (select 1 from public.staff s where lower(s.email)=lower(auth.email()) and s.role in ('admin','support'))
    ) with check (
      exists (select 1 from public.staff s where lower(s.email)=lower(auth.email()) and s.role in ('admin','support'))
    )
  $$;

  -- Seed default nav
  insert into public.site_nav(label, path, sort_order, active) values
    ('首頁','/',0,true),
    ('專業清洗','/services/cleaning',1,true),
    ('居家清潔','/services/home',2,true),
    ('家電購買','/appliances',3,true),
    ('二手家電','/used',4,true),
    ('購物車','/store',5,true)
  on conflict do nothing;
end $$;


