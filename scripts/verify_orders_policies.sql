-- Diagnóstico: lista todas policies de orders/order_items/customers
-- e sinaliza qualquer RESTRICTIVE ou FOR ALL que possa bloquear o cliente.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  roles,
  qual,
  with_check,
  CASE
    WHEN permissive = 'RESTRICTIVE' THEN '⚠ RESTRICTIVE — pode bloquear cliente'
    WHEN cmd = 'ALL' THEN '⚠ FOR ALL — revisar se cobre cliente e lojista'
    ELSE '✓ ok'
  END AS diagnose
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'order_items', 'customers')
ORDER BY tablename, policyname;
