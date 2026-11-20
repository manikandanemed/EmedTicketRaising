import { useSyncExternalStore } from 'react';
import { mk } from './marketingApi';

/** Queue / bench counts shown in the sidebar. Refreshed after every action. */
interface Counts { queue: number; bench: number; loaded: boolean }
let state: Counts = { queue: 0, bench: 0, loaded: false };
const listeners = new Set<() => void>();
const set = (s: Counts) => { state = s; listeners.forEach(l => l()); };

export async function refreshCounts() {
  try {
    const d = await mk.dashboard();
    set({ queue: d.waitingInQueue, bench: d.onMyBench, loaded: true });
  } catch { /* keep the last numbers */ }
}

export function useCounts(): Counts {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => state);
}
