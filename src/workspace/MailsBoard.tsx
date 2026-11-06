import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Check, Loader2, Search, Send, ShieldCheck, X } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { useMe } from './session';
import { BulkResult, Campaign, wsApi, describeError } from './workspaceApi';
import { ConfirmDialog, EmptyState, ErrorState, Loading, Tag, plural, timeAgo, useLoad } from './ui';
import { toast } from '../services/toast';

type StepKey = 'draft' | 'pending' | 'approved' | 'sent';

const STEPS: { key: StepKey; label: string; statuses: string[] }[] = [
  { key: 'draft', label: 'Draft', statuses: ['draft'] },
  { key: 'pending', label: 'Waiting for approval', statuses: ['pending'] },
  { key: 'approved', label: 'Approved', statuses: ['approved', 'sending'] },
  { key: 'sent', label: 'Sent', statuses: ['sent'] },
];

const BADGES: Record<string, { text: string; tone: 'warning' | 'info' | 'ok' }> = {
  changes_asked: { text: 'Changes asked', tone: 'warning' },
  needs_your_approval: { text: 'Needs your approval', tone: 'info' },
  ready_to_send: { text: 'Ready to send', tone: 'ok' },
};

export const MailTags: React.FC<{ c: Pick<Campaign, 'segment' | 'priority' | 'sendWave'> }> = ({ c }) => (
  <>
    {c.segment && <Tag title="Segment">{c.segment}</Tag>}
    {c.priority && <Tag title="Priority">Priority {c.priority}</Tag>}
    {c.sendWave && <Tag title="Send wave">{c.sendWave}</Tag>}
  </>
);

export default function MailsBoard({ refreshKey }: { refreshKey: number }) {
  const { isPM } = useMe();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const importId = params.get('importId') ? Number(params.get('importId')) : null;
  const [onlyMine, setOnlyMine] = useState(params.get('mine') === '1');
  const [search, setSearch] = useState('');
  const [step, setStep] = useState<StepKey | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: 'submit' | 'approve'; data: BulkResult; titles: Map<number, string> } | null>(null);
  const debounced = useDebounce(search, 300);

  const list = useLoad(() => wsApi.listCampaigns({ search: debounced, onlyMine, importId }), [debounced, onlyMine, importId, refreshKey]);
  const imports = useLoad(() => wsApi.listImports(100), []);

  const items = useMemo(() => list.data?.items ?? [], [list.data]);
  const columns = useMemo(() => STEPS.map(s => ({ ...s, items: items.filter(c => s.statuses.includes(c.status)) })), [items]);
  const selectable = (c: Campaign) => (isPM ? c.canApprove : c.canSubmit);
  const selectableItems = items.filter(selectable);
  // drop selections that vanished after a reload
  useEffect(() => {
    setSelected(prev => new Set([...prev].filter(id => items.some(c => c.id === id && selectable(c)))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data]);

  const toggle = (id: number) => setSelected(prev => { const n = new Set(prev); if (!n.delete(id)) n.add(id); return n; });
  const chosen = items.filter(c => selected.has(c.id));

  const run = async () => {
    setBusy(true);
    const kind = isPM ? 'approve' : 'submit';
    try {
      const ids = chosen.map(c => c.id);
      const data = kind === 'approve' ? await wsApi.bulkApprove(ids) : await wsApi.bulkSubmit(ids);
      setResult({ kind, data, titles: new Map(chosen.map(c => [c.id, c.title])) });
      if (data.failed === 0) toast.success(`${data.succeeded} ${kind === 'approve' ? 'approved' : 'submitted'}`);
      else toast.info(`${data.succeeded} done, ${data.failed} failed. See the details below.`);
      setSelected(new Set());
      setConfirming(false);
      list.reload();
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const setImportFilter = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('importId', value); else next.delete('importId');
    setParams(next, { replace: true });
  };

  return (
    <div>
      <div className="ws-steps" role="group" aria-label="Filter by step">
        {columns.map((col, i) => (
          <button
            key={col.key}
            className={`ws-step ${step === col.key ? 'active' : ''}`}
            onClick={() => setStep(s => (s === col.key ? null : col.key))}
            aria-pressed={step === col.key}
          >
            <span className="ws-step-num">{i + 1}</span>
            <span className="ws-step-label">{col.label}</span>
            <span className="ws-step-count">{col.items.length}</span>
          </button>
        ))}
      </div>

      <div className="ws-filters">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input className="form-input" style={{ paddingLeft: 40 }} placeholder="Search title, client, subject or creator" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search mails" />
        </div>
        <label className="ws-check"><input type="checkbox" checked={onlyMine} onChange={e => setOnlyMine(e.target.checked)} /> Only my mails</label>
        <select className="form-select ws-select" value={importId ?? ''} onChange={e => setImportFilter(e.target.value)} aria-label="Filter by import">
          <option value="">All imports</option>
          {(imports.data ?? []).map(i => <option key={i.id} value={i.id}>{i.fileName} ({plural(i.importedRows, 'draft')})</option>)}
        </select>
      </div>

      {result && <BulkResultPanel result={result} onClose={() => setResult(null)} />}

      {selected.size > 0 && (
        <div className="ws-bulkbar" role="toolbar">
          <span><b>{selected.size}</b> selected</span>
          <button className="btn btn-primary" disabled={busy} onClick={() => (isPM ? setConfirming(true) : run())}>
            {busy ? <Loader2 size={14} className="spinner" /> : isPM ? <ShieldCheck size={14} /> : <Send size={14} />}
            {isPM ? 'Approve selected' : 'Submit selected for approval'}
          </button>
          <button className="btn btn-ghost" onClick={() => setSelected(new Set())}><X size={14} /> Clear</button>
        </div>
      )}

      {list.loading ? <Loading label="Loading mails..." />
        : list.error ? <ErrorState error={list.error} onRetry={list.reload} />
        : items.length === 0 ? (
          <EmptyState
            title={debounced || onlyMine || importId ? 'No mails match these filters' : 'No campaign mails yet'}
            text={debounced || onlyMine || importId ? 'Clear the search or filters to see more.' : isPM ? 'Mails created by employees will show up here.' : 'Create a mail or import a few from Excel.'}
          />
        ) : (
          <div className="ws-board">
            {columns.filter(c => !step || c.key === step).map(col => {
              const canPick = selectableItems.some(c => col.items.includes(c));
              const allPicked = canPick && col.items.filter(selectable).every(c => selected.has(c.id));
              return (
                <section key={col.key} className="ws-column" aria-label={col.label}>
                  <header>
                    <h4>{col.label} <span className="ws-chip-count">{col.items.length}</span></h4>
                    {canPick && (
                      <label className="ws-check ws-small">
                        <input
                          type="checkbox"
                          checked={allPicked}
                          onChange={() => setSelected(prev => {
                            const n = new Set(prev);
                            col.items.filter(selectable).forEach(c => (allPicked ? n.delete(c.id) : n.add(c.id)));
                            return n;
                          })}
                        /> All
                      </label>
                    )}
                  </header>
                  {col.items.length === 0 && <div className="ws-column-empty">Nothing here</div>}
                  {col.items.map(c => (
                    <MailCard key={c.id} c={c} selectable={selectable(c)} checked={selected.has(c.id)} onToggle={() => toggle(c.id)} onOpen={() => navigate(`/workspace/campaigns/${c.id}`)} />
                  ))}
                </section>
              );
            })}
          </div>
        )}

      {confirming && (
        <ConfirmDialog title={`Approve ${plural(chosen.length, 'mail')}?`} confirmLabel="Approve all" busy={busy} onConfirm={run} onClose={() => setConfirming(false)}>
          <p className="ws-muted">The creators are told when their mail is approved. These mails will be approved:</p>
          <ul className="ws-confirm-list">
            {chosen.map(c => (
              <li key={c.id}><b>{c.title}</b><span className="ws-muted"> · {c.clientName || 'no client'} · from {c.createdByName}</span></li>
            ))}
          </ul>
        </ConfirmDialog>
      )}
    </div>
  );
}

const MailCard: React.FC<{ c: Campaign; selectable: boolean; checked: boolean; onToggle: () => void; onOpen: () => void }> = ({ c, selectable, checked, onToggle, onOpen }) => {
  const badge = c.badge ? BADGES[c.badge] : null;
  const blocked = c.status === 'draft' && c.submitBlockers.length > 0;
  return (
    <article className={`ws-card ${checked ? 'selected' : ''}`}>
      {selectable && (
        <input className="ws-card-check" type="checkbox" checked={checked} onChange={onToggle} aria-label={`Select ${c.title}`} onClick={e => e.stopPropagation()} />
      )}
      <button className="ws-card-main" onClick={onOpen}>
        <strong className="ws-card-title">{c.title}</strong>
        <span className="ws-muted ws-card-line">{c.clientName || 'No client'}{c.contactName ? ` · ${c.contactName}` : ''}</span>
        <span className="ws-card-line ws-card-subject">{c.subject || <i className="ws-muted">No subject yet</i>}</span>
        <span className="ws-card-tags">
          {badge && <Tag tone={badge.tone}>{badge.text}</Tag>}
          {c.status === 'sending' && <Tag tone="info">Sending</Tag>}
          {blocked && <Tag tone="error" title={c.submitBlockers.join(' ')}><AlertTriangle size={11} /> Fix before submitting</Tag>}
          <MailTags c={c} />
        </span>
        <span className="ws-muted ws-small">{c.createdByName} · {timeAgo(c.updatedAt)}</span>
      </button>
    </article>
  );
};

const BulkResultPanel: React.FC<{ result: { kind: 'submit' | 'approve'; data: BulkResult; titles: Map<number, string> }; onClose: () => void }> = ({ result, onClose }) => {
  const { data, kind, titles } = result;
  const failed = data.items.filter(i => !i.success);
  const [open, setOpen] = useState(true);
  // "18 submitted, 2 failed: missing email" - the distinct reasons, shortened
  const reasons = [...new Set(failed.map(f => f.message.replace(/\.$/, '')))].slice(0, 3).join('; ');
  return (
    <div className={`ws-result ${failed.length ? 'has-errors' : 'all-ok'}`} role="status">
      <div className="ws-result-head">
        {failed.length ? <AlertTriangle size={16} /> : <Check size={16} />}
        <span>
          <b>{data.succeeded}</b> {kind === 'approve' ? 'approved' : 'submitted'}
          {failed.length > 0 && <>, <b>{failed.length}</b> failed: {reasons}</>}
        </span>
        {failed.length > 0 && <button className="ws-link" onClick={() => setOpen(o => !o)}>{open ? 'Hide details' : 'Show details'}</button>}
        <button className="modal-close" onClick={onClose} aria-label="Dismiss"><X size={14} /></button>
      </div>
      {failed.length > 0 && open && (
        <ul className="ws-result-list">
          {failed.map(f => <li key={f.id}><b>{titles.get(f.id) ?? `Mail ${f.id}`}</b>: {f.message}</li>)}
        </ul>
      )}
    </div>
  );
};
