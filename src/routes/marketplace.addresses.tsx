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
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(() => localStorage.getItem('@epraja_selected_address') || '');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [regions, setRegions] = useState<any[]>([]);
  const [form, setForm] = useState({
    street: '', number: '', neighborhood: '', region_id: '', city: 'Primavera do Leste - MT',
    complement: '', reference: '', label: '',
  });
  const [selectedLabel, setSelectedLabel] = useState<string>('Casa');

  const fetchAddresses = async (userId: string) => {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("[Addresses] Erro ao buscar endereços:", error);
    } else {
      setAddresses(data || []);
    }

    const { data: regionsData } = await supabase.from('regions').select('*').order('name');
    if (regionsData) {
      setRegions(regionsData);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchAddresses(user.id);
    }
  }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ street: '', number: '', neighborhood: '', region_id: '', city: 'Primavera do Leste - MT', complement: '', reference: '', label: 'Casa' });
    setSelectedLabel('Casa');
    setShowForm(true);
  };

  const openEdit = (addr: any) => {
    setEditing(addr);
    setForm({
      street: addr.street, number: addr.number, neighborhood: addr.neighborhood, region_id: addr.region_id || '',
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
    if (!form.street || !form.number || !form.region_id || !form.city) {
      toast.error('Preencha os campos obrigatórios (Rua, Nº, Região, Cidade)'); return;
    }

    const payload = {
      user_id: user.id,
      street: form.street, number: form.number,
      neighborhood: form.neighborhood, 
      region_id: form.region_id,
      city: form.city,
      complement: form.complement || null, reference: form.reference || null,
      label: form.label || null,
    };
    
    if (editing) {
      const { error } = await supabase.from('addresses').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar: ' + error.message); return; }
      toast.success('Endereço atualizado');
    } else {
      const { error } = await supabase.from('addresses').insert(payload);
      if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
      toast.success('Endereço adicionado');
    }
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ['addresses'] });
    fetchAddresses(user.id);
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
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h1 className="font-display font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-white bg-clip-text text-transparent">
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
                className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 border border-primary/30 text-primary font-bold shadow-[0_0_15px_rgba(250,204,21,0.1)] transition-all"
              >
                <Plus className="h-5 w-5 mr-2" /> 
                Cadastrar Novo Endereço
              </Button>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => <div key={i} className="h-28 bg-white/5 rounded-2xl animate-pulse border border-white/5" />)}
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-10 w-10 text-primary/50" />
                  </div>
                  <p className="text-lg font-bold text-foreground">Sem endereços</p>
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
                          className={cn("relative bg-white/5 backdrop-blur-md border rounded-2xl p-4 transition-all overflow-hidden", selectedAddressId === addr.id ? "border-primary shadow-[0_0_20px_rgba(250,204,21,0.15)]" : "border-white/10")}
                        >
                          {selectedAddressId === addr.id && <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />}
                          
                          <div className="flex items-start gap-4">
                            <RadioGroupItem value={addr.id} id={`addr-${addr.id}`} className="mt-1 shrink-0" />
                            <label htmlFor={`addr-${addr.id}`} className="flex-1 cursor-pointer min-w-0">
                              {addr.label && (
                                <div className="flex items-center gap-1.5 mb-2 text-primary font-bold text-xs uppercase tracking-wider">
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
              <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
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
                            "px-4 py-2.5 flex items-center gap-2 text-sm font-bold rounded-xl border transition-all duration-200 active:scale-95",
                            active 
                              ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(250,204,21,0.2)]" 
                              : "bg-white/5 border-white/10 hover:border-white/20 text-foreground"
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
                          className="h-12 rounded-xl bg-background/50 border-white/10 focus:border-primary/50 text-sm" 
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
                    <Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-white/10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nº *</Label>
                    <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-white/10" />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Região/Bairro *</Label>
                  <select
                    value={form.region_id}
                    onChange={e => {
                      const selectedRegion = regions.find(r => r.id === e.target.value);
                      setForm(f => ({ ...f, region_id: e.target.value, neighborhood: selectedRegion ? selectedRegion.name : '' }));
                    }}
                    className="flex h-12 w-full rounded-xl border border-white/10 bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary appearance-none"
                  >
                    <option value="" disabled>Selecione sua Região</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Cidade *</Label>
                  <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-white/10" />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Complemento</Label>
                  <Input placeholder="Apto, Bloco, Casa 2..." value={form.complement} onChange={e => setForm(f => ({ ...f, complement: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-white/10" />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ponto de Referência</Label>
                  <Input placeholder="Próximo ao mercado..." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className="h-12 rounded-xl bg-background/50 border-white/10" />
                </div>
              </div>
              
              <div className="fixed bottom-0 left-0 right-0 p-4 pb-safe bg-background/95 backdrop-blur-xl border-t border-white/10 z-50">
                <div className="max-w-2xl mx-auto flex gap-3">
                  <Button variant="ghost" onClick={() => setShowForm(false)} className="rounded-xl h-14 flex-1 text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10">Cancelar</Button>
                  <Button onClick={handleSave} className="rounded-xl h-14 flex-1 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(250,204,21,0.2)]">
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
