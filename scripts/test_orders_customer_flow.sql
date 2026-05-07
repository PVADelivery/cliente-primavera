-- Teste manual do fluxo cliente → orders sob RLS.
-- Substitua o UUID por um auth.users.id real do ambiente.
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-000000000001','role','authenticated')::text, true);
SELECT set_config('role', 'authenticated', true);

-- 1. Auto-provision customer
INSERT INTO public.customers (user_id, name, phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tester', NULL)
ON CONFLICT DO NOTHING
RETURNING *;

-- 2. Insert order (use uma company real)
INSERT INTO public.orders (
  user_id, customer_id, company_id,
  status, total, delivery_fee, idempotency_key
)
SELECT
  '00000000-0000-0000-0000-000000000001',
  c.id,
  (SELECT id FROM public.companies LIMIT 1),
  'pending', 50.00, 6.90, 'test-' || gen_random_uuid()
FROM public.customers c
WHERE c.user_id = '00000000-0000-0000-0000-000000000001'
RETURNING *;

-- 3. SELECT do próprio pedido
SELECT id, status, total FROM public.orders
WHERE user_id = '00000000-0000-0000-0000-000000000001';

ROLLBACK;
