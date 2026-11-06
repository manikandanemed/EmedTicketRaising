import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './Home';
import Campaigns from './Campaigns';
import MailView from './MailView';
import { Loading } from './ui';
import './workspace.css';

// the spreadsheet grid is large, so it is only downloaded when a sheet is opened
const SheetEditor = lazy(() => import('./SheetEditor'));

/** Routes under /workspace. Leave, permission, projects and documents have no screens on purpose. */
export default function WorkspaceApp() {
  return (
    <div className="ws-page">
      <Routes>
        <Route index element={<Home />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/:id" element={<MailView />} />
        <Route path="sheets/:id" element={<Suspense fallback={<Loading label="Opening sheet..." />}><SheetEditor /></Suspense>} />
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>
    </div>
  );
}
