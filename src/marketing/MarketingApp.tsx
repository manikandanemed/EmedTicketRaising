import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../App';
import { LookupsProvider } from './lookups';
import Dashboard from './Dashboard';
import Queue from './Queue';
import Bench from './Bench';
import './marketing.css';

/** Routes under /marketing. Only users acting as Marketing get in; everyone else goes back to their home page. */
export default function MarketingApp() {
  const { user } = useAuth();
  if (user?.userType !== 'Marketing') return <Navigate to="/" replace />;
  return (
    <div className="mk">
      <LookupsProvider>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="queue" element={<Queue />} />
          <Route path="bench" element={<Bench />} />
          <Route path="bench/:leadId" element={<Bench />} />
          <Route path="*" element={<Navigate to="/marketing/dashboard" replace />} />
        </Routes>
      </LookupsProvider>
    </div>
  );
}
