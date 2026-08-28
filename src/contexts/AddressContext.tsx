import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
export interface Address {
  id: string;
  user_id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  created_at: string;
}

interface AddressContextType {
  addresses: Address[];
  selectedAddress: Address | null;
  setSelectedAddressId: (id: string) => void;
  refreshAddresses: () => Promise<void>;
  loading: boolean;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

export function AddressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAddresses = async () => {
    if (!user) { setAddresses([]); setLoading(false); return; }
    try {
      // 1. Tenta por user_id
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id);
      
      let list = (data as Address[]) || [];

      // 2. Fallback: tenta por customer_id
      if (error || list.length === 0) {
        const { data: custData, error: custErr } = await supabase
          .from('addresses')
          .select('*')
          .eq('customer_id', user.id);
        if (!custErr && custData) {
          list = custData as Address[];
        }
      }

      // 3. Fallback: select geral
      if (list.length === 0) {
        const { data: allData } = await supabase.from('addresses').select('*');
        if (allData) {
          list = (allData as any[]).filter(
            (a) => a.user_id === user.id || a.customer_id === user.id
          ) as Address[];
        }
      }

      list.sort((a: any, b: any) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      setAddresses(list);
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id);
      }
    } catch (e) {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAddresses(); }, [user]);

  const selectedAddress = addresses.find(a => a.id === selectedId) || null;

  return (
    <AddressContext.Provider value={{
      addresses,
      selectedAddress,
      setSelectedAddressId: setSelectedId,
      refreshAddresses: fetchAddresses,
      loading,
    }}>
      {children}
    </AddressContext.Provider>
  );
}

export const useAddress = () => {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddress must be used within AddressProvider');
  return ctx;
};
