import React, { lazy } from 'react';
import { ClipboardCheck, Home, Mail, MailCheck, UsersRound } from 'lucide-react';
import { useProspectAccess, useProspectAccessLoader } from './prospects/access';

/**
 * Entry point of the workspace feature. This file stays tiny and imports no workspace screens or styles: with the flag
 * off nothing else is loaded, and App.tsx only ever touches the four exports below.
 */
export const workspaceEnabled: boolean = import.meta.env.VITE_FEATURE_WORKSPACE === 'true';

export const workspaceNavItems = [
  { to: '/workspace', icon: <Home size={18} />, label: 'Home', match: (p: string) => p === '/workspace' || p === '/workspace/' },
  {
    to: '/workspace/campaigns',
    icon: <Mail size={18} />,
    label: 'Campaign mails',
    match: (p: string) => p.startsWith('/workspace/campaigns') || p.startsWith('/workspace/sheets'),
  },
];

/** People button, People panel and the notification bell (rendered inside the top navbar). */
export const WorkspaceNavbarItems = lazy(() => import('./NavbarItems'));

/** Every /workspace/* screen. */
export const WorkspaceApp = lazy(() => import('./WorkspaceApp'));

/**
 * Sidebar entries of the prospect email approval workflow. Shown only to Marketing, review team members and
 * ProductManagers (ProductManager: read only, plus Review teams); the Approvals entry carries the badge count.
 */
export function useProspectNav(user: { token: string; userType: string } | null) {
  useProspectAccessLoader(user?.token, workspaceEnabled);
  const { me, unavailable, badge } = useProspectAccess();
  if (!workspaceEnabled || !user || unavailable || !me) return [];
  const isPM = user.userType === 'ProductManager';
  const reviews = me.isMarketing || me.teams.length > 0;
  const items = [];
  if (reviews || isPM) {
    items.push({ to: '/workspace/prospect-emails', icon: <MailCheck size={18} />, label: <>Prospect emails</>, match: (p: string) => p.startsWith('/workspace/prospect-emails') });
  }
  if (reviews) {
    items.push({
      to: '/workspace/approvals',
      icon: <ClipboardCheck size={18} />,
      label: <>Approvals{badge > 0 && <span className="ws-nav-count" style={{ marginLeft: 8 }} aria-label={`${badge} need attention`}>{badge}</span>}</>,
      match: (p: string) => p.startsWith('/workspace/approvals'),
    });
  }
  if (isPM) {
    items.push({ to: '/workspace/review-teams', icon: <UsersRound size={18} />, label: <>Review teams</>, match: (p: string) => p.startsWith('/workspace/review-teams') });
  }
  return items;
}
