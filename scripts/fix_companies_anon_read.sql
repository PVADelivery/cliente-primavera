-- Torna as lojas visíveis para visitantes (papel anon) e usuários logados
grant usage on schema public to anon, authenticated;
grant select on public.companies to anon, authenticated;

alter table public.companies enable row level security;

drop policy if exists "companies_public_read" on public.companies;
create policy "companies_public_read"
on public.companies
for select
to anon, authenticated
using (is_active is distinct from false);

-- conferência
set local role anon;
select count(*) as lojas_visiveis_para_anon from public.companies;
reset role;
