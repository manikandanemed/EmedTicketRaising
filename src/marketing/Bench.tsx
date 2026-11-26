import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from '../services/toast';
import { LeadDetail, LeadSummary, mk } from './marketingApi';
import { useLookups } from './lookupsContext';
import { refreshCounts } from './counts';
import AddHistory from './AddHistory';
import { OPEN_STAGES, ago, isClosed, showError, useLoad } from './helpers';
import { ErrorBox, HistoryItem, ImportedData, Loading, StagePill } from './ui';

type Filter = 'open' | 'closed' | 'all';
type HistFilter = 'All' | 'Emails' | 'Calls & notes';
const MAIL_KINDS = ['Email sent', 'Reply received'];

export default function Bench() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('open');
  const list = useLoad<LeadSummary[]>(() => mk.bench(filter), [filter]);
  const selectedId = leadId ?? list.data?.[0]?.id ?? null;

  const changed = () => { list.reload(); refreshCounts(); };

  return (
    <>
      <h1>Work bench</h1>
      <p className="mk-sub">Leads you’re tracking. Log every email, reply and call so the full history stays in one place.</p>
      <div className="mk-bench">
        <div>
          <div className="mk-toolbar" style={{ marginBottom: 10 }}>
            <select aria-label="Show" value={filter} onChange={e => { setFilter(e.target.value as Filter); navigate('/marketing/bench'); }}>
              <option value="open">Open leads</option>
              <option value="closed">Closed leads</option>
              <option value="all">All my leads</option>
            </select>
          </div>
          <div className="mk-benchlist">
            {list.loading && !list.data ? <Loading /> : list.error && !list.data ? <ErrorBox error={list.error} onRetry={list.reload} /> :
              (list.data ?? []).length === 0 ? (
                <div className="mk-empty mk-panel"><strong>Nothing here yet</strong>Go to the work queue and click a lead to start working on it.</div>
              ) : (list.data ?? []).map(l => (
                <button key={l.id} className="mk-bl-item" aria-current={l.id === selectedId} onClick={() => navigate(`/marketing/bench/${l.id}`)}>
                  <span className="top"><strong>{l.name}</strong><StagePill stage={l.stage} /></span>
                  <span className="meta">{l.company || l.email}</span>
                  <span className="meta">{l.emailsSent} email{l.emailsSent === 1 ? '' : 's'}, {l.lastContactAt ? `last contact ${ago(l.lastContactAt)} ago` : 'not contacted yet'}</span>
                </button>
              ))}
          </div>
        </div>
        <div className="mk-panel" id="b-detail">
          {selectedId ? (
            <LeadPanel key={selectedId} id={selectedId} onChanged={changed} onReturned={() => { changed(); navigate('/marketing/bench'); }} />
          ) : list.loading ? <Loading /> : (
            <div className="mk-empty"><strong>No lead selected</strong>Your leads show up on the left.<br /><br /><Link className="mk-btn primary" to="/marketing/queue">Go to work queue</Link></div>
          )}
        </div>
      </div>
    </>
  );
}

const LeadPanel: React.FC<{ id: string; onChanged: () => void; onReturned: () => void }> = ({ id, onChanged, onReturned }) => {
  const lookups = useLookups();
  const { data: lead, error, loading, reload, setData } = useLoad<LeadDetail>(() => mk.lead(id), [id]);
  const [histFilter, setHistFilter] = useState<HistFilter>('All');
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState(lookups.closeReasons[0] ?? '');
  const [scoreText, setScoreText] = useState('');
  const [busy, setBusy] = useState(false);

  const leadScore = lead?.score;
  useEffect(() => { if (leadScore !== undefined) setScoreText(String(leadScore)); }, [leadScore]);

  if (loading && !lead) return <Loading label="Loading lead..." />;
  if (error || !lead) return <ErrorBox error={error} onRetry={reload} />;

  const closed = isClosed(lead.stage);

  const apply = async (run: () => Promise<LeadDetail>, message: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const d = await run();
      setData(d);
      toast.success(message);
      onChanged();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const commitScore = () => {
    const v = Math.max(0, Math.min(100, Math.round(Number(scoreText) || 0)));
    setScoreText(String(v));
    if (v !== lead.score) apply(() => mk.setScore(lead.id, v), `Score set to ${v}`);
  };

  const hist = lead.history.filter(n => histFilter === 'All' || (histFilter === 'Emails' ? MAIL_KINDS.includes(n.kind) : !MAIL_KINDS.includes(n.kind)));

  return (
    <>
      <Link to="/marketing/queue" className="mk-backlink">Back to work queue</Link>
      <div className="mk-detail-head">
        <div><h2>{lead.name}</h2><div style={{ color: 'var(--mk-muted)' }}>{[lead.title, lead.company].filter(Boolean).join(', ') || 'No company'}</div></div>
        <StagePill stage={lead.stage} large>{closed ? `Closed – ${lead.closeReason ?? ''}` : lead.stage}</StagePill>
      </div>

      <div className="mk-hist-top">
        <div className="mk-hist-head">
          <h2 style={{ margin: 0 }}>History</h2>
          <div className="mk-chips" role="group" aria-label="Filter history" style={{ margin: 0 }}>
            {(['All', 'Emails', 'Calls & notes'] as HistFilter[]).map(f => (
              <button key={f} className="mk-chip" aria-pressed={histFilter === f} onClick={() => setHistFilter(f)}>{f}</button>
            ))}
          </div>
        </div>
        {hist.length ? <ol className="mk-timeline">{hist.map(n => <HistoryItem key={n.id} n={n} />)}</ol> : <p style={{ color: 'var(--mk-muted)' }}>Nothing here yet.</p>}
      </div>

      <dl className="mk-facts">
        <div><dt>Email</dt><dd><a href={`mailto:${lead.email}`} style={{ color: 'var(--mk-teal)' }}>{lead.email}</a></dd></div>
        <div><dt>Phone</dt><dd>{lead.phone || 'Not given'}</dd></div>
        <div><dt>Campaign</dt><dd>{lead.campaign}</dd></div>
        <div><dt>Channel</dt><dd>{lead.channel}</dd></div>
        <div><dt>Interested in</dt><dd>{lead.interest}</dd></div>
        <div>
          <dt><label htmlFor="bd-score">Lead score</label></dt>
          <dd>
            <span className="mk-scorebox">
              <input
                id="bd-score" type="number" min={0} max={100} value={scoreText} disabled={busy}
                onChange={e => setScoreText(e.target.value)}
                onBlur={commitScore}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              />
              <span className={`mk-temp t-${lead.temperature}`}>{lead.temperature}</span>
            </span>
          </dd>
        </div>
        <div><dt>Emails sent</dt><dd>{lead.emailsSent}</dd></div>
        <div><dt>Last contact</dt><dd>{lead.lastContactAt ? `${ago(lead.lastContactAt)} ago` : 'Not contacted yet'}</dd></div>
        <div><dt>Email consent</dt><dd>{lead.consent ? 'Yes' : 'No'}</dd></div>
      </dl>

      <ImportedData fields={lead.importedFields} skipValues={[lead.email, lead.phone]} />

      <h2><label htmlFor="bd-stage">Status</label></h2>
      <select
        id="bd-stage" className="mk-status-select" value={closed ? 'Closed' : lead.stage} disabled={busy}
        onChange={e => { const s = e.target.value; if (s !== lead.stage) apply(() => mk.setStage(lead.id, s), `Moved to ${s}`); }}
      >
        {closed && <option value="Closed" disabled>Closed – {lead.closeReason}</option>}
        {OPEN_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="mk-actions">
        {closed ? (
          <button className="mk-btn" disabled={busy} onClick={() => apply(() => mk.setStage(lead.id, 'Contacted'), 'Lead reopened')}>Reopen lead</button>
        ) : (
          <>
            <button className="mk-btn" disabled={busy} onClick={() => setClosing(true)}>Close lead</button>
            <button
              className="mk-btn" disabled={busy}
              onClick={async () => {
                setBusy(true);
                try { await mk.returnLead(lead.id); toast.success(`${lead.name} is back in the queue`); onReturned(); }
                catch (e) { showError(e); reload(); } finally { setBusy(false); }
              }}
            >Return to queue</button>
          </>
        )}
      </div>
      {closing && !closed && (
        <div className="mk-handoff open">
          <label htmlFor="cl-reason">Reason</label>
          <select id="cl-reason" autoFocus value={reason} onChange={e => setReason(e.target.value)}>
            {lookups.closeReasons.map(r => <option key={r}>{r}</option>)}
          </select>
          <button className="mk-btn primary sm" disabled={busy} onClick={async () => { await apply(() => mk.close(lead.id, reason), `${lead.name} closed`); setClosing(false); }}>Close lead</button>
          <button className="mk-btn sm" onClick={() => setClosing(false)}>Cancel</button>
        </div>
      )}

      <AddHistory lead={lead} onSaved={d => { setData(d); onChanged(); }} />
    </>
  );
};
