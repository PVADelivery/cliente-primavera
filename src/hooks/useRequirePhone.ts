import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useRequirePhone() {
  const { user, profile, refreshProfile } = useAuth();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState(() => {
    const numeric = profile?.phone?.replace(/\D/g, '') || '';
    return numeric.length >= 10 ? (profile?.phone ?? '') : '';
  });
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (profile?.phone) {
      const numeric = profile.phone.replace(/\D/g, '');
      if (numeric.length >= 10) {
        setPhoneInput(profile.phone ?? '');
      } else {
        setPhoneInput('');
      }
    } else {
      setPhoneInput('');
    }
  }, [profile?.phone]);

  const checkPhoneAndProceed = (action: () => void) => {
    const numericPhone = profile?.phone?.replace(/\D/g, '') || '';
    if (!profile?.phone || numericPhone.length < 10) {
      const numeric = profile?.phone?.replace(/\D/g, '') || '';
      setPhoneInput(numeric.length >= 10 ? (profile?.phone ?? '') : '');
      setPendingAction(() => action);
      setShowPhoneModal(true);
      return false;
    }
    action();
    return true;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const numericPhone = (phoneInput ?? '').replace(/\D/g, '');
    if (numericPhone.length < 10) {
      toast.error('Por favor, informe um número de telefone válido com DDD.');
      return;
    }

    setIsSubmittingPhone(true);
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          phone: phoneInput,
          full_name: profile?.full_name || user.user_metadata?.full_name || 'Cliente',
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${user.id},user_id.eq.${user.id}`);

      if (updateErr) {
        await supabase
          .from('profiles')
          .insert({
            id: user.id,
            user_id: user.id,
            phone: phoneInput,
            full_name: profile?.full_name || user.user_metadata?.full_name || 'Cliente',
            role: 'customer',
            status: 'pending' as any,
          });
      }

      try {
        void supabase.auth.updateUser({
          data: { phone: phoneInput }
        });
        void supabase.from('customers').upsert({
          user_id: user.id,
          phone: phoneInput,
          name: profile?.full_name || user.user_metadata?.full_name || 'Cliente',
        }, { onConflict: 'user_id' });
        void supabase.from('customer_credits').update({
          customer_phone: phoneInput,
          updated_at: new Date().toISOString(),
        } as any).eq('customer_id', user.id);
      } catch (syncErr) {}
      
      await refreshProfile();
      toast.success('Telefone salvo com sucesso!');
      setShowPhoneModal(false);
      
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar o telefone. Tente novamente.');
    } finally {
      setIsSubmittingPhone(false);
    }
  };

  return {
    checkPhoneAndProceed,
    showPhoneModal,
    setShowPhoneModal,
    phoneInput,
    setPhoneInput,
    handlePhoneSubmit,
    isSubmittingPhone
  };
}
