import { useEffect, useState } from 'react';
import { useNavigate, useRouter, createFileRoute, useSearch } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Address } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Plus, Pencil, Trash2, Loader2, Home, Briefcase, Users, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { motion, AnimatePresence } from 'framer-motion';

export const Route = createFileRoute('/marketplace/addresses')({
  component: Addresses,
});

function Addresses() {
  const queryClient = useQueryClient();
  const search = useSearch({ from: '/marketplace/addresses' }) as any;
  const returnTo = search?.returnTo;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem('@epraja_selected_address');
      if (saved) setSelectedAddressId(saved);
    }
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    street: '', number: '', neighborhood: '', city: 'Primavera do Leste - MT',
    complement: '', reference: '', label: '',
  });
  const [selectedLabel, setSelectedLabel] = useState<string>('Casa');
  const [allHoods, setAllHoods] = useState<Array<{ name: string; regionId?: string }>>([]);
  const [isHoodFocused, setIsHoodFocused] = useState(false);

  useEffect(() => {
    async function loadOfficialHoods() {
      const set = new Set<string>();
      const list: Array<{ name: string; regionId?: string }> = [];

      try {
        // 1. Busca primeiro as regiões e bairros cadastrados pelo Admin no banco
        const { data: regions } = await supabase.from('regions').select('id, name').order('name');
        if (regions && regions.length > 0) {
          regions.forEach((r: any) => {
            const cleanName = r.name.replace(/^[*0-9\s]+/, '').trim();
            if (cleanName && !set.has(cleanName.toUpperCase())) {
              set.add(cleanName.toUpperCase());
              list.push({ name: cleanName, regionId: r.id });
            }
          });
        }

        const { data: dbHoods } = await supabase.from('region_neighborhoods').select('name, region_id').order('name');
        if (dbHoods && dbHoods.length > 0) {
          dbHoods.forEach((h: any) => {
            if (h.name && !set.has(h.name.trim().toUpperCase())) {
              set.add(h.name.trim().toUpperCase());
              list.push({ name: h.name.trim(), regionId: h.region_id });
            }
          });
        }
      } catch (err) {
        console.error('[Addresses] Error loading official neighborhoods:', err);
      }

      // 2. Lista de fallback de bairros de Primavera do Leste
      const staticList = [
        "CENTRO", "CENTRO LESTE", "JD DAS AMERICAS 1/2/3", "LAGO MUNICIPAL", "JD ITALIA", "JD MARINGA",
        "JD MILANO", "JD PROGRESSO", "PONCHO VERDE 1/2", "SÃO CRISTOVÃO 1/2/3", "VERTENTES DAS ÁGUAS",
        "BELA VISTA", "PONCHO VERDE 3/4/5", "JD LUCIANA 1/2", "DISTRITO INDUSTRIAL", "BELVEDERE",
        "VOLTA GRANDE", "BURITIS 1/2/3/4/5", "PVA 3 - PADRE ONESTO COSTA", "JD FLORENÇA - VILA GRAMADO",
        "3 AMERICAS", "BURITIS 6 / BURITIS PRIME", "BURITIS UNIVERSITARIO 1/2 - FASIPE", "JARDIM EUROPA",
        "CHACARA FONTANA", "PORTO SEGURO", "SPLENDORE", "SANTA FELICIDADE 1/2", "JD DOS IPES (CASAS PACAEMBU)",
        "SAIDA PARA CV / CUIABA / PRF", "SAIDA PARA BARRA / INDUSTRIAL JOSE DE ALENCAR",
        "SAIDA PARA PTGA / JOHN DEERE", "CASTELANDIA 1/2/3/4", "SÃO JOSE", "CRISTO REI - FELIZ NATAL",
        "PIONEIRO", "INDUSTRIAL ATACADÃO", "TUIUIU", "GUTERRES", "ALVORADA"
      ];

      staticList.forEach(n => {
        if (!set.has(n.toUpperCase())) {
          set.add(n.toUpperCase());
          list.push({ name: n });
        }
      });

      setAllHoods(list);
    }
    loadOfficialHoods();
  }, []);

  const filteredHoods = allHoods.filter(h => 
    !form.neighborhood.trim() || h.name.toLowerCase().includes(form.neighborhood.trim().toLowerCase())
  ).slice(0, 15);

  const fetchAddresses = async (userId: string) => {
    try {
      // 1. Resolve o customer_id real do usuário na tabela customers
      let customerId = userId;
      try {
        const { data: cust } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();
        if (cust?.id) customerId = cust.id;
      } catch (e) {}

      // 2. Busca os endereços vinculados a esse customer
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .or(`customer_id.eq.${customerId},customer_id.eq.${userId}`);

      if (!error && data && data.length > 0) {
        setAddresses((data as Address[]).sort((a: any, b: any) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ));
        setLoading(false);
        return;
      }

      // 3. Fallback geral
      const { data: fallbackData } = await supabase.from('addresses').select('*');
      if (fallbackData) {
        const filtered = (fallbackData as any[]).filter(
          (a) => a.customer_id === customerId || a.customer_id === userId || a.user_id === userId
        ) as Address[];
        setAddresses(filtered.sort((a: any, b: any) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ));
      } else {
        setAddresses([]);
      }
    } catch (e) {
      console.warn("[Addresses] Falha ao carregar endereços:", e);
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAddresses(user.id);
    }
  }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ street: '', number: '', neighborhood: '', city: 'Primavera do Leste - MT', complement: '', reference: '', label: 'Casa' });
    setSelectedLabel('Casa');
    setShowForm(true);
  };

  const openEdit = (addr: any) => {
    setEditing(addr);
    setForm({
      street: addr.street, number: addr.number, neighborhood: addr.neighborhood || '',
      city: addr.city, complement: addr.complement || '', reference: addr.reference || '',
      label: addr.label || '',
    });
    const standardLabels = ['Casa', 'Trabalho', 'Família'];
    if (addr.label && standardLabels.includes(addr.label)) {
      setSelectedLabel(addr.label);
    } else if (addr.label) {
      setSelectedLabel('Outro');
    } else {
      setSelectedLabel('');
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Usuário não identificado. Faça login novamente.'); return;
    }
    if (!form.street || !form.number || !form.neighborhood || !form.city) {
      toast.error('Preencha os campos obrigatórios (Rua, Nº, Bairro, Cidade)'); return;
    }

    // 1. Resolve ou cria o registro de customer na tabela customers (necessário para a FK e RLS de addresses)
    let customerId: string | null = null;
    try {
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingCust?.id) {
        customerId = existingCust.id;
      } else {
        const { data: newCust, error: newCustErr } = await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
            phone: profile?.phone || user.user_metadata?.phone || null,
          })
          .select('id')
          .single();

        if (newCust?.id) {
          customerId = newCust.id;
        } else if (newCustErr) {
          console.warn('[Addresses] Aviso ao provisionar customer:', newCustErr);
        }
      }
    } catch (custErr) {
      console.warn('[Addresses] Falha ao resolver customer_id:', custErr);
    }

    if (!customerId) {
      customerId = user.id;
    }

    const complementText = [form.complement, form.reference ? `Ref: ${form.reference}` : ''].filter(Boolean).join(' - ') || null;

    const payload: any = {
      customer_id: customerId,
      street: form.street.trim(),
      number: form.number.trim(),
      neighborhood: form.neighborhood.trim(), 
      city: form.city.trim(),
      complement: complementText,
      label: form.label || null,
    };
    
    let savedAddressId: string | null = null;

    if (editing) {
      const { data: updatedAddr, error } = await supabase
        .from('addresses')
        .update(payload)
        .eq('id', editing.id)
        .select('id')
        .maybeSingle();

      if (error) { toast.error('Erro ao atualizar endereço: ' + error.message); return; }
      savedAddressId = updatedAddr?.id || editing.id;
      toast.success('Endereço atualizado com sucesso!');
    } else {
      const { data: insertedAddr, error } = await supabase
        .from('addresses')
        .insert(payload)
        .select('id')
        .maybeSingle();

      if (error) { toast.error('Erro ao salvar endereço: ' + error.message); return; }
      savedAddressId = insertedAddr?.id || null;
      toast.success('Endereço adicionado com sucesso!');
    }

    if (savedAddressId) {
      localStorage.setItem('@epraja_selected_address', savedAddressId);
    }

    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ['addresses'] });
    fetchAddresses(user.id);

    if (returnTo) {
      setTimeout(() => {
        navigate({ to: returnTo as any });
      }, 400);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('addresses').delete().eq('id', id);
    toast.success('Endereço removido');
    queryClient.invalidateQueries({ queryKey: ['addresses'] });
    if (user) {
      fetchAddresses(user.id);
    }
  };

  const getLabelIcon = (label: string) => {
    if (label === 'Casa') return <Home className="w-4 h-4" />;
    if (label === 'Trabalho') return <Briefcase className="w-4 h-4" />;
    if (label === 'Família') return <Users className="w-4 h-4" />;
    return <Star className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* ── HEADER GLASSMORPHISM ── */}
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-16 max-w-2xl mx-auto">
          <button 
            onClick={() => showForm ? setShowForm(false) : router.history.back()} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card/70 hover:bg-white/10 transition-colors border border-border"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h1 className="font-display font-bold text-lg tracking-tight text-foreground">
            {showForm ? (editing ? 'Editar Endereço' : 'Novo Endereço') : 'Meus Endereços'}
          </h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <AnimatePresence mode="wait">
          {!showForm ? (
            <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <Button 
                onClick={openNew} 
                className="w-full h-14 rounded-2xl bg-primary text-black font-black hover:bg-primary/90 shadow-md transition-all text-sm cursor-pointer"
              >
                <Plus className="h-5 w-5 mr-2 text-black" /> 
                Cadastrar Novo Endereço
              </Button>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-28 bg-card/70 rounded-2xl animate-pulse border border-white/5" />)}
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-16 bg-card/70 rounded-3xl border border-border backdrop-blur-md">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-lg font-bold text-foreground">Sem endereços cadastrados</p>
                  <p className="text-sm text-muted-foreground mt-1 px-8">Adicione um endereço de entrega para começar a fazer seus pedidos.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <RadioGroup 
                    value={selectedAddressId} 
                    onValueChange={(val) => {
                      setSelectedAddressId(val);
                      localStorage.setItem('@epraja_selected_address', val);
                      toast.success('Endereço definido como padrão!');
                      if (returnTo) {
                        setTimeout(() => navigate({ to: returnTo }), 400);
                      }
                    }}
                    className="space-y-4"
                  >
                    <AnimatePresence>
                      {addresses.map(addr => (
                        <motion.div 
                          key={addr.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn("relative bg-card/70 backdrop-blur-md border rounded-2xl p-4 transition-all overflow-hidden", selectedAddressId === addr.id ? "border-primary shadow-[0_0_20px_rgba(255,222,33,0.15)]" : "border-border")}
                        >
                          {selectedAddressId === addr.id && <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />}
                          
                          <div className="flex items-start gap-4">
                            <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="mt-1 shrink-0" />
                            <label htmlFor={`addr-${addr.id}`} className="flex-1 cursor-pointer min-w-0">
                              {addr.label && (
                                <div className="flex items-center gap-1.5 mb-2 text-foreground font-extrabold text-xs uppercase tracking-wider">
                                  {getLabelIcon(addr.label)}
                                  {addr.label}
                                </div>
                              )}
                              <p className="font-bold text-base text-foreground mb-1">{addr.street}, {addr.number}</p>
                              <p className="text-sm text-muted-foreground">{addr.neighborhood} - {addr.city}</p>
                              {addr.complement && <p className="text-sm text-muted-foreground mt-0.5">{addr.complement}</p>}
                            </label>
                            <div className="flex flex-col gap-2 shrink-0 relative z-10">
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEdit(addr); }} className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-foreground hover:bg-white/20 transition-colors">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(addr.id); }} className="h-9 w-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </RadioGroup>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
              <div className="bg-card/70 backdrop-blur-2xl border border-border rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Como quer chamar este local?</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'Casa', icon: Home },
                      { value: 'Trabalho', icon: Briefcase },
                      { value: 'Família', icon: Users },
                      { value: 'Outro', icon: Star }
                    ].map((opt) => {
                      const active = selectedLabel === opt.value;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSelectedLabel(opt.value);
                            if (opt.value !== 'Outro') {
                              setForm(f => ({ ...f, label: opt.value }));
                            } else {
                              setForm(f => ({ ...f, label: '' }));
                            }
                          }}
                          className={cn(
                            "px-4 py-2.5 flex items-center gap-2 text-sm font-black rounded-xl border transition-all duration-200 active:scale-95 cursor-pointer",
                            active 
                              ? "bg-primary text-black border-primary shadow-sm" 
                              : "bg-card/70 border-border hover:border-white/20 text-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {opt.value}
                        </button>
                      );
                    })}
                  </div>
                  <AnimatePresence>
                    {selectedLabel === 'Outro' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2 overflow-hidden">
                        <Input 
                          placeholder="Ex: Faculdade, Namorada..." 
                          value={form.label} 
                          onChange={e => setForm(f => ({ ...f, label: e.target.value }))} 
                          className="h-12 rounded-xl bg-background/50 border-border focus:border-primary/50 text-sm" 
                          maxLength={20}
                          autoFocus
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Rua *</Label>
                    <Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-border" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nº *</Label>
                    <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-border" />
                  </div>
                </div>
                
                <div className="space-y-1.5 relative">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Bairro *</span>
                    <span className="text-[10px] text-primary font-normal">Selecione na lista para frete exato</span>
                  </Label>
                  <div className="relative">
                    <Input 
                      placeholder="Digite ou selecione seu bairro..."
                      value={form.neighborhood} 
                      onChange={e => {
                        setForm(f => ({ ...f, neighborhood: e.target.value }));
                        setIsHoodFocused(true);
                      }} 
                      onFocus={() => setIsHoodFocused(true)}
                      onBlur={() => setTimeout(() => setIsHoodFocused(false), 200)}
                      className="h-12 rounded-xl bg-background/50 border-border focus:border-primary text-sm pr-10" 
                    />
                    <MapPin className="w-4 h-4 text-primary absolute right-3.5 top-4 pointer-events-none" />
                  </div>

                  {/* Dropdown de Bairros Oficiais do Admin */}
                  {isHoodFocused && filteredHoods.length > 0 && (
                    <div className="absolute left-0 right-0 top-[72px] z-50 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-border/40">
                      {filteredHoods.map((h, idx) => (
                        <button
                          key={`${h.name}-${idx}`}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setForm(f => ({ ...f, neighborhood: h.name }));
                            setIsHoodFocused(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-primary/10 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-bold text-foreground">{h.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cidade *</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-border" />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Complemento</Label>
                  <Input placeholder="Apto, Bloco, Casa 2..." value={form.complement} onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-border" />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ponto de Referência</Label>
                  <Input placeholder="Próximo ao mercado..." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-border" />
                </div>
              </div>
              
              <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/95 backdrop-blur-xl border-t border-border z-50">
                <div className="max-w-2xl mx-auto flex gap-3">
                  <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl h-14 flex-1 text-muted-foreground hover:text-foreground bg-card/70 hover:bg-white/10">Cancelar</Button>
                  <Button onClick={handleSave} className="rounded-xl h-14 flex-1 font-black bg-primary hover:bg-primary/90 text-black shadow-md cursor-pointer">
                    {editing ? 'Atualizar Endereço' : 'Salvar Endereço'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
