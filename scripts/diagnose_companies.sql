-- DIAGNÓSTICO: por que as lojas não aparecem no app?
-- Rode no SQL Editor do Supabase (projeto nptkxlrhrlssdsevpgqe). Somente leitura.

-- 1) A tabela existe e tem linhas?
select count(*) as total_companies from public.companies;

-- 2) Quantas passam nos filtros do app (is_active <> false)?
select
  count(*) filter (where is_active is distinct from false) as visiveis_no_app,
  count(*) filter (where is_active = false)                as inativas,
  count(*) filter (where is_open  = true)                  as abertas
from public.companies;

-- 3) Amostra dos dados
select id, name, is_active, is_open, rating, created_at
from public.companies
order by created_at desc nulls last
limit 20;

-- 4) GRANTs para a Data API (precisa ter SELECT para anon/authenticated)
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'companies';

-- 5) RLS está ligada? Existem policies de SELECT para anon?
select relrowsecurity as rls_ativa from pg_class where oid = 'public.companies'::regclass;

select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename = 'companies';

-- 6) Teste como o app enxerga (papel anon)
set local role anon;
select count(*) as lojas_visiveis_para_anon from public.companies;
reset role;
