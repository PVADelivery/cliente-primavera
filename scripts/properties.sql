-- ============================================================
-- Central de Negócios — imóveis (locação e venda)
-- Rodar no SQL Editor do Supabase EXTERNO do projeto.
-- ============================================================

do $$ begin
  create type public.property_deal as enum ('locacao', 'venda');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_type as enum ('casa', 'apartamento', 'sala', 'kitnet', 'terreno');
exception when duplicate_object then null; end $$;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  agency_name text,
  deal_type public.property_deal not null default 'locacao',
  property_type public.property_type not null,
  neighborhood text,
  city text default 'Primavera do Leste',
  state text default 'MT',
  description text,
  total_area numeric,
  built_area numeric,
  bedrooms int,
  bathrooms int,
  parking int,
  price numeric,
  contact_phone text,
  images text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.properties to anon;
grant select, insert, update, delete on public.properties to authenticated;
grant all on public.properties to service_role;

alter table public.properties enable row level security;

drop policy if exists "properties_public_read" on public.properties;
create policy "properties_public_read"
  on public.properties for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "properties_owner_insert" on public.properties;
create policy "properties_owner_insert"
  on public.properties for insert
  to authenticated
  with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "properties_owner_update" on public.properties;
create policy "properties_owner_update"
  on public.properties for update
  to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "properties_owner_delete" on public.properties;
create policy "properties_owner_delete"
  on public.properties for delete
  to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create index if not exists properties_active_idx on public.properties (is_active, deal_type, property_type);

-- ============================================================
-- Carga inicial dos imóveis
-- ============================================================
insert into public.properties
  (deal_type, property_type, neighborhood, city, state, description, total_area, built_area, bedrooms, bathrooms, parking, price)
values
  ('locacao','terreno','Primavera II','Primavera do Leste','MT',null,1566,null,null,null,null,null),
  ('locacao','sala','Centro','Primavera do Leste','MT','SALA COMERCIAL COM 01 RECEPÇÃO, 01 SALA E 1 LAVABO',27,null,null,1,null,850.00),
  ('locacao','kitnet','Parque Eldorado','Primavera do Leste','MT','KITNET: 01 QUARTO COM BANHEIRO, COZINHA COM LAVANDERIA, ANTENA PARABÓLICA, PORTÃO ELETRONICO, E 01 GARAGEM COBERTA',38,38,1,1,1,900.00),
  ('locacao','casa','Castelandia','Primavera do Leste','MT','CASA NOS FUNDOS COM 02 QUARTOS, 01 BANHEIRO, SALA DE ESTAR, COZINHA, LAVANDERIA, PORTÃO ELETRONICO',60,null,2,1,null,1000.00),
  ('locacao','kitnet','Jardim Milano','Primavera do Leste','MT','KIT NET, COM 01 QUARTO COM 1 BANHEIRO, SALA DE ESTAR E COZINHA CONJUGADA, ÁREA COM LAVANDERIA, GARAGEM SEM COBERTURA, QUINTAL INDIVIDUAL',null,null,1,1,null,1000.00),
  ('locacao','sala','Centro','Primavera do Leste','MT','SALA COMERCIAL COM 01 RECEPÇÃO, 01 SALA GRANDE, E 01 BANHEIRO. CONDOMÍNIO INCLUSO NO VALOR DA LOCAÇÃO. TAXA DE ÁGUA INCLUSA NO CONDOMÍNIO',48,null,null,1,null,1200.00),
  ('locacao','casa','Jardim dos Ipes I','Primavera do Leste','MT',null,44,null,2,1,null,1200.00),
  ('locacao','kitnet','Primavera II','Primavera do Leste','MT',null,null,null,1,1,1,1200.00),
  ('locacao','casa','Novo Horizonte','Primavera do Leste','MT','CASA: 02 QUARTOS, BANHEIRO SOCIAL, SALA ESTAR, COZINHA, LAVANDERIA, GARAGEM',125,80,2,1,1,1200.00),
  ('locacao','casa','Jardim dos Ipes I','Primavera do Leste','MT',null,140,44,2,1,null,1300.00),
  ('locacao','casa','São Cristovao','Primavera do Leste','MT','CASA COM 03 QUARTOS, 01 BANHEIRO SOCIAL, SALA, SALA DE JANTAR E COZINHA AMPLA, LAVANDERIA, GARAGEM COBERTA',null,null,3,1,1,1500.00),
  ('locacao','apartamento','Jardim Milano','Primavera do Leste','MT',null,392,60,2,1,1,1500.00);