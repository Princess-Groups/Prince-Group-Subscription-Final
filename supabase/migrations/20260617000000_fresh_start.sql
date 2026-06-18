-- ============================================================
-- FRESH START: Complete database schema for Prince Groups
-- Run this in Supabase SQL Editor to set up everything
-- ============================================================

-- ============ ENUMS ============
-- Drop and recreate to ensure clean state
DO $$ BEGIN
  DROP TYPE IF EXISTS public.app_role CASCADE;
  DROP TYPE IF EXISTS public.subscription_status CASCADE;
  DROP TYPE IF EXISTS public.payment_status CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

create type public.app_role as enum ('admin', 'user');
create type public.subscription_status as enum ('created','authenticated','active','pending','halted','cancelled','completed','expired','paused');
create type public.payment_status as enum ('created','authorized','captured','failed','refunded');

-- ============ PROFILES ============
-- Drop and recreate
DROP TABLE IF EXISTS public.profiles CASCADE;
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  razorpay_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============ USER ROLES ============
DROP TABLE IF EXISTS public.user_roles CASCADE;
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- ============ PLANS ============
DROP TABLE IF EXISTS public.plans CASCADE;
create table public.plans (
  id text primary key,                    -- 'starter' | 'popular' | 'premium'
  name text not null,
  initial_amount integer not null,        -- in paise (first-day charge)
  monthly_amount integer not null,        -- in paise (monthly recurring)
  razorpay_plan_id text,                  -- set after creating in Razorpay
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.plans enable row level security;

-- Seed the 3 plans (skip if already exist)
insert into public.plans (id, name, initial_amount, monthly_amount) values ('starter', '₹1 Plan', 100, 3000) on conflict (id) do nothing;
insert into public.plans (id, name, initial_amount, monthly_amount) values ('popular', '₹10 Plan', 1000, 30000) on conflict (id) do nothing;
insert into public.plans (id, name, initial_amount, monthly_amount) values ('premium', '₹100 Plan', 10000, 300000) on conflict (id) do nothing;

-- ============ SUBSCRIPTIONS ============
DROP TABLE IF EXISTS public.subscriptions CASCADE;
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  razorpay_subscription_id text unique,
  razorpay_customer_id text,
  status public.subscription_status not null default 'created',
  short_url text,
  current_start timestamptz,
  current_end timestamptz,
  next_charge_at timestamptz,
  paid_count integer not null default 0,
  cancel_at_period_end boolean not null default false,
  paused_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_subscriptions_user_status on public.subscriptions(user_id, status);
create index idx_subscriptions_rzp on public.subscriptions(razorpay_subscription_id);

-- ============ PAYMENTS ============
DROP TABLE IF EXISTS public.payments CASCADE;
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  razorpay_payment_id text unique,
  razorpay_order_id text,
  razorpay_subscription_id text,
  amount integer not null,                -- paise
  currency text not null default 'INR',
  status public.payment_status not null default 'created',
  method text,
  invoice_number text,
  error_code text,
  error_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create index idx_payments_user on public.payments(user_id);
create index idx_payments_sub on public.payments(subscription_id);

-- ============ TIMESTAMP TRIGGER ============
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.tg_set_updated_at();
create trigger plans_updated before update on public.plans for each row execute function public.tg_set_updated_at();
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.tg_set_updated_at();
create trigger payments_updated before update on public.payments for each row execute function public.tg_set_updated_at();

-- ============ NEW USER TRIGGER ============
-- Auto-create profile + user_role when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end $$;

-- Drop old trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS POLICIES ============
-- profiles
DROP POLICY IF EXISTS "profiles_self_select" ON public.profiles;
create policy "profiles_self_select" on public.profiles for select using (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
create policy "profiles_admin_select" on public.profiles for select using (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
create policy "profiles_self_insert" on public.profiles for insert with check (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "roles_self_select" ON public.user_roles;
create policy "roles_self_select" on public.user_roles for select using (auth.uid() = user_id);
DROP POLICY IF EXISTS "roles_admin_all" ON public.user_roles;
create policy "roles_admin_all" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- plans (publicly readable, admin write)
DROP POLICY IF EXISTS "plans_public_select" ON public.plans;
create policy "plans_public_select" on public.plans for select using (true);
DROP POLICY IF EXISTS "plans_admin_write" ON public.plans;
create policy "plans_admin_write" on public.plans for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- subscriptions
DROP POLICY IF EXISTS "subs_self_select" ON public.subscriptions;
create policy "subs_self_select" on public.subscriptions for select using (auth.uid() = user_id);
DROP POLICY IF EXISTS "subs_admin_select" ON public.subscriptions;
create policy "subs_admin_select" on public.subscriptions for select using (public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "subs_self_update" ON public.subscriptions;
create policy "subs_self_update" on public.subscriptions for update using (auth.uid() = user_id);
DROP POLICY IF EXISTS "subs_admin_update" ON public.subscriptions;
create policy "subs_admin_update" on public.subscriptions for update using (public.has_role(auth.uid(),'admin'));

-- payments (read-only for users; service role writes via webhook)
DROP POLICY IF EXISTS "pay_self_select" ON public.payments;
create policy "pay_self_select" on public.payments for select using (auth.uid() = user_id);
DROP POLICY IF EXISTS "pay_admin_select" ON public.payments;
create policy "pay_admin_select" ON public.payments for select using (public.has_role(auth.uid(),'admin'));
