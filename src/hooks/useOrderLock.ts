import { useState, useCallback, useRef } from 'react';
import { CartItem } from '@/types/database';

export function useOrderLock() {
  const [isLocked, setIsLocked] = useState(false);
  const lockRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const cartFingerprintRef = useRef('');

  const generateIdempotencyKey = useCallback((userId: string, items: CartItem[], extra?: string) => {
    const cartFingerprint = `${userId}|${extra ?? ''}|${items
      .map(i => `${i.product.id}:${i.quantity}`)
      .sort()
      .join('|')}`;

    if (!idempotencyKeyRef.current || cartFingerprintRef.current !== cartFingerprint) {
      cartFingerprintRef.current = cartFingerprint;
      idempotencyKeyRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    return idempotencyKeyRef.current;
  }, []);

  const resetIdempotencyKey = useCallback(() => {
    idempotencyKeyRef.current = null;
    cartFingerprintRef.current = '';
  }, []);

  const acquireLock = useCallback(() => {
    if (lockRef.current) return false;
    lockRef.current = true;
    setIsLocked(true);
    return true;
  }, []);

  const releaseLock = useCallback(() => {
    lockRef.current = false;
    setIsLocked(false);
  }, []);

  return {
    isLocked,
    acquireLock,
    releaseLock,
    generateIdempotencyKey,
    resetIdempotencyKey
  };
}
