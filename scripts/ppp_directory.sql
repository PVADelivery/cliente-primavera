-- PPP — Painel Profissional Prestador de Serviços
-- Executar no Supabase EXTERNO oficial (owlbzwsdcognrgolvnzg) no SQL Editor.
-- Nada aqui é destrutivo: apenas adiciona colunas/tabela e políticas.

-- 1) Colunas de localização, foto e dono no diretório de prestadores
alter table public.business_directory add column if not exists latitude double precision;
alter table public.business_directory add column if not exists longitude double precision;
alter table public.business_directory add column if not exists card_image_url text;
alter table public.business_directory add column if not exists owner_id uuid;

-- Permitir que usuários autenticados cadastrem seu próprio prestador
alter table public.business_directory enable row level security;

drop policy if exists "directory public read" on public.business_directory;
create policy "directory public read"
  on public.business_directory for select
  to anon, authenticated
  using (true);

drop policy if exists "directory owner insert" on public.business_directory;
create policy "directory owner insert"
  on public.business_directory for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "directory owner update" on public.business_directory;
create policy "directory owner update"
  on public.business_directory for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on public.business_directory to anon;
grant select, insert, update on public.business_directory to authenticated;
grant all on public.business_directory to service_role;

-- 2) Solicitações de orçamento
create table if not exists public.directory_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id text,
  customer_name text not null,
  customer_whatsapp text not null,
  category text not null,
  description text not null,
  status text not null default 'aberto',
  created_at timestamptz not null default now()
);

grant select, insert on public.directory_quotes to anon;
grant select, insert, update on public.directory_quotes to authenticated;
grant all on public.directory_quotes to service_role;

alter table public.directory_quotes enable row level security;

drop policy if exists "quotes insert any" on public.directory_quotes;
create policy "quotes insert any"
  on public.directory_quotes for insert
  to anon, authenticated
  with check (true);

drop policy if exists "quotes read own" on public.directory_quotes;
create policy "quotes read own"
  on public.directory_quotes for select
  to authenticated
  using (user_id = auth.uid());

-- Visitantes (sem login) leem apenas pelo device_id informado no filtro.
drop policy if exists "quotes read device" on public.directory_quotes;
create policy "quotes read device"
  on public.directory_quotes for select
  to anon
  using (device_id is not null);

create index if not exists directory_quotes_user_idx on public.directory_quotes (user_id, created_at desc);
create index if not exists directory_quotes_device_idx on public.directory_quotes (device_id, created_at desc);

-- 3) Bucket público para as fotos dos prestadores (se ainda não existir)
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

drop policy if exists "public assets read" on storage.objects;
create policy "public assets read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'public-assets');

drop policy if exists "public assets upload" on storage.objects;
create policy "public assets upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'public-assets');
