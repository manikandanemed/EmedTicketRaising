import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilePlus2, FileUp, FileSpreadsheet } from 'lucide-react';
import { useMe } from './session';
import { ImportBatch, wsApi } from './workspaceApi';
import { EmptyState, ErrorState, Loading, formatDateTime, plural, timeAgo, useLoad } from './ui';
import MailsBoard from './MailsBoard';
import MailForm from './MailForm';
import ImportDialog from './ImportDialog';
import SheetsTab from './SheetsTab';
import { useNavigate } from 'react-router-dom';

type Tab = 'mails' | 'imports' | 'sheets';

const TABS: { key: Tab; label: string }[] = [
  { key: 'mails', label: 'Mails' },
  { key: 'imports', label: 'Imports' },
  { key: 'sheets', label: 'Shared sheets' },
];

export default function Campaigns() {
  const { isPM } = useMe();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'imports' ? 'imports' : params.get('tab') === 'sheets' ? 'sheets' : 'mails';
  const [refreshKey, setRefreshKey] = useState(0);
  const [creating, setCreating] = useState(params.get('new') === '1' && !isPM);
  const [importing, setImporting] = useState(params.get('import') === '1' && !isPM);

  // ?new=1 and ?import=1 (from the Home quick actions) only open the dialog once
  useEffect(() => {
    if (params.has('new') || params.has('import')) {
      const next = new URLSearchParams(params);
      next.delete('new'); next.delete('import');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTab = (t: Tab) => {
    const next = new URLSearchParams();
    if (t !== 'mails') next.set('tab', t);
    setParams(next);
  };

  return (
    <div>
      <div className="ws-title-row">
        <div>
          <h1>Campaign mails</h1>
          <p className="ws-muted">Write mails, get them approved, and send them. Import many at once from Excel.</p>
        </div>
        {!isPM && (
          <div className="ws-actions">
            <button className="btn btn-secondary" onClick={() => setImporting(true)}><FileUp size={16} /> Import from Excel</button>
            <button className="btn btn-primary" onClick={() => setCreating(true)}><FilePlus2 size={16} /> New mail</button>
          </div>
        )}
      </div>

      <div className="tabs-container" role="tablist">
        {TABS.map(t => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'mails' && <MailsBoard refreshKey={refreshKey} />}
      {tab === 'imports' && <ImportsTab refreshKey={refreshKey} canImport={!isPM} onImport={() => setImporting(true)} />}
      {tab === 'sheets' && <SheetsTab refreshKey={refreshKey} />}

      {creating && (
        <MailForm
          onClose={() => setCreating(false)}
          onSaved={saved => { setCreating(false); navigate(`/workspace/campaigns/${saved.id}`); }}
        />
      )}
      {importing && <ImportDialog onClose={() => setImporting(false)} onImported={() => setRefreshKey(k => k + 1)} />}
    </div>
  );
}

function ImportsTab({ refreshKey, canImport, onImport }: { refreshKey: number; canImport: boolean; onImport: () => void }) {
  const { data, error, loading, reload } = useLoad<ImportBatch[]>(() => wsApi.listImports(100), [refreshKey]);

  if (loading) return <Loading label="Loading imports..." />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<FileSpreadsheet size={26} />}
        title="No imports yet"
        text="Imported files show up here, with a link to the drafts each one created."
        action={canImport ? <button className="btn btn-primary" onClick={onImport}><FileUp size={14} /> Import from Excel</button> : undefined}
      />
    );
  }
  return (
    <div className="table-container">
      <table className="custom-table">
        <thead><tr><th>File</th><th>Imported by</th><th>When</th><th>Rows</th><th>Drafts created</th><th /></tr></thead>
        <tbody>
          {data.map(b => (
            <tr key={b.id}>
              <td><FileSpreadsheet size={14} /> {b.fileName}</td>
              <td>{b.importedByName}</td>
              <td title={formatDateTime(b.createdAt)}>{timeAgo(b.createdAt)}</td>
              <td>{b.totalRows}</td>
              <td>{plural(b.importedRows, 'draft')}{b.importedRows < b.totalRows && <span className="ws-muted"> of {b.totalRows}</span>}</td>
              <td><Link className="ws-link" to={`/workspace/campaigns?tab=mails&importId=${b.id}`}>View mails</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
