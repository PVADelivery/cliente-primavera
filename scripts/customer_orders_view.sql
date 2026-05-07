-- View segura para listagem de pedidos do cliente
DROP VIEW IF EXISTS public.customer_orders_view;

CREATE VIEW public.customer_orders_view
WITH (security_invoker = true)
AS
SELECT
  o.*,
  jsonb_build_object(
    'name', c.name,
    'logo_url', c.logo_url,
    'category', c.category
  ) AS company
FROM public.orders o
LEFT JOIN public.companies c ON c.id = o.company_id
WHERE o.user_id = auth.uid()
   OR o.customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid());

GRANT SELECT ON public.customer_orders_view TO authenticated;
