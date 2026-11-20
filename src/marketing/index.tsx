import { lazy } from 'react';

/** The /marketing/* screens, loaded on demand. The sidebar hook is in ./nav. */
export const MarketingApp = lazy(() => import('./MarketingApp'));
