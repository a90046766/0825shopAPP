-- CMS schema for homepage and catalog content

-- 1) Hero slides
create table if not exists hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image text not null,
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2) Services (homepage categories)
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  features jsonb default '[]',
  icon text default 'Sparkles',
  link text default '/shop/products?category=cleaning',
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3) Advantages (why choose us)
create table if not exists advantages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  icon text default 'Award',
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4) Promotions (membership/activities block)
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  items jsonb default '[]', -- array of {heading, subtext}
  cta_label text,
  cta_link text,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5) Loyalty (points block)
create table if not exists loyalty (
  id uuid primary key default gen_random_uuid(),
  earn_per_amount int default 100, -- $100 => 1 point
  redeem_value_per_point numeric default 1, -- 1 point => $1
  notes jsonb default '[]', -- array of strings
  cta_label text,
  cta_link text,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6) Contacts
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  company text,
  tax_id text,
  phone text,
  line_id text,
  zones text, -- long text for service areas
  notes text, -- extra notes
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 7) Categories (catalog tabs)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  sort_order int default 0,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- simple updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 't_upd_hero_slides') then
    create trigger t_upd_hero_slides before update on hero_slides for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 't_upd_services') then
    create trigger t_upd_services before update on services for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 't_upd_advantages') then
    create trigger t_upd_advantages before update on advantages for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 't_upd_promotions') then
    create trigger t_upd_promotions before update on promotions for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 't_upd_loyalty') then
    create trigger t_upd_loyalty before update on loyalty for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 't_upd_contacts') then
    create trigger t_upd_contacts before update on contacts for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 't_upd_categories') then
    create trigger t_upd_categories before update on categories for each row execute function set_updated_at();
  end if;
end $$;

-- Enable RLS (simplified: read public, write authenticated)
alter table hero_slides enable row level security;
alter table services enable row level security;
alter table advantages enable row level security;
alter table promotions enable row level security;
alter table loyalty enable row level security;
alter table contacts enable row level security;
alter table categories enable row level security;

do $$ begin
  perform null from pg_policies where tablename='hero_slides' and policyname='public_read_hero';
  exception when undefined_object then
  null;
end $$;

create policy if not exists public_read_hero on hero_slides for select using (true);
create policy if not exists public_read_services on services for select using (true);
create policy if not exists public_read_adv on advantages for select using (true);
create policy if not exists public_read_promotions on promotions for select using (true);
create policy if not exists public_read_loyalty on loyalty for select using (true);
create policy if not exists public_read_contacts on contacts for select using (true);
create policy if not exists public_read_categories on categories for select using (true);

create policy if not exists auth_write_hero on hero_slides for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy if not exists auth_write_services on services for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy if not exists auth_write_adv on advantages for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy if not exists auth_write_promotions on promotions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy if not exists auth_write_loyalty on loyalty for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy if not exists auth_write_contacts on contacts for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy if not exists auth_write_categories on categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');


