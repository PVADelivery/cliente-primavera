// VERSION: 2026-05-21-CHECKOUT-MODAL
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, createFileRoute } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Address } from '@/types/database';
import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { reportErrorToTelegram } from '@/services/logger';
import { MapPin, Banknote, AlertCircle, ArrowLeft, Loader2, FileText, Smartphone, Bike, Ticket, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrderLock } from '@/hooks/useOrderLock';
import { calculateDeliveryFee } from '@/utils/freight';
import { isStoreOpenNow } from '@/lib/storeHours';
import { useRequirePhone } from '@/hooks/useRequirePhone';
import { RequirePhoneModal } from '@/components/marketplace/RequirePhoneModal';

type MappedError = { message: string; retriable: boolean };

function mapServerError(msg: string, code?: string | null, details?: any): MappedError {
  const m = (msg || '').toLowerCase();
  const c = (code || '').toLowerCase();
  const kind = String(details?.failure_kind || '').toLowerCase();
  const debugCode = String(details?.debug_code || '').toLowerCase();

  // ---- Falhas de carregamento de produtos (específicas) ----
  if (c.includes('products_load_failed') || m.includes('failed to load products') || m.includes('validar os itens do carrinho')) {
    if (kind === 'permission' || debugCode === '42501') {
      return { message: 'Sem permissão para validar os produtos da loja. Faça login nãovamente.', retriable: false };
    }
    if (kind === 'network' || kind === 'timeout') {
      return { message: 'Falha de conexão ao carregar os produtos. Verifique sua internet.', retriable: true };
    }
    if (kind === 'empty' || kind === 'missing') {
      return { message: 'Os produtos do seu carrinho não estão mais disponíveis. Atualize a sacola.', retriable: false };
    }
    if (kind === 'schema' || debugCode === '42p01' || debugCode === '42703') {
      return { message: 'A loja está temporariamente indisponível para pedidos.', retriable: false };
    }
    // Sub-categoria: permissão (RLS)
    if (m.includes('permission') || m.includes('rls') || m.includes('not authorized') || m.includes('denied')) {
      return { message: 'Sem permissão para carregar os produtos da loja. Faça login nãovamente.', retriable: false };
    }
    // Sub-categoria: rede
    if (m.includes('network') || m.includes('fetch') || m.includes('timeout') || m.includes('socket')) {
      return { message: 'Falha de conexão ao carregar os produtos. Verifique sua internet.', retriable: true };
    }
    // Sub-categoria: vazio / não encontrado
    if (m.includes('empty') || m.includes('não rows') || m.includes('not found')) {
      return { message: 'Os produtos do seu carrinho não estão mais disponíveis. Atualize a sacola.', retriable: false };
    }
    
    // Se for 'unknown', mostramos o código de erro não toast para debug
    const debugInfo = debugCode ? ` (Debug: ${debugCode})` : '';
    return { message: `Não foi possível validar sua sacola${debugInfo}. Atualize a sacola ou tente nãovamente.`, retriable: true };
  }

  if (c.includes('product_unavailable') || (m.includes('product') && m.includes('unavailable')))
    return { message: 'Um dos itens não está mais disponível.', retriable: false };
  if (c.includes('product_missing') || (m.includes('product') && m.includes('not found')))
    return { message: 'Um produto do carrinho não existe mais.', retriable: false };
  if (c.includes('product_wrong_company') || m.includes('does not belong to the company'))
    return { message: 'Há itens de outra loja no carrinho.', retriable: false };

  if (m.includes('address not found')) return { message: 'Endereço inválido para este usuário.', retriable: false };
  if (m.includes('out of range') || m.includes('out of region') || m.includes('delivery unavailable'))
    return { message: 'Entrega indisponível para este endereço.', retriable: false };
  if (m.includes('company not found')) return { message: 'Loja indisponível não momento.', retriable: false };
  if (m.includes('failed to provision customer')) return { message: 'Não foi possível vincular seu cadastro. Tente nãovamente.', retriable: true };
  if (m.includes('invalid session') || m.includes('missing authorization')) return { message: 'Sessão expirada. Faça login nãovamente.', retriable: false };

  // Rede genérica
  if (m.includes('failed to fetch') || m.includes('network') || m.includes('timeout')) {
    return { message: 'Falha de conexão. Verifique sua internet e tente nãovamente.', retriable: true };
  }

}

export const Route = createFileRoute('/marketplace/checkout')({
  component: Checkout,
});

function Checkout() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { items, company, clearCart, appliedCoupon, discountAmount, subtotal } = useCart();
  const { isLocked, acquireLock, releaseLock, generateIdempotencyKey, resetIdempotencyKey } = useOrderLock();
  
  const [selectedAddress, setSelectedAddress] = useState<string>(() => localStorage.getItem('@epraja_selected_address') || '');
  
  const [paymentMethod, setPaymentMethod] = useState('money');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  
  const [cpf, setCpf] = useState('');
  const [showCpfInput, setShowCpfInput] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadingFee, setLoadingFee] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const {
    checkPhoneAndProceed,
    showPhoneModal,
    setShowPhoneModal,
    phoneInput,
    setPhoneInput,
    handlePhoneSubmit,
    isSubmittingPhone
  } = useRequirePhone();

  // shared queryKey with the route data prefetcher
  const { data: addresses = [], isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses', user?.id],
    enabled: !!user?.id,
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as Address[];
    },
  });
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [fulfillmentMode, setFulfillmentMode] = useState<'delivery' | 'pickup'>('delivery');

  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      setSelectedAddress(addresses[0].id);
    }
  }, [addresses, selectedAddress]);

  // Sync back to localStorage when it changes via modal
  useEffect(() => {
    if (selectedAddress) {
      localStorage.setItem('@epraja_selected_address', selectedAddress);
    }
  }, [selectedAddress]);

  // Recalcular frete sempre que o endereço ou modo mudar
  useEffect(() => {
    if (!selectedAddress) return;
    const addr = addresses.find(a => a.id === selectedAddress);
    if (!addr) {
      setDeliveryFee(null);
      setUnavailable(false);
      return;
    }

    const checkRegion = async () => {
      if (!company?.id) return;
      setLoadingFee(true);
      setUnavailable(false);
      try {
        const { data: dbCompany } = await supabase.from('companies').select('delivery_fee, delivery_mode, pricing_table_id, region_id, delivery_regions_pricing').eq('id', company.id).single();
        
        let destRegionId = (addr as any).region_id;

        // Se o endereço NÃO tiver region_id (ex: GPS), descobrir via polígonãos
        if (!destRegionId && addr.latitude && addr.longitude) {
           const result = await calculateDeliveryFee(addr.latitude, addr.longitude, supabase, []);
           if (result.regionId) destRegionId = result.regionId;
           if (result.isOutOfRange && !result.regionId) {
             setDeliveryFee(null);
             setUnavailable(true);
             toast.warning('Este endereço está fora da área de atendimento.');
             setLoadingFee(false);
             return;
           }
        }

        if (destRegionId) {
           // 1. Verifica se a loja configurou o preço personalizado na tela de PERFIL (JSON array ou {matrix: array})
           if (dbCompany?.delivery_regions_pricing) {
             let pricing: any = dbCompany.delivery_regions_pricing;
             if (typeof pricing === 'string') {
               try { pricing = JSON.parse(pricing); } catch { pricing = null; }
             }
             
             let pricingArray: any[] = [];
             if (Array.isArray(pricing)) {
               pricingArray = pricing;
             } else if (pricing && Array.isArray(pricing.matrix)) {
               pricingArray = pricing.matrix;
             }

             if (pricingArray.length > 0) {
               const match = pricingArray.find((p: any) => (p?.region_id === destRegionId) || (p?.to === destRegionId));
               if (match) {
                 const rawPrice = match.customer_price ?? match.price ?? '';
                 if (String(rawPrice).trim() !== '') {
                   const price = Number(String(rawPrice).replace(',', '.'));
                   if (!isNaN(price) && price >= 0) {
                     setDeliveryFee(price);
                     setLoadingFee(false);
                     return;
                   }
                 }
               }
             }
           }

           // 2. Verifica se a loja tem uma tabela de preços vinculada (Matriz Origem x Destinão)
           if (dbCompany?.pricing_table_id && dbCompany?.region_id) {
              const { data: rule } = await supabase
                 .from('pricing_rules')
                 .select('base_value')
                 .eq('pricing_table_id', dbCompany.pricing_table_id)
                 .eq('origin_region_id', dbCompany.region_id)
                 .eq('destination_region_id', destRegionId)
                 .maybeSingle();
                 
              if (rule && rule.base_value != null) {
                 setDeliveryFee(Number(rule.base_value));
                 setLoadingFee(false);
                 return;
              }
           }
           
           // 3. Se não tem tabela e nem preço personalizado, puxa o preço genérico da região
           const { data: destRegion } = await supabase.from('regions').select('delivery_fee, price').eq('id', destRegionId).single();
           if (destRegion) {
              const rPrice = Number(destRegion.delivery_fee || destRegion.price || 0);
              if (rPrice > 0) {
                 setDeliveryFee(rPrice);
                 setLoadingFee(false);
                 return;
              }
           }
        }

        // Lógica de fallback para taxa padrão da loja (se configurou entrega fixa)
        if (dbCompany?.delivery_mode === 'fixed_fee' && dbCompany?.delivery_fee != null) {
          setDeliveryFee(Number(dbCompany.delivery_fee));
          setLoadingFee(false);
          return;
        }

        // Último caso: Se chegou aqui, usa o delivery_fee base ou zero
        setDeliveryFee(Number(dbCompany?.delivery_fee || 0));
        
      } catch (error) {
        console.error("Erro ao calcular frete:", error);
        setDeliveryFee(0);
      } finally {
        setLoadingFee(false);
      }
    };

    checkRegion();
  }, [selectedAddress, addresses, company?.delivery_fee]);

  // Recalculate total manually because cartTotal might not update instantly when we are at Checkout
  const finalTotal = Math.max(0, subtotal - discountAmount) + (fulfillmentMode === 'pickup' ? 0 : (deliveryFee || 0));

  const handleOpenReview = async () => {
    const numericPhoneInput = phoneInput.replace(/\D/g, '');
    if (!profile?.phone || profile.phone.replace(/\D/g, '').length < 10) {
      if (numericPhoneInput.length < 10 || numericPhoneInput.length > 11) {
        toast.error('Por favor, informe um número de WhatsApp/Telefone válido com DDD.');
        return;
      }
      
      setLoading(true);
      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            user_id: user.id,
            phone: phoneInput,
            full_name: profile?.full_name || user.user_metadata?.full_name || 'Cliente',
            role: profile?.role || 'customer'
          });
        if (error) throw error;
        await refreshProfile();
        toast.success('WhatsApp salvo com sucesso!');
      } catch (err) {
        toast.error('Erro ao salvar o número. Tente novamente.');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    if (fulfillmentMode === 'delivery') {
      if (!selectedAddress) { toast.error('Selecione um endereço'); return; }
      if (unavailable) { toast.error('Entrega não disponível'); return; }
      if (loadingFee) { toast.error('Calculando frete, aguarde'); return; }
    }
    setShowReviewModal(true);
  };

  const handleSubmit = async () => {
    if (!user || !company || items.length === 0) return;
    if (loading || isLocked) return;
    
    setLoading(true);
    try {
      const { data: storeStatus } = await supabase.from('companies').select('is_open, active, is_active, business_hours').eq('id', company.id).single();
      if (!storeStatus || !isStoreOpenNow(storeStatus as any)) {
        toast.error('Este restaurante ainda não abriu ou já fechou.', {
          description: 'Verifique o horário de funcionamento na página da loja.'
        });
        setLoading(false);
        setShowReviewModal(false);
        return;
      }

      if (!acquireLock()) {
        setLoading(false);
        return;
      }

      const orderNotes = cpf ? `CPF na nota: ${cpf}` : null;

      const ik = generateIdempotencyKey(
        user.id,
        items,
        `${company.id}|${selectedAddress}|${appliedCoupon?.code ?? ''}|${paymentMethod}`,
      );

      // Filtra itens inválidos para não quebrar a Edge Function
      const validItems = items.filter(it => it && it.product && typeof it.product.id === 'string' && it.product.id.length > 10);
      
      if (validItems.length === 0) {
        toast.error('Carrinho vazio ou itens inválidos.');
        setLoading(false);
        return;
      }

      const requestBody = {
        items: validItems.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          notes: it.note || null,
          options: it.options || [],
        })),
        company_id: company.id,
        address_id: fulfillmentMode === 'pickup' ? null : selectedAddress,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code ?? null,
        notes: fulfillmentMode === 'pickup' ? `[RETIRADA NO LOCAL] ${orderNotes || ''}`.trim() : orderNotes,
        needs_change: paymentMethod === 'money' && needsChange,
        change_for: changeFor ? Number(changeFor) : null,
        idempotency_key: ik,
      };

      // Route through the create-order edge function so subtotal, discount and
      // delivery fee are recalculated server-side from canonical DB data. Client
      // never supplies prices — prevents fee/total manipulation.
      const { data, error: functionError } = await supabase.functions.invoke('create-order', {
        body: {
          ...requestBody,
          fulfillment_mode: fulfillmentMode,
        },
      });

      if (functionError) {
        let errMessage = functionError.message;
        let errCode: string | null = null;
        let responseBody: any = null;
        
        // Se for um erro HTTP da Edge Function, tentamos ler a resposta real
        if (functionError.name === 'FunctionsHttpError' || errMessage === 'Edge Function returned a nãon-2xx status code') {
          try {
            const ctx = (functionError as any).context;
            if (ctx && typeof ctx.clone === 'function') {
              const text = await ctx.clone().text();
              try {
                responseBody = JSON.parse(text);
              } catch {
                responseBody = { error: text };
              }
              if (responseBody?.error) errMessage = responseBody.error;
              if (responseBody?.error_code) errCode = responseBody.error_code;
            } else if (ctx && typeof ctx.json === 'function') {
              responseBody = await ctx.json();
              if (responseBody?.error) errMessage = responseBody.error;
              if (responseBody?.error_code) errCode = responseBody.error_code;
            } else if (ctx && ctx.error) {
              responseBody = ctx;
              errMessage = ctx.error;
              errCode = ctx.error_code ?? null;
            }
          } catch (e) {
            // falhou ao extrair, continua com fallback
          }
        }
        
        // Oculta a mensagem feia do banco de dados/sistema se não conseguimos ler o erro real
        if (errMessage === 'Edge Function returned a nãon-2xx status code') {
          errMessage = 'Erro de comunicação com o serávidor. Por favor, tente nãovamente.';
        }

        const mapped = mapServerError(errMessage, errCode, responseBody);
        
        reportErrorToTelegram({
          error_message: `[Checkout] Erro na Edge Function: ${mapped.message}`,
          stack_trace: JSON.stringify(responseBody || {}),
          url: window.location.href,
          additional_info: {
            errorCode: errCode,
            isUserFacingAlert: true
          }
        });
        
        const err: any = new Error(mapped.message);
        err.retriable = responseBody?.retryable ?? mapped.retriable;
        err.errorCode = errCode ?? responseBody?.error_code ?? null;
        err.requestId = responseBody?.request_id ?? null;
        err.failureKind = responseBody?.failure_kind ?? null;
        err.debugCode = responseBody?.debug_code ?? null;
        throw err;
      }
      if (data?.error) {
        const mapped = mapServerError(data.error, data.error_code ?? null, data);
        const err: any = new Error(mapped.message);
        err.retriable = data?.retryable ?? mapped.retriable;
        err.errorCode = data?.error_code ?? null;
        err.requestId = data?.request_id ?? null;
        err.failureKind = data?.failure_kind ?? null;
        err.debugCode = data?.debug_code ?? null;
        throw err;
      }

      const orderId = data?.order_id || data?.id;
      if (!orderId) throw new Error('Falha ao obter ID do pedido.');



      clearCart();
      resetIdempotencyKey();
      toast.success('Pedido realizado!');
      setShowReviewModal(false);
      navigate(`/marketplace/orders/${orderId}`);
    } catch (err: any) {
      const message = err?.message || 'Erro ao criar pedido';
      const retriable = err?.retriable !== false;
      console.warn('[Checkout][create-order] Falha ao finalizar pedido', {
        message,
        retriable,
        error_code: err?.errorCode ?? null,
        request_id: err?.requestId ?? null,
        failure_kind: err?.failureKind ?? null,
        debug_code: err?.debugCode ?? null,
      });
      toast.error(message, {
        id: 'checkout-create-order-error',
        description: err?.requestId ? `Código do erro: ${err.requestId}` : undefined,
        duration: 8000,
        diagnãosticLogged: Boolean(err?.requestId),
        action: retriable
          ? {
              label: 'Tentar nãovamente',
              onClick: () => {
                handleSubmit();
              },
            }
          : undefined,
      } as any);
    } finally { setLoading(false); releaseLock(); }
  };

  if (!user) { navigate('/marketplace/login'); return null; }
  if (items.length === 0) { navigate('/marketplace/cart'); return null; }

  const selAddrObj = addresses.find(a => a.id === selectedAddress);

  return (
    <MarketplaceLayout hideNav>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5 text-primary" />
        </button>
        <div className="flex-1 text-center pr-9">
          <h1 className="font-bold text-sm tracking-widest text-foreground uppercase">SACOLA</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-0 py-4 pb-40">
        {/* Fulfillment Mode Toggle */}
        <div className="px-4 mb-6">
          <div className="bg-muted p-1 rounded-xl flex items-center">
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${fulfillmentMode === 'delivery' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setFulfillmentMode('delivery')}
            >
              Entrega
            </button>
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${fulfillmentMode === 'pickup' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setFulfillmentMode('pickup')}
            >
              Retirada
            </button>
          </div>
        </div>

        {fulfillmentMode === 'delivery' && (
          <>
            {/* Endereço estilo iFood */}
            <div className="px-4 mb-6">
              <h3 className="text-base font-bold text-foreground mb-3">Entregar no endereço</h3>
              {loadingAddresses ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : addresses.length === 0 ? (
                <div className="text-center py-4 border border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado</p>
                  <Button size="sm" className="mt-2 rounded-lg" onClick={() => navigate('/marketplace/addresses')}>Adicionar</Button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3 bg-background">
                  <div className="flex gap-3 min-w-0">
                    <MapPin className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{selAddrObj?.street}, {selAddrObj?.number}</p>
                      <p className="text-sm text-muted-foreground truncate">{selAddrObj?.neighborhood} - {selAddrObj?.complement || 'Casa'}</p>
                    </div>
                  </div>
                  <button className="text-sm font-semibold text-primary shrink-0" onClick={() => setShowAddressModal(true)}>
                    Trocar
                  </button>
                </div>
              )}
            </div>

            {/* Opções de entrega */}
            <div className="px-4 mb-8">
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-1">
                Opções de entrega <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </h3>
              <div className="border border-[#111111] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">Padrão</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Hoje, 30 - 45min</p>
                </div>
                <div className="flex items-center gap-3">
                  {loadingFee ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : deliveryFee === 0 ? (
                    <span className="text-[#00A868] font-bold text-sm">Grátis</span>
                  ) : deliveryFee !== null ? (
                    <span className="font-bold text-sm">R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                  ) : unavailable ? (
                    <span className="text-destructive font-bold text-xs">Indisponível</span>
                  ) : null}
                  <div className="h-5 w-5 rounded-full border-4 border-primary/20 flex items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="h-2 w-full bg-secondary mb-6" />

        {/* Formas de Pagamento restritas */}
        <div className="px-4 mb-6">
          <h3 className="text-base font-bold text-foreground mb-4">Pagamento na entrega</h3>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
            {[
              { value: 'money', icon: Banknote, label: 'Dinheiro', desc: 'Solicite troco se precisar' },
              { value: 'card', icon: Smartphone, label: 'Máquina', desc: 'Cartão de crédito, débito ou PIX na máquina' },
            ].map(m => (
              <div key={m.value} className="flex items-center gap-4 border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <RadioGroupItem value={m.value} id={m.value} />
                <div className="flex gap-3 flex-1 items-center">
                  <m.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <label htmlFor={m.value} className="text-sm font-semibold cursor-pointer">{m.label}</label>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>

          {paymentMethod === 'money' && (
            <div className="mt-4 rounded-xl border border-border p-4 bg-muted/20 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  id="needs-change"
                  type="checkbox"
                  checked={needsChange}
                  onChange={(e) => setNeedsChange(e.target.checked)}
                  className="h-4 w-4 accent-primary rounded"
                />
                <label htmlFor="needs-change" className="text-sm font-semibold cursor-pointer">
                  Preciso de troco
                </label>
              </div>
              {needsChange && (
                <div className="pl-7 space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Troco para quanto?</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={finalTotal}
                    step="0.01"
                    placeholder={`Ex: ${(Math.ceil(finalTotal / 10) * 10).toFixed(2)}`}
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value)}
                    className="w-full h-11 bg-background border border-border rounded-xl px-4 text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
                  />
                  {changeFor && Number(changeFor) > finalTotal && (
                    <p className="text-xs font-bold text-primary mt-1">
                      Troco de R$ {(Number(changeFor) - finalTotal).toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-2 w-full bg-secondary mb-6" />

        {/* CPF na nota */}
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-foreground" />
              <div>
                <h3 className="font-bold text-sm text-foreground">CPF na nota</h3>
                <p className="text-xs text-muted-foreground">Opcional</p>
              </div>
            </div>
            {!showCpfInput ? (
              <button className="text-sm font-semibold text-primary" onClick={() => setShowCpfInput(true)}>Adicionar</button>
            ) : (
              <button className="text-sm font-semibold text-destructive" onClick={() => { setShowCpfInput(false); setCpf(''); }}>Remover</button>
            )}
          </div>
          {showCpfInput && (
            <div className="mt-3">
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full h-12 bg-background border border-border rounded-xl px-4 text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
        </div>

        {/* WhatsApp obrigatório se não houver telefone no perfil */}
        {(!profile?.phone || profile.phone.replace(/\D/g, '').length < 10) && (
          <div className="px-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Smartphone className="h-5 w-5 text-foreground" />
              <div>
                <h3 className="font-bold text-sm text-foreground">Número de WhatsApp</h3>
                <p className="text-xs text-destructive font-semibold">Obrigatório para ajudar o entregador se precisar</p>
              </div>
            </div>
            <div className="mt-3">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full h-12 bg-background border border-destructive rounded-xl px-4 text-sm font-semibold focus:outline-none focus:border-primary transition-colors text-foreground"
                required
              />
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer Checkout */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card p-4 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="mx-auto max-w-lg space-y-2">
          {deliveryFee === 0 ? (
            <p className="text-[13px] text-muted-foreground font-medium mb-2 px-1">
              Total com <span className="text-foreground font-bold">entrega grátis</span>
            </p>
          ) : (
             <p className="text-[13px] text-muted-foreground font-medium mb-2 px-1">
              Total a pagar
             </p>
          )}
          
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-xl text-foreground">
                R$ {finalTotal.toFixed(2).replace('.', ',')}
                <span className="text-xs text-muted-foreground font-medium ml-1">/ {items.reduce((a, b) => a + b.quantity, 0)} item{items.length > 1 ? 's' : ''}</span>
              </p>
            </div>
            <Button 
              className="h-14 w-[60%] rounded-xl text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground" 
              onClick={handleOpenReview} 
              disabled={unavailable || !selectedAddress || loadingFee}
            >
              Revisar pedido
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL DE TROCA DE ENDEREÇO */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-background">
          <DialogHeader className="p-4 pb-2 border-b border-border text-left">
            <DialogTitle className="text-lg font-bold">Escolha o Endereço</DialogTitle>
          </DialogHeader>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <RadioGroup value={selectedAddress ?? ''} onValueChange={(val) => { setSelectedAddress(val); setShowAddressModal(false); }} className="space-y-3">
              {addresses.map(addr => (
                <div key={addr.id} className={cn("flex items-start gap-3 border rounded-xl p-3 transition-colors", selectedAddress === addr.id ? "border-primary bg-primary/5" : "border-border")}>
                  <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="mt-1" />
                  <label htmlFor={`addr-${addr.id}`} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{addr.label || 'Endereço'}</span>
                    </div>
                    <p className="text-sm text-foreground">{addr.street}, {addr.number}</p>
                    <p className="text-xs text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                  </label>
                </div>
              ))}
            </RadioGroup>
            <div className="flex flex-col gap-2 mt-4">
              <Button 
                type="button"
                variant="outline" 
                className="w-full rounded-xl border-dashed" 
                onClick={() => {
                  setShowAddressModal(false);
                  setTimeout(() => navigate('/marketplace/addresses', { state: { returnTo: '/marketplace/checkout' } }), 100);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar nãovo endereço
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                className="w-full rounded-xl text-muted-foreground" 
                onClick={() => setShowAddressModal(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Sheet open={showReviewModal} onOpenChange={setShowReviewModal}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] overflow-y-auto rounded-t-[32px] px-0 pb-0 pt-6">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-6" />
          <SheetHeader className="px-6 mb-6">
            <SheetTitle className="text-center text-xl font-bold">Revise o seu pedido</SheetTitle>
          </SheetHeader>

          <div className="px-6 space-y-6">
            <div className="flex items-start gap-4">
              <Bike className="h-6 w-6 text-foreground mt-0.5" />
              <div>
                <p className="font-bold text-[15px]">Entrega hoje</p>
                <p className="text-sm text-muted-foreground">Hoje, 30 - 45 min</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-foreground mt-0.5" />
              <div>
                {fulfillmentMode === 'pickup' ? (
                  <>
                    <p className="font-bold text-[15px]">Retirada na Loja</p>
                    <p className="text-sm text-muted-foreground">{company?.address || 'Endereço da loja'}</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-[15px]">{selAddrObj?.street}, {selAddrObj?.number}</p>
                    <p className="text-sm text-muted-foreground">{selAddrObj?.complement || 'Casa'}</p>
                  </>
                )}
              </div>
            </div>

            {appliedCoupon && (
              <div className="flex items-start gap-4">
                <Ticket className="h-6 w-6 text-foreground mt-0.5" />
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-[15px]">Cupom aplicado</p>
                    <p className="text-sm text-primary uppercase">{appliedCoupon.code}</p>
                  </div>
                  <span className="font-bold text-primary">- R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-4 pb-2 border-b border-border/50">
              <Banknote className="h-6 w-6 text-[#00A868] mt-0.5" />
              <div className="flex-1 flex justify-between items-start">
                <div>
                  <p className="font-bold text-[15px] flex items-center gap-1">Pagamento na entrega <span className="text-[#EA1D2C]">*</span></p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethod === 'money' ? `Dinheiro${needsChange && changeFor ? ` - Troco para R$ ${Number(changeFor).toFixed(2).replace('.', ',')}` : ''}` : 'Máquina (Cartão/PIX)'}
                  </p>
                </div>
                <span className="font-bold text-base mt-0.5">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>

          <div className="p-6 pt-4 pb-8 space-y-3 bg-background">
            <Button 
              className="w-full h-14 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Fazer pedido'}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full h-14 rounded-xl text-[15px] font-semibold text-[#EA1D2C] hover:bg-transparent hover:text-[#D11825]"
              onClick={() => setShowReviewModal(false)}
            >
              Alterar pedido
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <RequirePhoneModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        phoneInput={phoneInput}
        setPhoneInput={setPhoneInput}
        onSubmit={handlePhoneSubmit}
        isSubmitting={isSubmittingPhone}
      />
    </MarketplaceLayout>
  );
}
