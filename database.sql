-- Run this once in your Supabase project's SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_user_profile();

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to authenticated;

create table if not exists public.products (
  id text primary key,
  name text not null check (char_length(name) between 1 and 70),
  category text not null check (char_length(category) between 1 and 35),
  description text not null check (char_length(description) between 1 and 220),
  price numeric(10, 2) not null check (price > 0),
  size text not null check (char_length(size) between 1 and 30),
  image text not null check (image ~ '^https?://'),
  badge text not null default '' check (char_length(badge) <= 25),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_promotion (
  id boolean primary key default true check (id),
  eyebrow text not null check (char_length(eyebrow) between 1 and 60),
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) between 1 and 180),
  button_text text not null check (char_length(button_text) between 1 and 40),
  button_link text not null,
  image text not null check (image ~ '^https?://'),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 99),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email))),
  created_at timestamptz not null default now()
);

create or replace function public.add_cart_item(p_product_id text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.cart_items (user_id, product_id, quantity)
  values ((select auth.uid()), p_product_id, 1)
  on conflict (user_id, product_id)
  do update set
    quantity = least(public.cart_items.quantity + 1, 99),
    updated_at = now();
end;
$$;

revoke all on function public.add_cart_item(text) from public;
grant execute on function public.add_cart_item(text) to authenticated;

create table if not exists public.store_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  record_type text not null,
  record_id text not null,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_product_updated_at on public.products;
create trigger touch_product_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_promotion_updated_at on public.homepage_promotion;
create trigger touch_promotion_updated_at
  before update on public.homepage_promotion
  for each row execute function public.touch_updated_at();
drop trigger if exists touch_cart_item_updated_at on public.cart_items;
create trigger touch_cart_item_updated_at
  before update on public.cart_items
  for each row execute function public.touch_updated_at();

alter table public.user_profiles enable row level security;
alter table public.products enable row level security;
alter table public.homepage_promotion enable row level security;
alter table public.cart_items enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.store_audit_log enable row level security;

drop policy if exists "Customers and admins can read profiles" on public.user_profiles;
create policy "Customers and admins can read profiles"
  on public.user_profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_store_admin()));
drop policy if exists "Customers can update their own profile" on public.user_profiles;
create policy "Customers can update their own profile"
  on public.user_profiles for update to authenticated
  using (id = (select auth.uid()) and role = 'customer')
  with check (id = (select auth.uid()) and role = 'customer');
drop policy if exists "Admins can update profiles" on public.user_profiles;
create policy "Admins can update profiles"
  on public.user_profiles for update to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));

drop policy if exists "Anyone can read products" on public.products;
create policy "Anyone can read products"
  on public.products for select to anon, authenticated using (true);
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
  on public.products for all to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));

drop policy if exists "Anyone can read the homepage promotion" on public.homepage_promotion;
create policy "Anyone can read the homepage promotion"
  on public.homepage_promotion for select to anon, authenticated using (true);
drop policy if exists "Admins manage the homepage promotion" on public.homepage_promotion;
create policy "Admins manage the homepage promotion"
  on public.homepage_promotion for all to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));

drop policy if exists "Customers manage their own cart" on public.cart_items;
create policy "Customers manage their own cart"
  on public.cart_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Anyone can subscribe to the newsletter" on public.newsletter_subscribers;
create policy "Anyone can subscribe to the newsletter"
  on public.newsletter_subscribers for insert to anon, authenticated
  with check (email = lower(trim(email)));
drop policy if exists "Admins can read newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins can read newsletter subscribers"
  on public.newsletter_subscribers for select to authenticated
  using ((select public.is_store_admin()));

drop policy if exists "Admins can read audit history" on public.store_audit_log;
create policy "Admins can read audit history"
  on public.store_audit_log for select to authenticated
  using ((select public.is_store_admin()));

create or replace function public.log_store_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_id text;
begin
  if tg_op = 'DELETE' then
    changed_id := old.id::text;
  else
    changed_id := new.id::text;
  end if;
  insert into public.store_audit_log (actor_id, action, record_type, record_id)
  values ((select auth.uid()), tg_op, tg_table_name, changed_id);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists audit_product_changes on public.products;
create trigger audit_product_changes
  after insert or update or delete on public.products
  for each row execute function public.log_store_change();
drop trigger if exists audit_promotion_changes on public.homepage_promotion;
create trigger audit_promotion_changes
  after insert or update or delete on public.homepage_promotion
  for each row execute function public.log_store_change();

grant select on public.products, public.homepage_promotion to anon, authenticated;
grant select, update on public.user_profiles to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select on public.newsletter_subscribers, public.store_audit_log to authenticated;
grant insert, update, delete on public.products, public.homepage_promotion to authenticated;

insert into public.products (id, name, category, description, price, size, image, badge, sort_order)
values
  ('midnight-crunch', 'Midnight Crunch', 'Dark chocolate', 'Deep, silky dark chocolate with a little roasted almond crunch and a pinch of flaky sea salt.', 12, '80g bar', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=85', 'Bestseller', 1),
  ('milk-honey', 'Milk & Honey', 'Milk chocolate', 'Creamy, dreamy milk chocolate with a hint of golden honey. A soft spot in every day.', 11, '80g bar', 'https://images.unsplash.com/photo-1548907040-4d42baa1d13a?auto=format&fit=crop&w=900&q=85', 'A little favorite', 2),
  ('berry-blush', 'Berry Blush', 'White chocolate', 'Sweet white chocolate meets bright, tart raspberry. The fun one in the box.', 13, '80g bar', 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=900&q=85', '', 3),
  ('the-slow-sunday', 'The Slow Sunday', 'Gift boxes', 'A thoughtful collection of our most-loved bars, ready to make somebody''s day.', 28, '4-piece box', 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=900&q=85', 'Made for sharing', 4),
  ('orange-grove', 'Orange Grove', 'Dark chocolate', 'Bright citrus peel tucked into rich dark chocolate. A little sunshine, whenever you need it.', 12, '80g bar', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=85', '', 5),
  ('soft-center', 'Soft Center', 'Gift boxes', 'A box of tender, hand-finished ganache truffles for the people you love (including you).', 24, '9-piece box', 'https://images.unsplash.com/photo-1548907040-4d42baa1d13a?auto=format&fit=crop&w=900&q=85', 'Gift-ready', 6)
on conflict (id) do nothing;

insert into public.homepage_promotion (id, eyebrow, title, description, button_text, button_link, image)
values (true, 'A sweeter kind of everyday', 'A little more delicious.', 'Small-batch chocolate, made slowly and shared generously. Find your new favorite little ritual.', 'Discover the collection', 'shop.html', 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1400&q=85')
on conflict (id) do nothing;

-- After the first account signs up, grant admin access from the SQL Editor:
-- update public.user_profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'you@example.com');
