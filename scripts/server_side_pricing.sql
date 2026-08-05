-- ============================================================
-- Preço calculado NO SERVIDOR (nunca confiar no valor do cliente)
-- Rode este script no Supabase (projeto owlbzwsdcognrgolvnzg).
-- ============================================================

-- 1) Corridas (ride_requests) -------------------------------
alter table public.ride_requests
  add column if not exists distance_km numeric;

create or replace function public.set_ride_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_fee numeric;
  rate numeric;
  dist numeric := coalesce(new.distance_km, 0);
begin
  if new.vehicle_type = 'taxi' then
    base_fee := 9.99; rate := 3.0;
  else
    base_fee := 6.99; rate := 2.0;
  end if;

  if dist < 0 then dist := 0; end if;
  if dist > 200 then dist := 200; end if;

  -- ignora qualquer preço enviado pelo cliente
  new.price := round(base_fee + dist * rate, 2);
  return new;
end;
$$;

drop trigger if exists trg_set_ride_price on public.ride_requests;
create trigger trg_set_ride_price
  before insert or update of distance_km, vehicle_type, price
  on public.ride_requests
  for each row execute function public.set_ride_price();

-- 2) Entregas avulsas (deliveries) --------------------------
create or replace function public.set_delivery_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_fee numeric;
  rate numeric;
  dist numeric := coalesce(new.distance_km, 0);
begin
  if new.is_customer_errand is not true then
    return new; -- pedidos de loja mantêm o valor definido pela loja
  end if;

  if new.vehicle_type in ('carro', 'carro_aberto') then
    base_fee := 9.99; rate := 3.0;
  else
    base_fee := 5.99; rate := 2.0;
  end if;

  if dist < 0 then dist := 0; end if;
  if dist > 200 then dist := 200; end if;

  new.value := round(base_fee + dist * rate, 2);
  new.commission := round(new.value * 0.8, 2);
  return new;
end;
$$;

drop trigger if exists trg_set_delivery_price on public.deliveries;
create trigger trg_set_delivery_price
  before insert or update of distance_km, vehicle_type, value, commission
  on public.deliveries
  for each row execute function public.set_delivery_price();

-- 3) RLS: corridas visíveis apenas ao dono e ao motorista ----
alter table public.ride_requests enable row level security;

drop policy if exists ride_requests_public_select on public.ride_requests;
drop policy if exists "Anyone can view rides" on public.ride_requests;

create policy ride_requests_owner_select
  on public.ride_requests for select
  to authenticated
  using (user_id = auth.uid());
