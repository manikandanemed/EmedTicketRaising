import React from 'react';
import { Lookups, mk } from './marketingApi';
import { LookupsCtx } from './lookupsContext';
import { useLoad } from './helpers';
import { ErrorBox, Loading } from './ui';

/** Loads the fixed lists (stages, channels, campaigns, ...) once from GET /lookups. Nothing is hard-coded. */
export const LookupsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, error, loading, reload } = useLoad<Lookups>(() => mk.lookups(), []);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox error={error} onRetry={reload} />;
  return <LookupsCtx.Provider value={data}>{children}</LookupsCtx.Provider>;
};
