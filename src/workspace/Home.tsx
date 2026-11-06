import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, FilePlus2, FileSpreadsheet, FileUp, Pencil, Send, Share2, ShieldCheck } from 'lucide-react';
import { useMe } from './session';
import { Campaign, ImportBatch, SheetListItem, wsApi } from './workspaceApi';
import { EmptyState, ErrorState, Loading, parseDate, plural, timeAgo, useLoad } from './ui';
import { NewSheetDialog } from './SheetsTab';

interface Snapshot { campaigns: Campaign[]; imports: ImportBatch[]; sheets: SheetListItem[] }

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

interface Todo { key: string; icon: React.ReactNode; label: string; hint?: string; to: string; tone: 'info' | 'warning' | 'error' | 'ok' }

export default function Home() {
  const { name, userId, isPM } = useMe();
  const navigate = useNavigate();
  const [newSheet, setNewSheet] = useState(false);

  const { data, error, loading, reload } = useLoad<Snapshot>(async () => {
    const [campaigns, imports, sheets] = await Promise.all([wsApi.listCampaigns(), wsApi.listImports(50), wsApi.listSheets()]);
    return { campaigns: campaigns.items, imports, sheets };
  }, []);

  const view = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const mine = data.campaigns.filter(c => c.createdByUserId === userId);
    const sentThisMonth = (list: Campaign[]) => list.filter(c => c.status === 'sent' && c.sentAt && parseDate(c.sentAt) >= monthStart).length;

    const tiles = isPM
      ? [
        { label: 'Waiting for my approval', value: data.campaigns.filter(c => c.canApprove).length, icon: <ShieldCheck size={20} />, to: '/workspace/campaigns', tone: 'warning' },
        { label: 'Sent this month', value: sentThisMonth(data.campaigns), icon: <Send size={20} />, to: '/workspace/campaigns', tone: 'ok' },
        { label: 'Imports this week', value: data.imports.filter(i => parseDate(i.createdAt).getTime() >= weekAgo).length, icon: <FileUp size={20} />, to: '/workspace/campaigns?tab=imports', tone: 'info' },
        { label: 'Sheets shared with me', value: data.sheets.filter(s => !s.isOwner).length, icon: <Share2 size={20} />, to: '/workspace/campaigns?tab=sheets', tone: 'info' },
      ]
      : [
        { label: 'My drafts', value: mine.filter(c => c.status === 'draft').length, icon: <Pencil size={20} />, to: '/workspace/campaigns?mine=1', tone: 'info' },
        { label: 'Waiting for approval', value: mine.filter(c => c.status === 'pending').length, icon: <Clock size={20} />, to: '/workspace/campaigns?mine=1', tone: 'warning' },
        { label: 'Ready to send', value: mine.filter(c => c.canSend).length, icon: <CheckCircle2 size={20} />, to: '/workspace/campaigns?mine=1', tone: 'ok' },
        { label: 'Sent this month', value: sentThisMonth(mine), icon: <Send size={20} />, to: '/workspace/campaigns?mine=1', tone: 'ok' },
      ];

    const todos: Todo[] = [];
    const link = (c: Campaign) => `/workspace/campaigns/${c.id}`;
    if (isPM) {
      for (const c of data.campaigns.filter(x => x.canApprove)) {
        todos.push({ key: `a${c.id}`, icon: <ShieldCheck size={16} />, label: `Approve: ${c.title}`, hint: `from ${c.createdByName}`, to: link(c), tone: 'warning' });
      }
    } else {
      for (const c of mine.filter(x => x.canSend)) todos.push({ key: `s${c.id}`, icon: <Send size={16} />, label: `Send mail: ${c.title}`, to: link(c), tone: 'ok' });
      for (const c of mine.filter(x => x.status === 'draft' && x.managerNote)) {
        todos.push({ key: `f${c.id}`, icon: <Pencil size={16} />, label: `Fix and resend: ${c.title}`, hint: 'changes asked', to: link(c), tone: 'warning' });
      }
      for (const c of mine.filter(x => x.status === 'draft' && !x.managerNote && x.submitBlockers.length > 0)) {
        todos.push({ key: `e${c.id}`, icon: <AlertTriangle size={16} />, label: `Fix errors: ${c.title}`, hint: c.submitBlockers[0], to: link(c), tone: 'error' });
      }
    }

    return {
      tiles,
      todos,
      imports: data.imports.slice(0, 5),
      sheets: [...data.sheets].sort((a, b) => parseDate(b.updatedAt).getTime() - parseDate(a.updatedAt).getTime()).slice(0, 5),
    };
  }, [data, isPM, userId]);

  return (
    <div className="ws-home">
      <div className="ws-title-row">
        <div>
          <h1>{greeting()}, {name.split(' ')[0] || 'there'}</h1>
          <p className="ws-muted">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="ws-actions">
          {!isPM && <button className="btn btn-primary" onClick={() => navigate('/workspace/campaigns?new=1')}><FilePlus2 size={16} /> New mail</button>}
          {!isPM && <button className="btn btn-secondary" onClick={() => navigate('/workspace/campaigns?import=1')}><FileUp size={16} /> Import from Excel</button>}
          <button className="btn btn-secondary" onClick={() => setNewSheet(true)}><FileSpreadsheet size={16} /> New shared sheet</button>
        </div>
      </div>

      {loading ? <Loading label="Loading your workspace..." />
        : error || !view ? <ErrorState error={error} onRetry={reload} />
        : (
          <>
            <div className="ws-tiles">
              {view.tiles.map(t => (
                <Link key={t.label} to={t.to} className={`ws-tile ws-tone-${t.tone}`}>
                  <span className="ws-tile-icon">{t.icon}</span>
                  <span className="ws-tile-value">{t.value}</span>
                  <span className="ws-tile-label">{t.label}</span>
                </Link>
              ))}
            </div>

            <div className="ws-home-grid">
              <section className="ws-panel ws-span-2">
                <h3>To do {view.todos.length > 0 && <span className="ws-chip-count">{view.todos.length}</span>}</h3>
                {view.todos.length === 0 ? (
                  <EmptyState icon={<CheckCircle2 size={26} />} title="Nothing waiting for you" text={isPM ? 'No mails need your approval.' : 'No mails to send or fix.'} />
                ) : (
                  <ul className="ws-todo">
                    {view.todos.map(t => (
                      <li key={t.key}>
                        <Link to={t.to} className={`ws-todo-item ws-tone-${t.tone}`}>
                          <span className="ws-todo-icon">{t.icon}</span>
                          <span className="ws-todo-label">{t.label}</span>
                          {t.hint && <span className="ws-muted ws-small">{t.hint}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="ws-panel">
                <h3>Recent imports</h3>
                {view.imports.length === 0 ? (
                  <EmptyState icon={<FileUp size={24} />} title="No imports yet" text={isPM ? undefined : 'Import campaign mails from an Excel file.'} />
                ) : (
                  <ul className="ws-mini-list">
                    {view.imports.map(i => (
                      <li key={i.id}>
                        <Link className="ws-link" to={`/workspace/campaigns?importId=${i.id}`}>{i.fileName}</Link>
                        <span className="ws-muted ws-small">
                          {plural(i.importedRows, 'draft')} · {i.importedByName} · {timeAgo(i.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="ws-panel">
                <h3>Recently updated shared sheets</h3>
                {view.sheets.length === 0 ? (
                  <EmptyState icon={<FileSpreadsheet size={24} />} title="No shared sheets" text="Upload an Excel file to edit it together." />
                ) : (
                  <ul className="ws-mini-list">
                    {view.sheets.map(s => (
                      <li key={s.id}>
                        <Link className="ws-link" to={`/workspace/sheets/${s.id}`}>{s.title}</Link>
                        <span className="ws-muted ws-small">{s.updatedByName ?? s.ownerName} · {timeAgo(s.updatedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}

      {newSheet && <NewSheetDialog onClose={() => setNewSheet(false)} />}
    </div>
  );
}
