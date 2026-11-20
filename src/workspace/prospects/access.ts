import { useEffect, useSyncExternalStore } from 'react';
import { WsError } from '../workspaceApi';
import { ProspectAccess, pApi } from './prospectApi';

/**
 * Who the signed-in user is for the prospect email workflow (GET /review-teams/me) and the nav badge count.
 * A tiny shared store so the sidebar, the pages and the dialogs all see the same values.
 */
interface AccessState {
  loaded: boolean;
  /** Set when the endpoints answer 404 (feature flag off on the server): the feature is hidden. */
  unavailable: boolean;
  me: ProspectAccess | null;
  badge: number;
}

let state: AccessState = { loaded: false, unavailable: false, me: null, badge: 0 };
const listeners = new Set<() => void>();

function set(patch: Partial<AccessState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export async function loadAccess() {
  try {
    set({ me: await pApi.me(), loaded: true, unavailable: false });
  } catch (e) {
    set({ me: null, loaded: true, unavailable: e instanceof WsError && e.status === 404 });
  }
}

/** Marketing: needs fixing + declined. Reviewer: waiting for my team. Called after every action and every 60 s. */
export async function refreshBadge() {
  if (!state.me || !(state.me.isMarketing || state.me.teams.length)) { if (state.badge) set({ badge: 0 }); return; }
  try { set({ badge: (await pApi.badgeCount()).count }); } catch { /* keep the old number */ }
}

export function useProspectAccess() {
  return useSyncExternalStore(subscribe, () => state);
}

const BADGE_POLL_MS = 60_000;

/** The sidebar entries. Hidden for anyone who is not Marketing, a review team member or a ProductManager. */
export function useProspectAccessLoader(userKey: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !userKey) return;
    set({ loaded: false, me: null, badge: 0 });
    let stopped = false;
    loadAccess().then(() => { if (!stopped) refreshBadge(); });
    const timer = setInterval(() => { if (!document.hidden) refreshBadge(); }, BADGE_POLL_MS);
    return () => { stopped = true; clearInterval(timer); };
  }, [userKey, enabled]);
}
