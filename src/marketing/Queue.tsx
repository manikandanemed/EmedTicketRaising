import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../services/toast';
import { useDebounce } from '../hooks/useDebounce';
import { ApiError, LeadDetail, LeadSummary, mk } from './marketingApi';
import { useLookups } from './lookupsContext';
import { refreshCounts } from './counts';
import { ago, showError, useLoad } from './helpers';
import { Dlg, ErrorBox, HistoryItem, Loading, ScoreBar, StagePill } from './ui';

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
  const debounced = useDebounce(search.trim(), 300);

  const { data, error, loading, reload } = useLoad<LeadSummary[]>(
    () => mk.queue({ search: debounced, channel, campaign, temperature, stage, sort: sort.key, dir: sort.dir }),
    [debounced, channel, campaign, temperature, stage, sort.key, sort.dir],
  );

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
      if (e instanceof ApiError && e.status === 409) { reload(); refreshCounts(); }
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
        <button className="mk-btn primary" onClick={startOnHottest} disabled={busy}>Start on hottest lead</button>
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
                    <td style={{ textAlign: 'right' }}>
                      <button className="mk-btn sm primary" disabled={busy} onClick={e => { e.stopPropagation(); pickUp(l); }}>Start working</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {previewId && <Preview id={previewId} busy={busy} onClose={() => setPreviewId(null)} onStart={l => { setPreviewId(null); pickUp(l); }} />}
    </>
  );
}

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
            <div><dt>Campaign</dt><dd>{l.campaign}</dd></div>
            <div><dt>Channel</dt><dd>{l.channel}</dd></div>
            <div><dt>Lead score</dt><dd><ScoreBar score={l.score} temperature={l.temperature} /></dd></div>
            <div><dt>Emails sent</dt><dd>{l.emailsSent}</dd></div>
            <div><dt>Waiting for</dt><dd>{ago(l.createdAt)}</dd></div>
          </dl>
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
