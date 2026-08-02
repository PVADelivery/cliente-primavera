-- ============================================================
-- Central de Negócios — veículos à venda
-- Rodar no SQL Editor do Supabase EXTERNO do projeto.
-- ============================================================

do $$ begin
  create type public.vehicle_type as enum ('carro', 'moto', 'caminhao', 'utilitario', 'outro');
exception when duplicate_object then null; end $$;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  seller_name text,
  vehicle_type public.vehicle_type not null default 'carro',
  brand text,
  model text not null,
  year int,
  km int,
  fuel text,
  transmission text,
  color text,
  city text default 'Primavera do Leste',
  state text default 'MT',
  description text,
  price numeric,
  contact_phone text,
  images text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.vehicles to anon;
grant select, insert, update, delete on public.vehicles to authenticated;
grant all on public.vehicles to service_role;

alter table public.vehicles enable row level security;

drop policy if exists "vehicles_public_read" on public.vehicles;
create policy "vehicles_public_read"
  on public.vehicles for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "vehicles_owner_insert" on public.vehicles;
create policy "vehicles_owner_insert"
  on public.vehicles for insert
  to authenticated
  with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "vehicles_owner_update" on public.vehicles;
create policy "vehicles_owner_update"
  on public.vehicles for update
  to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "vehicles_owner_delete" on public.vehicles;
create policy "vehicles_owner_delete"
  on public.vehicles for delete
  to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create index if not exists vehicles_active_idx on public.vehicles (is_active, vehicle_type, price);
