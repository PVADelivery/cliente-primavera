-- INSERT/SELECT de orders pelo cliente (PERMISSIVE).
-- ATENÇÃO: não criar policies RESTRICTIVE FOR ALL no lado lojista — bloqueia o cliente.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_customer_insert" ON public.orders;
CREATE POLICY "orders_customer_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "orders_customer_select" ON public.orders;
CREATE POLICY "orders_customer_select" ON public.orders
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "orders_company_select" ON public.orders;
CREATE POLICY "orders_company_select" ON public.orders
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- order_items: cliente lê/insere itens dos próprios pedidos
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_customer_insert" ON public.order_items;
CREATE POLICY "order_items_customer_insert" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (order_id IN (
    SELECT id FROM public.orders
    WHERE user_id = auth.uid()
       OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "order_items_customer_select" ON public.order_items;
CREATE POLICY "order_items_customer_select" ON public.order_items
  FOR SELECT TO authenticated
  USING (order_id IN (
    SELECT id FROM public.orders
    WHERE user_id = auth.uid()
       OR customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  ));
