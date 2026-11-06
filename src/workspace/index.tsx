import React, { lazy } from 'react';
import { Home, Mail } from 'lucide-react';

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
