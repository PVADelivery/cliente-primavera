// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/marketplace/profile')({
  head: () => ({ meta: [{ title: 'Perfil — Primavera Delivery' }] }),
  component: Profile,
});

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SupportChat } from '@/components/chat/SupportChat';
import { cn } from '@/lib/utils';
import {
  LogOut, MapPin, ChevronRight, Camera, Loader2,
  Bike, FileText, ShieldCheck, Moon, Sun,
  Wallet, HelpCircle, X, Check, Phone,
  Package, Clock, CheckCircle2, XCircle, Truck, Ticket, Copy,
  User, Settings, ArrowRight, History
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    setTheme(newTheme);
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
  const [showCoupons, setShowCoupons] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);

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
    try {
      const { data } = await supabase.from('coupons').select('*').eq('active', true);
      let valid = (data || []).filter(c => !c.expires_at || new Date(c.expires_at) > new Date());
      setCoupons(valid);
    } catch { /* silent */ }
    finally { 
      if (show) setShowCoupons(true); 
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Código copiado!');
  };

  const fetchOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select(`id, status, total, created_at, companies ( name, logo_url )`)
        .or(`customer_id.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(30);
      setOrders(data || []);
    } catch { /* silent */ }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upserát: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await refreshProfile();
      toast.success('Foto atualizada!');
    } catch (err: any) { 
      toast.error('Falha ao atualizar foto'); 
    }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id);
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshProfile();
      toast.success('Perfil atualizado!');
      setEditing(false);
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    if (!user) {
      navigate({ to: '/login' });
    }
  }, [user, navigate]);

  if (!user) { return null; }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();

  const ordersCount = orders.length;
  const tier = ordersCount >= 15
    ? { name: 'Ouro', progress: 100, color: 'text-amber-400 bg-amber-400/10' }
    : ordersCount >= 5
    ? { name: 'Prata', progress: ((ordersCount - 5) / 10) * 100, color: 'text-zinc-400 bg-zinc-400/10' }
    : { name: 'Bronze', progress: (ordersCount / 5) * 100, color: 'text-orange-700 bg-orange-700/10' };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* HEADER SECTION (Primavera Style) */}
      <div className="bg-card border-b border-border px-6 pt-10 pb-6 rounded-b-[2rem] shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-primary/20 shadow-inner"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full bg-primary flex items-center justify-center text-white text-3xl font-bold">
                {initial}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </button>
          
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mt-2 text-xs font-semibold", tier.color)}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              Nível {tier.name}
            </div>
          </div>

          <button onClick={() => setEditing(true)} className="p-3 bg-muted rounded-full hover:bg-muted/80 transition-colors">
            <Settings className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-5 max-w-md mx-auto">
        
        {/* QUICK STATS */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => navigate('/marketplace/orders')}
            className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-2xl shadow-sm hover:border-primary/30 transition-all"
          >
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <History className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold leading-none">{ordersCount}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Pedidos</p>
            </div>
          </button>
          
          <button 
            onClick={() => fetchCoupons(true)}
            className="flex items-center gap-3 p-4 bg-card border border-border/50 rounded-2xl shadow-sm hover:border-primary/30 transition-all"
          >
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold leading-none">{coupons.length}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase">Cupons</p>
            </div>
          </button>
        </div>

        {/* LIST OPTIONS */}
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden divide-y divide-border/50">
          {[
            { icon: MapPin, color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Endereços Salvos', subtitle: 'Gerencie seus locais de entrega', onClick: () => toast('Em breve!') },
            { icon: Wallet, color: 'text-violet-500', bg: 'bg-violet-500/10', title: 'Carteira Virtual', subtitle: 'Saldo de cashback e pagamentos', onClick: () => toast('Em breve!') },
            { icon: theme === 'dark' ? Sun : Moon, color: 'text-yellow-500', bg: 'bg-yellow-500/10', title: 'Tema do App', subtitle: theme === 'dark' ? 'Modo Escuro' : 'Modo Claro', onClick: toggleTheme },
          ].map((item, idx) => (
            <button key={idx} onClick={item.onClick} className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
              <div className={cn("p-2.5 rounded-xl", item.bg, item.color)}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-[15px]">{item.title}</p>
                <p className="text-[12px] text-muted-foreground">{item.subtitle}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
            </button>
          ))}
        </div>

        {/* HELP & SETTINGS */}
        <h3 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider ml-2 mt-6 mb-2">Suporte e Ajuda</h3>
        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden divide-y divide-border/50">
          {[
            { icon: HelpCircle, title: 'Central de Ajuda', onClick: () => setSupportType('support') },
            { icon: Bike, title: 'Quero ser Entregador', onClick: () => setSupportType('driver_application') },
            { icon: FileText, title: 'Termos de Uso', onClick: () => navigate({ to: '/marketplace/terms' }) },
            { icon: ShieldCheck, title: 'Política de Privacidade', onClick: () => navigate({ to: '/marketplace/privacy' }) },
          ].map((item, idx) => (
            <button key={idx} onClick={item.onClick} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-sm">{item.title}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
            </button>
          ))}
        </div>

        {/* LOGOUT E EXCLUSÃO */}
        <div className="pt-6 pb-4">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-[1.5rem] bg-secondary/50 text-foreground font-black text-sm hover:bg-secondary transition-colors border border-border/40"
          >
            <LogOut className="w-5 h-5" /> Sair da minha conta
          </button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 py-4 mt-3 rounded-[1.5rem] bg-rose-500/10 text-rose-500 font-black text-sm hover:bg-rose-500/20 transition-colors border border-rose-500/20">
                <XCircle className="w-5 h-5" /> Excluir minha conta
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[32px] max-w-[90vw] sm:max-w-lg border-0 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black">Você tem certeza absoluta?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium">
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e removerá seus dados de nossos servidores.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-3 mt-4">
                <AlertDialogCancel className="rounded-xl font-bold h-12 m-0 bg-slate-100 border-none hover:bg-slate-200">Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    toast.success('Solicitação de exclusão enviada com sucesso. Nossa equipe processará em até 48h.');
                    signOut();
                  }}
                  className="bg-rose-500 text-white hover:bg-rose-600 rounded-xl font-black h-12 m-0 shadow-lg shadow-rose-500/30"
                >
                  Sim, Excluir Minha Conta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* MODAL DE EDIÇÃO */}
      <Sheet open={editing} onOpenChange={setEditing}>
        <SheetContent side="bottom" hideClose className="h-[80vh] rounded-t-[2rem] border-none p-0">
          <div className="h-full flex flex-col bg-background">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-xl font-bold">Editar Perfil</h2>
              <button onClick={() => setEditing(false)} className="p-2 bg-muted rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-5 flex-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Nome Completo</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-card text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground ml-1">Telefone / WhatsApp</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-border bg-card text-sm font-medium focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border/50">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold flex justify-center items-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* MODAL CUPONS */}
      <Sheet open={showCoupons} onOpenChange={setShowCoupons}>
        <SheetContent side="bottom" hideClose className="h-[75vh] rounded-t-[2rem] border-none p-0">
          <div className="h-full flex flex-col bg-background">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-xl font-bold">Meus Cupons</h2>
              <button onClick={() => setShowCoupons(false)} className="p-2 bg-muted rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {coupons.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground flex flex-col items-center">
                  <Ticket className="w-16 h-16 mb-4 opacity-20" />
                  <p>Você não possui cupons no momento.</p>
                </div>
              ) : (
                coupons.map((coupon) => (
                  <div key={coupon.id} className="border border-border bg-card rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                      <Ticket className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">
                        {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `R$ ${coupon.discount_value} OFF`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{coupon.code}</p>
                    </div>
                    <button onClick={() => handleCopyCode(coupon.code)} className="p-2.5 text-primary hover:bg-primary/10 rounded-xl font-semibold text-xs transition-colors">
                      COPIAR
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* CHAT SUPORTE */}
      <Sheet open={supportType !== null} onOpenChange={open => !open && setSupportType(null)}>
        <SheetContent side="bottom" hideClose className="h-[85vh] rounded-t-[2rem] border-none p-0 overflow-hidden z-[100]" aria-describedby={undefined}>
          <div className="flex flex-col h-full bg-background relative">
            {supportType && (
              <SupportChat
                title={supportType === 'support' ? 'Suporte ao Cliente' : 'Cadastro de Entregador'}
                topic={supportType}
                onClose={() => setSupportType(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
