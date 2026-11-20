import React from 'react';
import { Dashboard as DashboardData, mk } from './marketingApi';
import { useLookups } from './lookupsContext';
import { ago, tempColor, useLoad } from './helpers';
import { ErrorBox, Loading } from './ui';

const STAGE_STYLE: Record<string, [string, string]> = {
  New: ['--mk-blue-soft', '--mk-blue'],
  Contacted: ['--mk-violet-soft', '--mk-violet'],
  Replied: ['--mk-amber-soft', '--mk-amber'],
  Interested: ['--mk-teal-soft', '--mk-teal'],
  Closed: ['--mk-line', '--mk-muted'],
};

export default function Dashboard() {
  const lookups = useLookups();
  const { data, error, loading, reload } = useLoad<DashboardData>(() => mk.dashboard(), []);

  if (loading && !data) return <><h1>Dashboard</h1><Loading label="Loading dashboard..." /></>;
  if (error || !data) return <><h1>Dashboard</h1><ErrorBox error={error} onRetry={reload} /></>;

  const stageCount = (s: string) => data.byStage.find(x => x.stage === s)?.count ?? 0;
  const channelCount = (c: string) => data.byChannel.find(x => x.channel === c)?.count ?? 0;
  const tempCount = (t: string) => data.byTemperature.find(x => x.temperature === t)?.count ?? 0;
  const maxChannel = Math.max(1, ...lookups.channels.map(channelCount));
  const tempTotal = ['Hot', 'Warm', 'Cold'].reduce((a, t) => a + tempCount(t), 0);
  const campaigns = data.byCampaign.filter(c => c.leads > 0).sort((a, b) => b.leads - a.leads);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="mk-sub">Every lead you’re tracking and every email sent to them.</p>

      <div className="mk-panel mk-pipeline">
        <div className="mk-pipe-head">
          <div className="mk-pipe-total">{data.leadsTracked}<small>leads tracked</small></div>
          <div style={{ color: 'var(--mk-muted)', fontSize: 14 }}>Emails sent to leads <strong style={{ color: 'var(--mk-ink)' }}>{data.emailsSent}</strong></div>
        </div>
        <div className="mk-stagebar" aria-label="Leads by status">
          {lookups.stages.map(s => {
            const n = stageCount(s);
            if (!n) return null;
            const [bg, fg] = STAGE_STYLE[s] ?? STAGE_STYLE.Closed;
            return (
              <div key={s} className="seg-bar" style={{ flexGrow: n, background: `var(${bg})`, color: `var(${fg})` }} title={`${s}: ${n} lead${n > 1 ? 's' : ''}`}>
                <b>{n}</b><span>{s}</span>
              </div>
            );
          })}
        </div>
        <div className="mk-stage-legend">New → Contacted → Replied → Interested, then Closed with a reason.</div>
      </div>

      <div className="mk-kpis">
        <div className="mk-panel mk-kpi"><div className="v">{data.waitingInQueue}</div><div className="l">Waiting in the work queue</div></div>
        <div className="mk-panel mk-kpi"><div className="v">{data.onMyBench}</div><div className="l">Open on your work bench</div></div>
        <div className="mk-panel mk-kpi"><div className="v">{data.emailsSent}</div><div className="l">Emails sent</div></div>
        <div className="mk-panel mk-kpi"><div className="v">{Math.round(data.replyRate * 100)}%</div><div className="l">Reply rate (replied ÷ emailed)</div></div>
      </div>

      <div className="mk-dash-grid">
        <div className="mk-panel">
          <h2>Leads by channel</h2>
          {lookups.channels.map(c => (
            <div className="mk-srcrow" key={c}>
              <span>{c}</span>
              <div className="mk-srcbar"><i style={{ width: `${(channelCount(c) / maxChannel) * 100}%` }} /></div>
              <strong>{channelCount(c)}</strong>
            </div>
          ))}
          <h2 style={{ marginTop: 22 }}>Lead temperature</h2>
          {['Hot', 'Warm', 'Cold'].map(t => (
            <div className="mk-srcrow" key={t}>
              <span className={`mk-temp t-${t}`}>{t}</span>
              <div className="mk-srcbar"><i style={{ width: `${tempTotal ? (tempCount(t) / tempTotal) * 100 : 0}%`, background: tempColor(t) }} /></div>
              <strong>{tempCount(t)}</strong>
            </div>
          ))}
        </div>
        <div className="mk-panel">
          <h2>Campaigns</h2>
          <div className="mk-camp-row" style={{ paddingTop: 0 }}><small>Campaign</small><small>Leads</small><small>Emails</small></div>
          {campaigns.map(c => (
            <div className="mk-camp-row" key={c.campaign}>
              <span>{c.campaign}</span><strong>{c.leads}</strong><strong style={{ color: 'var(--mk-blue)' }}>{c.emails}</strong>
            </div>
          ))}
          <h2 style={{ marginTop: 22 }}>Recent activity</h2>
          {data.recentActivity.length === 0 ? <p style={{ color: 'var(--mk-muted)' }}>No activity yet.</p> : (
            <ul className="mk-activity">
              {data.recentActivity.slice(0, 7).map((a, i) => <li key={i}><span>{a.text}</span><time>{ago(a.at)} ago</time></li>)}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
