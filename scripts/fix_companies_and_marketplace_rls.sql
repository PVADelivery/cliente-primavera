-- ==============================================================================
-- CORREÇÃO DE LEITURA PÚBLICA / AUTHENTICATED DE LOJAS E REGRAS NO MARKETPLACE
-- ==============================================================================

-- 1. Garante permissão de leitura no catálogo e informações públicas de lojas
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT SELECT ON public.regions TO anon, authenticated;
GRANT SELECT ON public.pricing_tables TO anon, authenticated;
GRANT SELECT ON public.pricing_rules TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;

-- 2. Políticas de SELECT para exibição das lojas e checkout
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_public_select" ON public.companies;
DROP POLICY IF EXISTS "companies_marketplace_select" ON public.companies;
DROP POLICY IF EXISTS "Companies are publicly readable" ON public.companies;
DROP POLICY IF EXISTS "Companies readable by authenticated" ON public.companies;
DROP POLICY IF EXISTS "Companies readable by everyone" ON public.companies;
DROP POLICY IF EXISTS "companies_allow_all" ON public.companies;

CREATE POLICY "companies_public_select" ON public.companies
  FOR SELECT TO anon, authenticated
  USING (true);

-- 3. Políticas de SELECT para regiões e preços
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "regions_public_select" ON public.regions;
CREATE POLICY "regions_public_select" ON public.regions
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE public.pricing_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pricing_tables_public_select" ON public.pricing_tables;
CREATE POLICY "pricing_tables_public_select" ON public.pricing_tables
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pricing_rules_public_select" ON public.pricing_rules;
CREATE POLICY "pricing_rules_public_select" ON public.pricing_rules
  FOR SELECT TO anon, authenticated
  USING (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_public_select" ON public.products;
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);
