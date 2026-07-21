# Scripts SQL — MT 24horas express (Marketplace)

Rodar no SQL Editor do Supabase, em ordem:

1. `repair_schema_and_users.sql` — schema base (profiles, customers, companies, products, orders, order_items, regions, etc.)
2. `audit_logs.sql` — tabela de auditoria + RLS
3. `fix_customers_self_provision.sql` — policies para auto-provisionamento de customers
4. `fix_orders_customer_insert_policy.sql` — policies de INSERT/SELECT de orders pelo cliente
5. `customer_orders_view.sql` — view segura `customer_orders_view`
6. `update_products_multiple_images.sql` — adiciona `image_urls text[]` em products
7. `verify_orders_policies.sql` — diagnóstico (lista policies e sinaliza RESTRICTIVE/FOR ALL)
8. `seed_test_users.sql` — usuários de teste (opcional)
9. `test_orders_customer_flow.sql` / `automated_orders_rls_test.sql` — testes RLS end-to-end

> Sempre que mudar policies, rode `verify_orders_policies.sql`.
