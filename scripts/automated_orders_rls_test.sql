-- Teste automatizado com asserts simples (DO block).
DO $$
DECLARE
  v_user uuid := '00000000-0000-0000-0000-000000000001';
  v_company uuid;
  v_customer uuid;
  v_order uuid;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user, 'role','authenticated')::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT id INTO v_company FROM public.companies LIMIT 1;
  IF v_company IS NULL THEN RAISE EXCEPTION 'Sem companies para teste'; END IF;

  INSERT INTO public.customers (user_id, name) VALUES (v_user, 'AutoTester')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_customer FROM public.customers WHERE user_id = v_user;
  IF v_customer IS NULL THEN RAISE EXCEPTION 'customers_self_insert falhou'; END IF;

  INSERT INTO public.orders (user_id, customer_id, company_id, status, total, delivery_fee, idempotency_key)
  VALUES (v_user, v_customer, v_company, 'pending', 10, 5, 'auto-' || gen_random_uuid())
  RETURNING id INTO v_order;

  IF v_order IS NULL THEN RAISE EXCEPTION 'orders_customer_insert falhou'; END IF;

  PERFORM 1 FROM public.orders WHERE id = v_order AND user_id = v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'orders_customer_select falhou'; END IF;

  RAISE NOTICE '✓ RLS de orders OK para cliente %', v_user;
  ROLLBACK;
END $$;
