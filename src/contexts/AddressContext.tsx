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
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const list = (data as Address[]) || [];
    setAddresses(list);
    if (!selectedId && list.length > 0) {
      setSelectedId(list[0].id);
    }
    setLoading(false);
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
