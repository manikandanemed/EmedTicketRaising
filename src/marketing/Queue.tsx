import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { toast } from '../services/toast';
import { useDebounce } from '../hooks/useDebounce';
import { ApiError, LeadDetail, LeadImport, LeadImportResult, LeadSummary, mk } from './marketingApi';
import { useLookups } from './lookupsContext';
import { refreshCounts } from './counts';
import { ago, showError, useLoad } from './helpers';
import { ConfirmDlg, Dlg, ErrorBox, HistoryItem, ImportedData, Loading, ScoreBar, Spinner, StagePill } from './ui';
import { ImportHistory } from './ImportHistory';

type SortKey = 'name' | 'score' | 'emails' | 'created' | 'lastContact';
const SORTABLE: { key?: SortKey; label: string }[] = [
  { key: 'name', label: 'Lead' }, { label: 'Campaign' }, { label: 'Channel' }, { key: 'score', label: 'Score' },
  { label: 'Status' }, { key: 'emails', label: 'Emails' }, { key: 'created', label: 'Waiting' },
];

export default function Queue() {
  const lookups = useLookups();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [campaign, setCampaign] = useState('');
  const [temperature, setTemperature] = useState('');
  const [stage, setStage] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'score', dir: 'desc' });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<LeadImportResult | null>(null);
  const [removeTarget, setRemoveTarget] = useState<LeadSummary | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [undoTarget, setUndoTarget] = useState<{ id: string; fileName: string; undoable: number; remaining: number } | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const debounced = useDebounce(search.trim(), 300);

  const { data, error, loading, reload, setData } = useLoad<LeadSummary[]>(
    () => mk.queue({ search: debounced, channel, campaign, temperature, stage, sort: sort.key, dir: sort.dir }),
    [debounced, channel, campaign, temperature, stage, sort.key, sort.dir],
  );

  const history = useLoad<LeadImport[]>(() => mk.imports(), []);

  const remove = async (lead: LeadSummary) => {
    setRemovingId(lead.id);
    try {
      const msg = await mk.removeLead(lead.id);
      setData(d => (d ? d.filter(x => x.id !== lead.id) : d));
      toast.success(msg || 'Removed from the queue.');
      refreshCounts(); history.reload();
    } catch (e) {
      showError(e);
      if (e instanceof ApiError && e.status === 404) setData(d => (d ? d.filter(x => x.id !== lead.id) : d));
      else if (e instanceof ApiError && e.status === 409) reload();
      refreshCounts(); history.reload();
    } finally { setRemovingId(null); setRemoveTarget(null); }
  };

  const undo = async () => {
    const t = undoTarget;
    if (!t) return;
    setUndoingId(t.id);
    try {
      const r = await mk.undoImport(t.id);
      toast.success(r.message || `Removed ${r.removed} lead${r.removed === 1 ? '' : 's'}.`);
    } catch (e) { showError(e); }
    finally { setUndoingId(null); setUndoTarget(null); reload(); history.reload(); refreshCounts(); }
  };

  const toggleSort = (key: SortKey) =>
    setSort(s => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'score' || key === 'emails' ? 'desc' : 'asc' }));

  const pickUp = async (lead: { id: string; name: string }) => {
    if (busy) return;
    setBusy(true);
    try {
      await mk.pickUp(lead.id);
      toast.success(`${lead.name} is now on your work bench`);
      refreshCounts();
      navigate(`/marketing/bench/${lead.id}`);
    } catch (e) {
      showError(e);
      if (e instanceof ApiError && e.status === 409) { reload(); refreshCounts(); history.reload(); }
    } finally {
      setBusy(false);
    }
  };

  const startOnHottest = async () => {
    try {
      const top = (await mk.queue({ search: debounced, channel, campaign, temperature, stage, sort: 'score', dir: 'desc' }))[0];
      if (!top) { toast.info('No leads match the current filters'); return; }
      await pickUp(top);
    } catch (e) { showError(e); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // so choosing the same file again still fires
    if (!file) return;
    if (!/\.xlsx?$/i.test(file.name)) { toast.error('Please choose an Excel file (.xlsx or .xls).'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('The file is too large (max 5 MB).'); return; }
    setUploading(true);
    try {
      const r = await mk.importLeads(file);
      setImportResult(r);
      if (r.imported > 0) toast.success(`${r.imported} lead${r.imported === 1 ? '' : 's'} imported into the work queue`);
      else toast.info('No new leads were imported');
      reload();
      history.reload();
      refreshCounts();
    } catch (err) { showError(err); } finally { setUploading(false); }
  };

  return (
    <>
      <h1>Work queue</h1>
      <p className="mk-sub">Leads nobody is tracking yet. Hottest leads are at the top.</p>
      <div className="mk-qhint"><b>How it works:</b> click any lead to preview it. It stays in the queue until you select <b>Start working</b>, which moves it to your work bench.</div>

      <div className="mk-toolbar">
        <input type="search" placeholder="Search name, company or email" aria-label="Search the queue" value={search} onChange={e => setSearch(e.target.value)} />
        <select aria-label="Filter by channel" value={channel} onChange={e => setChannel(e.target.value)}>
          <option value="">All channels</option>{lookups.channels.map(c => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Filter by campaign" value={campaign} onChange={e => setCampaign(e.target.value)}>
          <option value="">All campaigns</option>{lookups.campaigns.map(c => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Filter by temperature" value={temperature} onChange={e => setTemperature(e.target.value)}>
          <option value="">All temperatures</option><option>Hot</option><option>Warm</option><option>Cold</option>
        </select>
        <select aria-label="Filter by status" value={stage} onChange={e => setStage(e.target.value)}>
          <option value="">All statuses</option>{lookups.stages.filter(s => s !== 'Closed').map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="spacer" />
        <input ref={fileInput} type="file" hidden accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={onFile} aria-label="Excel file to upload" />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap' }}>
          <button className="mk-btn" onClick={() => fileInput.current?.click()} disabled={uploading} title="Import leads from an Excel file (.xlsx or .xls)">
            <Upload aria-hidden /> {uploading ? 'Uploading...' : 'Upload Excel'}
          </button>
          <button className="mk-btn primary" onClick={startOnHottest} disabled={busy}>Start on hottest lead</button>
        </div>
      </div>

      {error && !data ? <ErrorBox error={error} onRetry={reload} /> : (
        <div className="mk-tablewrap" aria-busy={loading}>
          <table>
            <thead>
              <tr>
                {SORTABLE.map(c => (
                  <th key={c.label} aria-sort={c.key && sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                    {c.key ? <button onClick={() => toggleSort(c.key!)}>{c.label}{sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</button> : c.label}
                  </th>
                ))}
                <th><span className="mk-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                <tr><td colSpan={8}><Loading label="Loading the queue..." /></td></tr>
              ) : (data ?? []).length === 0 ? (
                <tr><td colSpan={8}><div className="mk-empty"><strong>The queue is clear</strong>Nothing matches these filters. Try clearing them.</div></td></tr>
              ) : (data ?? []).map(l => {
                const old = Date.now() - new Date(l.createdAt).getTime() > 2 * 864e5;
                return (
                  <tr
                    key={l.id}
                    className="mk-qrow"
                    tabIndex={0}
                    title="Preview this lead"
                    onClick={() => setPreviewId(l.id)}
                    onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPreviewId(l.id); } }}
                  >
                    <td><div className="who">{l.name}</div><div className="co">{[l.title, l.company].filter(Boolean).join(', ') || l.email}</div></td>
                    <td>{l.campaign}</td>
                    <td>{l.channel}</td>
                    <td><ScoreBar score={l.score} temperature={l.temperature} /></td>
                    <td><StagePill stage={l.stage} /></td>
                    <td>{l.emailsSent}</td>
                    <td className={old ? 'age-old' : ''}>{ago(l.createdAt)}</td>
                    <td>
                      <div className="mk-rowactions">
                        <button className="mk-btn sm primary" disabled={busy || removingId === l.id} onClick={e => { e.stopPropagation(); pickUp(l); }}>Start working</button>
                        <button className="mk-btn sm danger" disabled={busy || removingId === l.id} onClick={e => { e.stopPropagation(); setRemoveTarget(l); }}>
                          {removingId === l.id && <Spinner />}Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ImportHistory
        items={history.data} loading={history.loading} error={history.error} undoingId={undoingId}
        onRetry={history.reload}
        onUndo={i => setUndoTarget({ id: i.id, fileName: i.fileName, undoable: i.undoable, remaining: i.remaining })}
      />

      {removeTarget && (
        <ConfirmDlg
          label="Remove lead" danger confirmLabel="Remove" busy={removingId === removeTarget.id}
          message={`Remove ${removeTarget.name} from the queue? This permanently deletes the lead.`}
          onConfirm={() => remove(removeTarget)} onCancel={() => setRemoveTarget(null)}
        />
      )}
      {undoTarget && (
        <ConfirmDlg
          label="Undo upload" danger confirmLabel="Undo upload" busy={undoingId === undoTarget.id}
          message={`Undo upload ${undoTarget.fileName}? ${undoTarget.undoable} lead${undoTarget.undoable === 1 ? '' : 's'} that nobody has started working on will be permanently deleted.${
            undoTarget.remaining - undoTarget.undoable > 0 ? ` ${undoTarget.remaining - undoTarget.undoable} lead${undoTarget.remaining - undoTarget.undoable === 1 ? '' : 's'} already being worked on will be kept.` : ''}`}
          onConfirm={undo} onCancel={() => setUndoTarget(null)}
        />
      )}
      {importResult && (
        <ImportSummary
          r={importResult} onClose={() => setImportResult(null)}
          onUndo={() => {
            if (!importResult.importId) return;
            setUndoTarget({ id: importResult.importId, fileName: importResult.fileName, undoable: importResult.imported, remaining: importResult.imported });
            setImportResult(null);
          }}
        />
      )}
      {previewId && <Preview id={previewId} busy={busy} onClose={() => setPreviewId(null)} onStart={l => { setPreviewId(null); pickUp(l); }} />}
    </>
  );
}

const ImportSummary: React.FC<{ r: LeadImportResult; onClose: () => void; onUndo: () => void }> = ({ r, onClose, onUndo }) => (
  <Dlg label="Excel upload result" onClose={onClose}>
    <div className="mk-dlg-body">
      <h2 style={{ fontSize: 20, margin: 0 }}>{r.imported > 0 ? 'Upload complete' : 'Nothing new to import'}</h2>
      <p className="mk-qhint" style={{ margin: 0 }}>From <b>{r.fileName}</b>: {r.totalRows} row{r.totalRows === 1 ? '' : 's'} read{r.emptyRows > 0 ? `, ${r.emptyRows} empty row${r.emptyRows === 1 ? '' : 's'} ignored` : ''}.</p>
      <dl className="mk-facts" style={{ margin: 0 }}>
        <div><dt>Imported</dt><dd>{r.imported}</dd></div>
        <div><dt>Skipped</dt><dd>{r.skipped}{r.duplicates > 0 ? ` (${r.duplicates} duplicate${r.duplicates === 1 ? '' : 's'})` : ''}</dd></div>
      </dl>
      {r.issues.length > 0 && (
        <>
          <h3 style={{ margin: 0, fontSize: 14 }}>Skipped rows</h3>
          <ul style={{ margin: 0, paddingLeft: 18, maxHeight: 180, overflow: 'auto', fontSize: 13 }}>
            {r.issues.map(i => <li key={i}>{i}</li>)}
          </ul>
          {r.skipped > r.issues.length && <p style={{ margin: 0, fontSize: 13, color: 'var(--mk-muted)' }}>and {r.skipped - r.issues.length} more.</p>}
        </>
      )}
    </div>
    <div className="mk-dlg-foot">
      {r.imported > 0 && r.importId && <button className="mk-btn danger" onClick={onUndo}>Undo</button>}
      <button className="mk-btn primary" autoFocus onClick={onClose}>Done</button>
    </div>
  </Dlg>
);

const Preview: React.FC<{ id: string; busy: boolean; onClose: () => void; onStart: (l: { id: string; name: string }) => void }> = ({ id, busy, onClose, onStart }) => {
  const { data: l, error, loading, reload } = useLoad<LeadDetail>(() => mk.lead(id), [id]);
  useEffect(() => { if (error) showError(error); }, [error]);
  return (
    <Dlg label="Lead preview" onClose={onClose}>
      {loading && !l ? <div className="mk-dlg-body"><Loading /></div> : error || !l ? <div className="mk-dlg-body"><ErrorBox error={error} onRetry={reload} /></div> : (
        <div className="mk-dlg-body">
          <div className="mk-detail-head" style={{ margin: 0 }}>
            <div><h2 style={{ fontSize: 22, margin: 0 }}>{l.name}</h2><div style={{ color: 'var(--mk-muted)' }}>{[l.title, l.company].filter(Boolean).join(', ') || 'No company'}</div></div>
            <StagePill stage={l.stage} />
          </div>
          <p className="mk-qhint" style={{ margin: 0 }}>This is a preview. The lead stays in the queue until you select <b>Start working</b>.</p>
          <dl className="mk-facts" style={{ margin: 0 }}>
            <div><dt>Email</dt><dd>{l.email}</dd></div>
            {l.possibleEmail && <div><dt>Possible email</dt><dd>{l.possibleEmail}</dd></div>}
            {l.orgEmail && <div><dt>Organization email</dt><dd>{l.orgEmail}</dd></div>}
            {l.orgPhone && <div><dt>Organization phone</dt><dd>{l.orgPhone}</dd></div>}
            {l.linkedInUrl && <div><dt>LinkedIn</dt><dd>{/^https?:\/\//i.test(l.linkedInUrl) ? <a href={l.linkedInUrl} target="_blank" rel="noopener noreferrer">{l.linkedInUrl}</a> : l.linkedInUrl}</dd></div>}
            <div><dt>Campaign</dt><dd>{l.campaign}</dd></div>
            <div><dt>Channel</dt><dd>{l.channel}</dd></div>
            <div><dt>Lead score</dt><dd><ScoreBar score={l.score} temperature={l.temperature} /></dd></div>
            <div><dt>Emails sent</dt><dd>{l.emailsSent}</dd></div>
            <div><dt>Waiting for</dt><dd>{ago(l.createdAt)}</dd></div>
          </dl>
          <ImportedData fields={l.importedFields} skipValues={[l.email, l.possibleEmail, l.orgEmail, l.phone, l.orgPhone, l.linkedInUrl]} />
          <h2 style={{ margin: 0, fontSize: 15 }}>History</h2>
          <ol className="mk-timeline">{l.history.map(n => <HistoryItem key={n.id} n={n} />)}</ol>
        </div>
      )}
      <div className="mk-dlg-foot">
        <button className="mk-btn" onClick={onClose}>Close</button>
        <button className="mk-btn primary" autoFocus disabled={!l || busy} onClick={() => l && onStart(l)}>Start working</button>
      </div>
    </Dlg>
  );
};
