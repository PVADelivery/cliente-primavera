-- ============================================================
-- Espaço Social — classificados da cidade
-- Rodar no SQL Editor do Supabase EXTERNO do projeto.
-- ============================================================

do $$ begin
  create type public.social_category as enum ('vagas', 'achados', 'doacoes', 'servicos');
exception when duplicate_object then null; end $$;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.social_category not null,
  title text not null,
  body text,
  contact text,
  images text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

grant select on public.social_posts to anon;
grant select, insert, update, delete on public.social_posts to authenticated;
grant all on public.social_posts to service_role;

alter table public.social_posts enable row level security;

drop policy if exists "social_posts_public_read" on public.social_posts;
create policy "social_posts_public_read"
  on public.social_posts for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "social_posts_owner_insert" on public.social_posts;
create policy "social_posts_owner_insert"
  on public.social_posts for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "social_posts_owner_update" on public.social_posts;
create policy "social_posts_owner_update"
  on public.social_posts for update
  to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "social_posts_owner_delete" on public.social_posts;
create policy "social_posts_owner_delete"
  on public.social_posts for delete
  to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create index if not exists social_posts_feed_idx on public.social_posts (is_active, category, created_at desc);