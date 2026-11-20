import { createContext, useContext } from 'react';
import type { Lookups } from './marketingApi';

export const LookupsCtx = createContext<Lookups | null>(null);

export function useLookups(): Lookups {
  const v = useContext(LookupsCtx);
  if (!v) throw new Error('useLookups must be used inside LookupsProvider');
  return v;
}
