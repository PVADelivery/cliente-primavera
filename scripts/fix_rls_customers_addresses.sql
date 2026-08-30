-- ==============================================================================
-- CORREÇÃO DEFINITIVA DE RLS: CUSTOMERS & ADDRESSES NO MARKETPLACE CLIENTE
-- ==============================================================================

-- 1. CONCEDER USAGE E PERMISSÕES BÁSICAS AOS PAPEIS AUTHENTICATED E ANON
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.addresses TO authenticated;
GRANT SELECT ON public.customers TO anon;
GRANT SELECT ON public.addresses TO anon;

-- 2. ASSEGURAR ÍNDICE ÚNICO EM customers(user_id) DE FORMA SEGURA
DO $$
BEGIN
  -- Se houver duplicidade prévia, preserva o registro mais recente por user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'customers' 
      AND indexname = 'idx_customers_user_id_unique'
  ) THEN
    -- Remove duplicatas históricas preservando o mais recente
    DELETE FROM public.customers a
    USING public.customers b
    WHERE a.user_id IS NOT NULL 
      AND a.user_id = b.user_id 
      AND a.created_at < b.created_at;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user_id_unique 
    ON public.customers(user_id) 
    WHERE user_id IS NOT NULL;
  END IF;
END $$;

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS ESTRITAS E SEGURAS PARA public.customers
DROP POLICY IF EXISTS "customers_self_select" ON public.customers;
DROP POLICY IF EXISTS "customers_select_self_or_admin" ON public.customers;
DROP POLICY IF EXISTS "customers_select_all" ON public.customers;
DROP POLICY IF EXISTS "customers_allow_all" ON public.customers;
DROP POLICY IF EXISTS "Users see own customer" ON public.customers;
DROP POLICY IF EXISTS "customers owner all" ON public.customers;

CREATE POLICY "customers_self_select" ON public.customers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'company'::public.app_role)
    OR public.has_role(auth.uid(), 'driver'::public.app_role)
  );

DROP POLICY IF EXISTS "customers_self_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_self" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_all" ON public.customers;
DROP POLICY IF EXISTS "Users insert own customer" ON public.customers;

CREATE POLICY "customers_self_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "customers_self_update" ON public.customers;
DROP POLICY IF EXISTS "customers_update_self" ON public.customers;
DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
DROP POLICY IF EXISTS "Users update own customer" ON public.customers;

CREATE POLICY "customers_self_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "customers_self_delete" ON public.customers;
CREATE POLICY "customers_self_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. POLÍTICAS RLS ESTRITAS E SEGURAS PARA public.addresses
DROP POLICY IF EXISTS "addresses_self_select" ON public.addresses;
DROP POLICY IF EXISTS "addresses_select_owner_or_admin" ON public.addresses;
DROP POLICY IF EXISTS "addresses_select_all" ON public.addresses;
DROP POLICY IF EXISTS "addresses_allow_all" ON public.addresses;
DROP POLICY IF EXISTS "Users see own addresses" ON public.addresses;
DROP POLICY IF EXISTS "addresses self all" ON public.addresses;

CREATE POLICY "addresses_self_select" ON public.addresses
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "addresses_self_insert" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_owner" ON public.addresses;
DROP POLICY IF EXISTS "addresses_insert_all" ON public.addresses;
DROP POLICY IF EXISTS "Users manage own addresses" ON public.addresses;

CREATE POLICY "addresses_self_insert" ON public.addresses
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "addresses_self_update" ON public.addresses;
DROP POLICY IF EXISTS "addresses_update_owner" ON public.addresses;

CREATE POLICY "addresses_self_update" ON public.addresses
  FOR UPDATE TO authenticated
  USING (
    customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "addresses_self_delete" ON public.addresses;
DROP POLICY IF EXISTS "addresses_delete_owner" ON public.addresses;

CREATE POLICY "addresses_self_delete" ON public.addresses
  FOR DELETE TO authenticated
  USING (
    customer_id IN (SELECT c.id FROM public.customers c WHERE c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 6. RPC ATÔMICA E SEGURA PARA OBTER OU CRIAR CUSTOMER DO USUÁRIO LOGADO
CREATE OR REPLACE FUNCTION public.get_or_create_customer(
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_customer_id UUID;
  v_name TEXT;
  v_phone TEXT;
BEGIN
  -- 1. Garante que o usuário está autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Operação não permitida: Usuário não autenticado.';
  END IF;

  -- 2. Tenta localizar customer existente
  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_customer_id IS NOT NULL THEN
    -- Se foi passado telefone ou nome e não havia, atualiza
    IF p_phone IS NOT NULL AND p_phone <> '' THEN
      UPDATE public.customers
      SET phone = COALESCE(phone, TRIM(p_phone)),
          updated_at = now()
      WHERE id = v_customer_id;
    END IF;
    RETURN v_customer_id;
  END IF;

  -- 3. Prepara dados e cria novo customer de forma atômica
  v_name := COALESCE(NULLIF(TRIM(p_name), ''), 'Cliente');
  v_phone := NULLIF(TRIM(p_phone), '');

  INSERT INTO public.customers (user_id, name, phone, created_at, updated_at)
  VALUES (v_user_id, v_name, v_phone, now(), now())
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL
  DO UPDATE SET
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.customers.name),
    phone = COALESCE(EXCLUDED.phone, public.customers.phone),
    updated_at = now()
  RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$$;

-- 7. CONCEDER PERMISSÃO DE EXECUÇÃO DA RPC AO PAPEL AUTHENTICATED
GRANT EXECUTE ON FUNCTION public.get_or_create_customer(TEXT, TEXT) TO authenticated;
