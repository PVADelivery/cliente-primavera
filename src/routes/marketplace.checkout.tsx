// VERSION: 2026-07-21-CHECKOUT-REDESIGN
import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, createFileRoute, Navigate, useRouter } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Address } from '@/types/database';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { reportErrorToTelegram } from '@/services/logger';
import { MapPin, Banknote, AlertCircle, ArrowLeft, Loader2, FileText, Smartphone, Bike, CreditCard, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrderLock } from '@/hooks/useOrderLock';
import { calculateDeliveryFee } from '@/utils/freight';
import { isStoreOpenNow } from '@/lib/storeHours';
import { useRequirePhone } from '@/hooks/useRequirePhone';
import { RequirePhoneModal } from '@/components/marketplace/RequirePhoneModal';
import { motion, AnimatePresence } from 'framer-motion';

export const Route = createFileRoute('/marketplace/checkout')({
  component: Checkout,
});

function Checkout() {
  const router = useRouter();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  
  // Use the CORRECT CartContext from the new project
  const { items, companyId, companyName, clear, total: subtotal, count } = useCart();
  
  const { isLocked, acquireLock, releaseLock, generateIdempotencyKey, resetIdempotencyKey } = useOrderLock();
  
  const [selectedAddress, setSelectedAddress] = useState<string>(() => localStorage.getItem('@epraja_selected_address') || '');
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'card'>('card');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');
  const [cpf, setCpf] = useState('');
  const [showCpfInput, setShowCpfInput] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadingFee, setLoadingFee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fulfillmentMode, setFulfillmentMode] = useState<'delivery' | 'pickup'>('delivery');
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  
  const {
    checkPhoneAndProceed,
    showPhoneModal,
    setShowPhoneModal,
    phoneInput,
    setPhoneInput,
    handlePhoneSubmit,
    isSubmittingPhone
  } = useRequirePhone();

  // Load addresses
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

  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      setSelectedAddress(addresses[0].id);
    }
  }, [addresses, selectedAddress]);

  useEffect(() => {
    if (selectedAddress) {
      localStorage.setItem('@epraja_selected_address', selectedAddress);
    }
  }, [selectedAddress]);

  // Recalculate freight
  useEffect(() => {
    if (fulfillmentMode === 'pickup') {
      setDeliveryFee(0);
      setUnavailable(false);
      return;
    }
    
    if (!selectedAddress || !companyId) return;
    const addr = addresses.find(a => a.id === selectedAddress);
    if (!addr) {
      setDeliveryFee(null);
      setUnavailable(false);
      return;
    }

    const checkRegion = async () => {
      setLoadingFee(true);
      setUnavailable(false);
      try {
        const { data: dbCompany } = await supabase.from('companies').select('delivery_fee, delivery_mode, pricing_table_id, region_id, delivery_regions_pricing').eq('id', companyId).single();
        if (!dbCompany) return;
        
        let destRegionId = (addr as any).region_id;

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

        if (dbCompany?.delivery_mode === 'fixed_fee' && dbCompany?.delivery_fee != null) {
          setDeliveryFee(Number(dbCompany.delivery_fee));
          setLoadingFee(false);
          return;
        }

        setDeliveryFee(Number(dbCompany?.delivery_fee || 0));
      } catch (error) {
        console.error("Erro ao calcular frete:", error);
        setDeliveryFee(0);
      } finally {
        setLoadingFee(false);
      }
    };

    checkRegion();
  }, [selectedAddress, addresses, companyId, fulfillmentMode]);

  const finalTotal = Math.max(0, subtotal) + (fulfillmentMode === 'pickup' ? 0 : (deliveryFee || 0));

  const handleSubmit = async () => {
    const numericPhoneInput = phoneInput.replace(/\D/g, '');
    if (!profile?.phone || profile.phone.replace(/\D/g, '').length < 10) {
      if (numericPhoneInput.length < 10 || numericPhoneInput.length > 11) {
        toast.error('Por favor, informe um número de WhatsApp/Telefone válido com DDD.');
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.from('profiles').upsert({
          id: user!.id,
          user_id: user!.id,
          phone: phoneInput,
          full_name: profile?.full_name || user?.user_metadata?.full_name || 'Cliente',
          role: profile?.role || 'customer'
        });
        if (error) throw error;
        await refreshProfile();
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

    if (!companyId || items.length === 0) return;
    if (loading || isLocked) return;
    
    setLoading(true);
    try {
      const { data: storeStatus } = await supabase.from('companies').select('is_open, active, is_active, business_hours').eq('id', companyId).single();
      if (!storeStatus || !isStoreOpenNow(storeStatus as any)) {
        toast.error('Este restaurante ainda não abriu ou já fechou.');
        setLoading(false);
        return;
      }

      if (!acquireLock()) { setLoading(false); return; }

      const orderNotes = cpf ? `CPF na nota: ${cpf}` : null;
      const ik = generateIdempotencyKey(user!.id, items, `${companyId}|${selectedAddress}|${paymentMethod}`);
      
      const validItems = items.filter(it => it && it.productId && it.productId.length > 10);
      if (validItems.length === 0) {
        toast.error('Carrinho vazio ou itens inválidos.');
        setLoading(false);
        return;
      }

      const requestBody = {
        items: validItems.map((it) => ({
          product_id: it.productId,
          quantity: it.quantity,
          notes: it.notes || null,
          options: [],
        })),
        company_id: companyId,
        address_id: fulfillmentMode === 'pickup' ? null : selectedAddress,
        payment_method: paymentMethod,
        coupon_code: null,
        notes: fulfillmentMode === 'pickup' ? `[RETIRADA NO LOCAL] ${orderNotes || ''}`.trim() : orderNotes,
        needs_change: paymentMethod === 'money' && needsChange,
        change_for: changeFor ? Number(changeFor) : null,
        idempotency_key: ik,
        fulfillment_mode: fulfillmentMode,
      };

      const { data, error: functionError } = await supabase.functions.invoke('create-order', { body: requestBody });

      if (functionError) {
        reportErrorToTelegram({
          error_message: `[Checkout] Erro na Edge Function: ${functionError.message}`,
          url: window.location.href,
        });
        throw new Error('Falha de conexão. Verifique sua internet e tente novamente.');
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }

      const orderId = data?.order_id || data?.id;
      if (!orderId) throw new Error('Falha ao obter ID do pedido.');

      clear();
      resetIdempotencyKey();
      toast.success('Pedido realizado!');
      navigate({ to: `/marketplace/orders/${orderId}` });
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar pedido');
    } finally { 
      setLoading(false); 
      releaseLock(); 
    }
  };

  if (!user) { return <Navigate to="/login" />; }
  if (items.length === 0) { return <Navigate to="/marketplace/cart" />; }

  const selAddrObj = addresses.find(a => a.id === selectedAddress);

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* ── HEADER GLASSMORPHISM ── */}
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-16 max-w-2xl mx-auto">
          <button 
            onClick={() => router.history.back()} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h1 className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-white bg-clip-text text-transparent">
            Finalizar Pedido
          </h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        
        {/* ── FULFILLMENT TOGGLE ── */}
        <div className="relative flex p-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
          <button
            onClick={() => setFulfillmentMode('delivery')}
            className={cn("flex-1 relative z-10 py-3 text-sm font-bold rounded-xl transition-colors", fulfillmentMode === 'delivery' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Entrega
          </button>
          <button
            onClick={() => setFulfillmentMode('pickup')}
            className={cn("flex-1 relative z-10 py-3 text-sm font-bold rounded-xl transition-colors", fulfillmentMode === 'pickup' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Retirada
          </button>
          <div 
            className={cn("absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-xl transition-transform duration-300 ease-out shadow-[0_0_15px_rgba(250,204,21,0.4)]", fulfillmentMode === 'pickup' ? "translate-x-full left-1" : "left-1")} 
          />
        </div>

        {/* ── ADDRESS SECTION ── */}
        <AnimatePresence mode="wait">
          {fulfillmentMode === 'delivery' ? (
            <motion.div 
              key="delivery"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground ml-1">Local de Entrega</h2>
              
              {loadingAddresses ? (
                <div className="h-20 animate-pulse bg-white/5 rounded-2xl border border-white/5" />
              ) : addresses.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center">
                  <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-foreground font-medium mb-1">Nenhum endereço cadastrado</p>
                  <p className="text-xs text-muted-foreground mb-4">Adicione um endereço para continuar</p>
                  <Button onClick={() => navigate({ to: '/marketplace/addresses' })} className="w-full rounded-xl bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20">
                    <Plus className="w-4 h-4 mr-2" /> Novo Endereço
                  </Button>
                </div>
              ) : (
                <div 
                  onClick={() => setShowAddressModal(true)}
                  className="group bg-gradient-to-br from-white/[0.07] to-transparent backdrop-blur-md border border-white/10 hover:border-primary/50 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{selAddrObj?.street}, {selAddrObj?.number}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{selAddrObj?.neighborhood} • {selAddrObj?.complement || 'Sem complemento'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="pickup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground ml-1">Retirada na Loja</h2>
              <div className="bg-gradient-to-br from-white/[0.07] to-transparent backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bike className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">Retirar no balcão</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{companyName || 'Restaurante'}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PAYMENT METHOD ── */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground ml-1">Pagamento na Entrega</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod('card')}
              className={cn("p-4 rounded-2xl flex flex-col gap-3 border transition-all text-left relative overflow-hidden", paymentMethod === 'card' ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(250,204,21,0.15)]" : "bg-white/5 border-white/10 hover:border-white/20")}
            >
              {paymentMethod === 'card' && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />}
              <CreditCard className={cn("w-6 h-6", paymentMethod === 'card' ? "text-primary" : "text-muted-foreground")} />
              <div>
                <p className="font-bold text-sm">Máquina</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Cartão ou PIX</p>
              </div>
            </button>
            
            <button
              onClick={() => setPaymentMethod('money')}
              className={cn("p-4 rounded-2xl flex flex-col gap-3 border transition-all text-left relative overflow-hidden", paymentMethod === 'money' ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(250,204,21,0.15)]" : "bg-white/5 border-white/10 hover:border-white/20")}
            >
              {paymentMethod === 'money' && <div className="absolute top-0 right-0 w-16 h-16 bg-primary/20 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2" />}
              <Banknote className={cn("w-6 h-6", paymentMethod === 'money' ? "text-primary" : "text-muted-foreground")} />
              <div>
                <p className="font-bold text-sm">Dinheiro</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Nota em espécie</p>
              </div>
            </button>
          </div>

          <AnimatePresence>
            {paymentMethod === 'money' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Precisa de troco?</p>
                      <p className="text-xs text-muted-foreground">Opcional</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={needsChange} onChange={(e) => setNeedsChange(e.target.checked)} />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"></div>
                    </label>
                  </div>
                  
                  {needsChange && (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-xs text-muted-foreground mb-2">Troco para quanto?</p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                        <input
                          type="number"
                          value={changeFor}
                          onChange={(e) => setChangeFor(e.target.value)}
                          placeholder="Ex: 50"
                          className="w-full h-11 bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── ADDITIONAL INFO ── */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground ml-1">Detalhes do Pedido</h2>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm font-medium">CPF na nota (Opcional)</p>
              </div>
              <button onClick={() => setShowCpfInput(!showCpfInput)} className="text-xs font-bold text-primary px-3 py-1.5 rounded-lg bg-primary/10">
                {cpf ? 'Alterar' : 'Adicionar'}
              </button>
            </div>
            
            <AnimatePresence>
              {showCpfInput && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-black/20">
                  <div className="p-4">
                    <input
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full h-11 bg-background/50 border border-white/10 rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Para o entregador te achar</p>
                </div>
              </div>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full h-11 bg-background/50 border border-white/10 rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                required
              />
            </div>
          </div>
        </div>

      </main>

      {/* ── STICKY FOOTER TICKET ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
            {/* Glossy highlight */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 pointer-events-none" />
            
            <div className="relative z-10 space-y-3 mb-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal ({count} {count === 1 ? 'item' : 'itens'})</span>
                <span className="font-medium">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              
              {fulfillmentMode === 'delivery' && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span className="font-medium">
                    {loadingFee ? <Loader2 className="w-4 h-4 animate-spin inline" /> : (deliveryFee ? `R$ ${deliveryFee.toFixed(2).replace('.', ',')}` : 'Grátis')}
                  </span>
                </div>
              )}
              
              <div className="h-px w-full bg-white/10 my-2" />
              
              <div className="flex justify-between items-end">
                <span className="text-base font-medium">Total</span>
                <span className="text-2xl font-bold tracking-tight text-primary">R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <Button 
              className="w-full h-14 rounded-2xl text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_20px_rgba(250,204,21,0.3)] border border-primary/50 relative z-10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              onClick={handleSubmit}
              disabled={loading || (fulfillmentMode === 'delivery' && loadingFee)}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirmar Pedido'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── ADDRESS SELECTION MODAL ── */}
      <Dialog open={showAddressModal} onOpenChange={setShowAddressModal}>
        <DialogContent className="max-w-md w-[95vw] rounded-3xl bg-background/95 backdrop-blur-2xl border border-white/10 p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-white/5">
            <DialogTitle className="text-xl font-bold">Onde entregar?</DialogTitle>
          </DialogHeader>
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <RadioGroup value={selectedAddress ?? ''} onValueChange={(val) => { setSelectedAddress(val); setShowAddressModal(false); }} className="space-y-3">
              {addresses.map(addr => (
                <div key={addr.id} className={cn("relative flex items-start gap-4 border rounded-2xl p-4 transition-colors cursor-pointer", selectedAddress === addr.id ? "bg-primary/10 border-primary" : "bg-white/5 border-white/10")}>
                  <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="mt-1" />
                  <label htmlFor={`addr-${addr.id}`} className="flex-1 cursor-pointer">
                    <p className="font-bold text-sm text-foreground mb-1">{addr.street}, {addr.number}</p>
                    <p className="text-xs text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                  </label>
                  {selectedAddress === addr.id && <div className="absolute inset-0 border-2 border-primary rounded-2xl pointer-events-none" />}
                </div>
              ))}
            </RadioGroup>
            <div className="mt-6 space-y-3">
              <Button 
                type="button"
                variant="outline" 
                className="w-full h-12 rounded-xl border-dashed border-white/20 bg-transparent hover:bg-white/5" 
                onClick={() => {
                  setShowAddressModal(false);
                  setTimeout(() => navigate({ to: '/marketplace/addresses', search: { returnTo: '/marketplace/checkout' } as any }), 100);
                }}
              >
                <Plus className="h-4 w-4 mr-2 text-muted-foreground" />
                Adicionar novo endereço
              </Button>
              <Button 
                type="button"
                variant="ghost" 
                className="w-full h-12 rounded-xl text-muted-foreground hover:bg-white/5" 
                onClick={() => setShowAddressModal(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <RequirePhoneModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        phoneInput={phoneInput}
        setPhoneInput={setPhoneInput}
        onSubmit={handlePhoneSubmit}
        isSubmitting={isSubmittingPhone}
      />
    </div>
  );
}
