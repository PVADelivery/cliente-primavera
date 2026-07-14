// @ts-nãocheck
import React, { useState, useEffect, useRef } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/marketplace/profile')({
  head: () => ({ meta: [{ title: 'Perfil — Primavera Delivery' }] }),
  component: Profile,
});

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';


// import MarketplaceLayout from '@/components/marketplace/MarketplaceLayout';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SupportChat } from '@/components/chat/SupportChat';
import { cn } from '@/lib/utils';
import {
  LogOut, MapPin, ChevronRight, Camera, Loader2,
  Bike, FileText, ShieldCheck, Moon, Sun,
  Wallet, HelpCircle, X, Check, Phone,
  Package, Clock, CheckCircle2, XCircle, Truck, Ticket, Copy,
  Crown, Sparkles, ShoppingBag, Settings2, Star, Heart,
  ArrowUpRight, Plus, Trophy, Cog
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:    { label: 'Aguardando',  color: 'text-yellow-500 bg-yellow-500/10',  icon: Clock },
  confirmed:  { label: 'Confirmado',  color: 'text-blue-500 bg-blue-500/10',      icon: CheckCircle2 },
  preparing:  { label: 'Preparando',  color: 'text-orange-500 bg-orange-500/10',  icon: Package },
  ready:      { label: 'Pronto',      color: 'text-purple-500 bg-purple-500/10',  icon: CheckCircle2 },
  delivering: { label: 'A caminho',   color: 'text-primary bg-primary/10',        icon: Truck },
  delivered:  { label: 'Entregue',    color: 'text-green-500 bg-green-500/10',    icon: CheckCircle2 },
  completed:  { label: 'Concluído',   color: 'text-green-500 bg-green-500/10',    icon: CheckCircle2 },
  cancelled:  { label: 'Cancelado',   color: 'text-red-500 bg-red-500/10',        icon: XCircle },
};

function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const theme = localStorage.getItem('theme') || 'light';
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    window.dispatchEvent(new Event('storage'));
  };
  const selectedAddress = { region_id: 'none' };
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [supportType, setSupportType] = useState<'support' | 'driver_application' | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showCoupons, setShowCoupons] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    fetchOrders();
    fetchCoupons(false);
  }, [user]);

  const fetchCoupons = async (show = true) => {
    if (show && coupons.length > 0) { setShowCoupons(true); return; }
    if (show) setLoadingCoupons(true);
    try {
      const { data } = await supabase
        .from('coupons')
        .select('*')
        .eq('active', true);
        
      let valid = (data || []).filter(c => !c.expires_at || new Date(c.expires_at) > new Date());
      
      // Busca manualmente as empresas para evitar o Erro 400 (Bad Request) causado pela falta de Foreign Key
      const companyIds = valid.map(c => c.company_id).filter(Boolean);
      if (companyIds.length > 0) {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('user_id, name, logo_url, region_id')
          .in('user_id', companyIds);
          
        valid = valid.map(c => ({
          ...c,
          companies: companiesData?.find(comp => comp.user_id === c.company_id) || null
        }));
      }
      
      if (selectedAddress?.region_id) {
        valid = valid.filter(c => 
          !c.company_id || 
          c.companies?.region_id === selectedAddress.region_id
        );
      }

      setCoupons(valid);
    } catch { /* silent */ }
    finally { 
      if (show) {
        setLoadingCoupons(false); 
        setShowCoupons(true); 
      }
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!', { description: 'Cole na tela de finalização do pedido.' });
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          id, status, total, created_at,
          companies ( name, logo_url )
        `)
        .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(30);
      setOrders(data || []);
    } catch { /* silent */ }
    finally { setLoadingOrders(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          cacheControl: '3600',
          upserát: true 
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success('Foto atualizada com sucesso!');
    } catch (err: any) { 
      console.error('Photo upload error:', err);
      toast.error('Falha não upload: ' + (err.message || 'Erro de permissão ou conexão')); 
    }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
      
      // Delay to ensure DB replication/trigger finish before refetching
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshProfile();
      
      toast.success('Perfil atualizado!');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  if (!user) { navigate('/marketplace/login'); return null; }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();

  // Derived: tier & featured coupon
  const ordersCount = orders.length;
  const tier = ordersCount >= 15
    ? { name: 'Ouro', next: null, progress: 100, color: 'from-yellow-400 to-orange-500' }
    : ordersCount >= 5
    ? { name: 'Prata', next: 15, progress: ((ordersCount - 5) / 10) * 100, color: 'from-zinc-300 to-zinc-500' }
    : { name: 'Bronze', next: 5, progress: (ordersCount / 5) * 100, color: 'from-amber-700 to-orange-600' };

  const featuredCoupon = [...coupons].sort((a, b) =>
    Number(b.discount_value || 0) - Number(a.discount_value || 0)
  )[0];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="min-h-screen pb-40 bg-background text-foreground font-sans">
        <div className="max-w-md mx-auto px-4 pt-6 space-y-3">

          {/* HERO compacto — uma linha */}
          <div className="flex items-center gap-3 pb-2">
            <div className="relative shrink-0">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary ring-offset-2 ring-offset-background active:scale-95 transition-transform"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#e85d3a] to-[#c0421f] flex items-center justify-center">
                    <span className="text-2xl font-display font-bold text-white">{initial}</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                  </div>
                )}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-display font-bold tracking-tight truncate">{displayName}</h1>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              aria-label="Editar perfil"
              className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 transition-transform"
            >
              <Cog className="h-5 w-5 text-foreground/80" />
            </button>
          </div>

          {/* BENTO ROW 1 — Carteira + Nível */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => toast('Carteira em breve!')}
              className="relative overflow-hidden rounded-3xl bg-card border border-border p-5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-foreground/80" />
                </div>
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Carteira</p>
              <p className="font-display text-2xl font-bold tracking-tight mt-1">R$ 0,00</p>
            </button>

            <button
              onClick={() => navigate('/marketplace/orders')}
              className="relative overflow-hidden rounded-3xl bg-card border border-border p-5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center", tier.color)}>
                  <Trophy className="h-4 w-4 text-black/80" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">{ordersCount}{tier.next ? `/${tier.next}` : ''}</span>
              </div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Nível</p>
              <p className="font-display text-2xl font-bold tracking-tight mt-1">{tier.name}</p>
              <div className="mt-2 h-1 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={cn("h-full bg-gradient-to-r", tier.color)}
                  style={{ width: `${Math.min(100, tier.progress)}%` }}
                />
              </div>
            </button>
          </div>

          {/* CUPOM EM DESTAQUE — wide */}
          <button
            onClick={() => fetchCoupons(true)}
            disabled={loadingCoupons}
            className="w-full relative overflow-hidden rounded-3xl p-5 text-left active:scale-[0.99] transition-transform"
            style={{ background: 'linear-gradient(135deg, #e85d3a 0%, #c0421f 100%)' }}
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -right-16 -bottom-12 h-40 w-40 rounded-full border border-white/15" />

            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-black/25 backdrop-blur-md flex items-center justify-center shrink-0">
                <Ticket className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">
                  {featuredCoupon ? 'Cupom em destaque' : 'Cupons disponíveis'}
                </p>
                {featuredCoupon ? (
                  <>
                    <p className="font-display text-2xl font-bold tracking-tight text-white leading-tight">
                      {featuredCoupon.discount_type === 'percentage'
                        ? `${featuredCoupon.discount_value}% OFF`
                        : `R$ ${Number(featuredCoupon.discount_value).toFixed(2).replace('.', ',')} OFF`}
                    </p>
                    <p className="text-[11px] text-white/80 mt-0.5 truncate">
                      Código <span className="font-bold">{featuredCoupon.code}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-2xl font-bold tracking-tight text-white leading-tight">
                      Sem cupons agora
                    </p>
                    <p className="text-[11px] text-white/80 mt-0.5">Fique de olho nas próximas promoções</p>
                  </>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                {loadingCoupons ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ArrowUpRight className="h-4 w-4 text-primary" />}
              </div>
            </div>
          </button>

          {/* BENTO ROW 2 — Pedidos + Favoritos */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/marketplace/orders')}
              className="rounded-3xl bg-card border border-border p-5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-foreground/80" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/70" />
              </div>
              <p className="font-display text-3xl font-bold tracking-tight">{ordersCount}</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground mt-1">Pedidos</p>
            </button>

            <button
              onClick={() => fetchCoupons(true)}
              className="rounded-3xl bg-card border border-border p-5 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-primary" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/70" />
              </div>
              <p className="font-display text-3xl font-bold tracking-tight">{coupons.length}</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground mt-1">Cupons</p>
            </button>
          </div>

          {/* ENDEREÇO ATIVO — wide */}
          <button
            onClick={() => navigate('/marketplace/addresses')}
            className="w-full rounded-3xl bg-card border border-border p-5 flex items-center gap-4 active:scale-[0.99] transition-transform text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Entregar em</p>
              <p className="font-display text-base font-bold tracking-tight truncate mt-0.5">
                {selectedAddress?.label || selectedAddress?.street || 'Adicionar endereço'}
              </p>
              {selectedAddress?.city && (
                <p className="text-[11px] text-muted-foreground truncate">{selectedAddress.city} — {selectedAddress.state || 'MT'}</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
          </button>

          {/* AÇÕES RÁPIDAS — grid 4 */}
          <div className="grid grid-cols-4 gap-2.5 pt-1">
            {[
              { icon: ShoppingBag, label: 'Pedidos', onClick: () => navigate('/marketplace/orders') },
              { icon: Ticket, label: 'Cupons', onClick: () => fetchCoupons(true) },
              { icon: HelpCircle, label: 'Ajuda', onClick: () => setSupportType('support') },
              { icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Claro' : 'Escuro', onClick: () => toggleTheme() },
            ].map((q) => (
              <button
                key={q.label}
                onClick={q.onClick}
                className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center gap-2 active:scale-95 transition-transform"
              >
                <q.icon className="h-5 w-5 text-foreground/80" />
                <span className="text-[10px] font-medium text-muted-foreground">{q.label}</span>
              </button>
            ))}
          </div>

          {/* SECTION — Conta */}
          <div className="pt-4">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground/70 px-2 mb-2">Minha Conta</h2>
            <div className="rounded-3xl bg-card border border-border overflow-hidden divide-y divide-border">
              {[
                { icon: MapPin, label: 'Endereços', subtitle: 'Locais de entrega', onClick: () => navigate('/marketplace/addresses') },
                { icon: Wallet, label: 'Carteira', subtitle: 'Saldo e transações', onClick: () => toast('Em breve!') },
                { icon: theme === 'dark' ? Sun : Moon, label: 'Aparência', subtitle: theme === 'dark' ? 'Modo escuro ativo' : 'Modo claro ativo', onClick: () => toggleTheme(), isThemeToggle: true },
              ].map((item: any) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60 transition-colors active:bg-muted"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <item.icon className="h-[16px] w-[16px] text-foreground/75" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] font-display font-semibold tracking-tight">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                  </div>
                  {item.isThemeToggle ? (
                    <div className={cn(
                      "relative w-11 h-6 rounded-full transition-colors",
                      theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}>
                      <div className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform",
                        theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'
                      )} />
                    </div>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION — Ajuda & Legal */}
          <div className="pt-3">
            <h2 className="text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground/70 px-2 mb-2">Ajuda & Legal</h2>
            <div className="rounded-3xl bg-card border border-border overflow-hidden divide-y divide-border">
              {[
                { icon: HelpCircle, label: 'Central de Ajuda', subtitle: 'Suporte e dúvidas', onClick: () => setSupportType('support') },
                { icon: FileText, label: 'Termos de Uso', subtitle: 'Regras da plataforma', onClick: () => navigate('/marketplace/terms') },
                { icon: ShieldCheck, label: 'Privacidade', subtitle: 'Segurança dos dados', onClick: () => navigate('/marketplace/privacy') },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60 transition-colors active:bg-muted"
                >
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <item.icon className="h-[16px] w-[16px] text-foreground/75" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] font-display font-semibold tracking-tight">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          </div>

          {/* CTA Entregador — full bleed */}
          <button
            onClick={() => setSupportType('driver_application')}
            className="w-full mt-4 relative overflow-hidden rounded-3xl p-5 text-left active:scale-[0.99] transition-transform border border-white/5 text-white"
            style={{ background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)' }}
          >
            <div className="absolute -right-4 -bottom-4 opacity-[0.07]">
              <Bike className="h-32 w-32 text-white" />
            </div>
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                <Bike className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary-foreground/90">Oportunidade</p>
                <p className="font-display text-base font-bold tracking-tight mt-0.5">Seja um entregador</p>
                <p className="text-[11px] text-white/60 mt-0.5">Ganhos extras e liberdade total</p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/60" />
            </div>
          </button>

          {/* Danger zone */}
          <div className="pt-4 space-y-2">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-card border border-border text-foreground font-display font-semibold text-[13px] active:scale-[0.98] transition-transform"
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full text-[10px] text-muted-foreground/50 hover:text-red-400 transition-colors py-3 font-medium uppercase tracking-[0.25em]">
                  Excluir minha conta
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl border-none p-8">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-display font-bold">Excluir sua conta?</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                    Esta ação é permanente e todos os seus dados de pedidos e cupons seráão perdidos para sempre.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-3 mt-6">
                  <AlertDialogAction
                    onClick={async () => {
                      const { error } = await supabase.rpc('delete_my_account');
                      if (error) {
                        toast.error('Erro ao excluir conta: ' + error.message);
                      } else {
                        await signOut();
                        navigate('/marketplace/login');
                      }
                    }}
                    className="bg-destructive hover:bg-destructive/90 h-14 rounded-2xl text-white font-bold"
                  >
                    Sim, excluir definitivamente
                  </AlertDialogAction>
                  <AlertDialogCancel className="h-14 rounded-2xl border-none bg-muted text-foreground font-bold">
                    Manter minha conta
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Footer */}
          <div className="py-8 flex flex-col items-center opacity-20">
            <p className="text-[10px] font-display font-bold tracking-[1em] text-foreground ml-3">BONASOFT</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
      </div>

      {/* Edit Profile Sheet */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" hideClose className="h-[75vh] rounded-t-[3rem] border-none p-0 shadow-2xl">
          <SheetTitle className="sr-only">Editar Meus Dados</SheetTitle>
          <div className="h-full flex flex-col bg-background">
            <div className="p-8 pb-6 flex items-center justify-between border-b border-border/50">
              <div>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Configurações</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight">Editar Meus Dados</h3>
              </div>
              <button onClick={() => setEditing(false)} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <X className="h-6 w-6 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {[
                { label: 'Nome completo', value: fullName, onChange: setFullName, placeholder: 'Como quer será chamado?' },
                { label: 'WhatsApp', value: phone, onChange: setPhone, placeholder: '(00) 00000-0000' },
              ].map(f => (
                <div key={f.label} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">{f.label}</label>
                  <input
                    value={f.value}
                    onChange={e => f.onChange(e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-6 py-4.5 rounded-2xl border border-border bg-muted/30 font-bold text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                </div>
              ))}
              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-14 rounded-2xl gradient-primary text-white font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-primary/20 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                  {saving ? 'Salvando Alterações...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Support Chat Sheet */}
      <Sheet open={supportType !== null} onOpenChange={open => !open && setSupportType(null)}>
        <SheetContent side="bottom" hideClose className="h-[85vh] rounded-t-[3rem] border-none p-0 overflow-hidden shadow-2xl z-[100]" aria-describedby={undefined}>
          <SheetTitle className="sr-only">Chat de Suporte</SheetTitle>
          <div className="flex flex-col h-full bg-background relative">
            {supportType && (
              <SupportChat
                title={supportType === 'support' ? 'Central de Ajuda' : 'Cadastro de Entregador'}
                topic={supportType}
                onClose={() => setSupportType(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Coupons List Sheet */}
      <Sheet open={showCoupons} onOpenChange={setShowCoupons}>
        <SheetContent side="bottom" hideClose className="h-[85vh] rounded-t-[3rem] border-none p-0 shadow-2xl">
          <SheetTitle className="sr-only">Meus Cupons</SheetTitle>
          <div className="h-full flex flex-col bg-background">
            <div className="px-8 pt-8 pb-6 flex items-center justify-between border-b border-border shrink-0">
              <div>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Clube É Pra Já</p>
                <h3 className="text-2xl font-black text-foreground tracking-tight">Cupons Disponíveis</h3>
              </div>
              <button onClick={() => setShowCoupons(false)} className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <X className="h-6 w-6 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingCoupons ? (
                <div className="py-20 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              ) : coupons.length === 0 ? (
                <div className="py-24 flex flex-col items-center gap-4 text-center">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center opacity-20">
                    <Ticket className="h-10 w-10 text-foreground" />
                  </div>
                  <p className="font-black text-lg text-foreground/40 tracking-tight">Nenhum cupom ativo não momento</p>
                  <p className="text-xs text-muted-foreground/60 max-w-[200px]">Fique de olho em nãossas redes para nãovas promoções!</p>
                </div>
              ) : (
                coupons.map((coupon) => (
                  <div key={coupon.id} className="relative overflow-hidden rounded-[2rem] bg-card border border-border shadow-sm group">
                    <div className="p-5 flex gap-5 items-center">
                      <div className="w-16 h-16 shrink-0 rounded-2xl bg-primary/10 flex flex-col items-center justify-center gap-0.5 border border-primary/5">
                        <Ticket className="h-6 w-6 text-primary" />
                        <span className="text-[8px] font-black text-primary uppercase tracking-widest">VIP</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xl font-black text-foreground leading-tight tracking-tight">
                          {coupon.discount_type === 'percentage'
                            ? `${coupon.discount_value}% OFF`
                            : `R$ ${Number(coupon.discount_value).toFixed(2).replace('.', ',')} OFF`}
                        </p>
                        <p className="text-[11px] font-bold text-primary uppercase tracking-wider mt-1">
                          {coupon.companies?.name || 'Válido em toda a plataforma'}
                        </p>
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-muted text-[10px] font-black uppercase tracking-widest text-primary border border-primary/10">
                            {coupon.code}
                          </span>
                          {coupon.expires_at && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase">
                              <Clock className="h-3 w-3" />
                              Expira {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-muted/30 border-t border-dashed border-border px-6 py-3 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider">
                        {coupon.min_order_value > 0
                          ? `Pedido mínimo R$ ${Number(coupon.min_order_value).toFixed(2).replace('.', ',')}`
                          : 'Sem valor mínimo'}
                      </span>
                      <button
                        onClick={() => handleCopyCode(coupon.code)}
                        className="flex items-center gap-1.5 text-xs font-black text-primary hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                      >
                        <Copy className="h-4 w-4" /> Copiar Código
                      </button>
                    </div>

                    {/* Ticket cutouts */}
                    <div className="absolute top-[88px] -left-3 h-6 w-6 rounded-full bg-background border border-border/50" />
                    <div className="absolute top-[88px] -right-3 h-6 w-6 rounded-full bg-background border border-border/50" />
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
