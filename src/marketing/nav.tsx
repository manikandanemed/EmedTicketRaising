import React, { useEffect } from 'react';
import { useCounts, refreshCounts } from './counts';

const icon = (d: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

/** Sidebar entries (Dashboard, Work queue, Work bench) for the Marketing role only, with the queue/bench counts. */
export function useMarketingNav(user: { userType: string } | null) {
  const isMarketing = user?.userType === 'Marketing';
  const counts = useCounts();
  useEffect(() => {
    if (!isMarketing) return;
    refreshCounts();
    const timer = setInterval(() => { if (!document.hidden) refreshCounts(); }, 60_000);
    return () => clearInterval(timer);
  }, [isMarketing]);
  if (!isMarketing) return [];
  const badge = (n: number, what: string) => <span className="mk-nav-count" aria-label={`${n} ${what}`}>{n}</span>;
  return [
    {
      to: '/marketing/dashboard',
      icon: icon(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>),
      label: <>Lead dashboard</>,
      match: (p: string) => p.startsWith('/marketing/dashboard'),
    },
    {
      to: '/marketing/queue',
      icon: icon(<path d="M4 6h16M4 12h16M4 18h10" />),
      label: <>Work queue {counts.loaded && badge(counts.queue, 'in the queue')}</>,
      match: (p: string) => p.startsWith('/marketing/queue'),
    },
    {
      to: '/marketing/bench',
      icon: icon(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>),
      label: <>Work bench {counts.loaded && badge(counts.bench, 'on your bench')}</>,
      match: (p: string) => p.startsWith('/marketing/bench'),
    },
  ];
}
