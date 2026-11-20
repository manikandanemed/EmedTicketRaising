import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './Home';
import Campaigns from './Campaigns';
import MailView from './MailView';
import ProspectEmails from './prospects/ProspectEmails';
import Approvals from './prospects/Approvals';
import ReviewTeams from './prospects/ReviewTeams';
import { Loading } from './ui';
import { useMe } from './session';
import './workspace.css';
import './prospects/prospects.css';

// the spreadsheet grid is large, so it is only downloaded when a sheet is opened
const SheetEditor = lazy(() => import('./SheetEditor'));

/** Routes under /workspace. Leave, permission, projects and documents have no screens on purpose. */
export default function WorkspaceApp() {
  const { isPM } = useMe();
  // Product Managers have no Home or Campaign mails: they only get the prospect email pages
  if (isPM) {
    return (
      <div className="ws-page">
        <Routes>
          <Route path="prospect-emails" element={<ProspectEmails />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="review-teams" element={<ReviewTeams />} />
          <Route path="*" element={<Navigate to="/workspace/prospect-emails" replace />} />
        </Routes>
      </div>
    );
  }
  return (
    <div className="ws-page">
      <Routes>
        <Route index element={<Home />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:id" element={<MailView />} />
        <Route path="sheets/:id" element={<Suspense fallback={<Loading label="Opening sheet..." />}><SheetEditor /></Suspense>} />
        <Route path="prospect-emails" element={<ProspectEmails />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="review-teams" element={<ReviewTeams />} />
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>
    </div>
  );
}
