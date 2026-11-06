import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, ExternalLink, Search, Users, X } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { Campaign, NotificationList, PeopleList, PersonProfile, wsApi, describeError } from './workspaceApi';
import { confirmLeave } from './leaveGuard';
import { Avatar, EmptyState, ErrorState, Loading, Modal, Tag, formatDateTime, roleLabel, timeAgo, useLoad } from './ui';

const ROLE_TABS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Employee', label: 'Employees' },
  { key: 'ProductManager', label: 'Product Managers' },
];

interface MailCounts { drafts: number; waiting: number; sent: number }

function countsByPerson(items: Campaign[]): Map<number, MailCounts> {
  const map = new Map<number, MailCounts>();
  for (const c of items) {
    const row = map.get(c.createdByUserId) ?? { drafts: 0, waiting: 0, sent: 0 };
    if (c.status === 'draft') row.drafts++;
    else if (c.status === 'pending') row.waiting++;
    else if (c.status === 'sent') row.sent++;
    map.set(c.createdByUserId, row);
  }
  return map;
}

const NONE: MailCounts = { drafts: 0, waiting: 0, sent: 0 };

const MailCountsLine: React.FC<{ counts: MailCounts }> = ({ counts }) => (
  <div className="ws-person-counts" aria-label="Campaign mails">
    <span title="Drafts"><b>{counts.drafts}</b> drafts</span>
    <span title="Waiting for approval"><b>{counts.waiting}</b> waiting</span>
    <span title="Sent"><b>{counts.sent}</b> sent</span>
  </div>
);

// ---------- People panel ----------

const PeoplePanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('all');
  const [search, setSearch] = useState('');
  const [profileId, setProfileId] = useState<number | null>(null);
  const debounced = useDebounce(search, 250);
  const location = useLocation();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // the count on the button, loaded once and kept fresh whenever the panel is opened
  const total = useLoad<PeopleList>(() => wsApi.listPeople(), []);
  const people = useLoad<PeopleList>(
    () => (open ? wsApi.listPeople({ role: role === 'all' ? undefined : role, search: debounced }) : Promise.resolve(total.data ?? { totalCount: 0, roleCounts: {}, items: [] })),
    [open, role, debounced],
  );
  const mails = useLoad(() => (open ? wsApi.listCampaigns() : Promise.resolve(null)), [open]);
  const counts = useMemo(() => countsByPerson(mails.data?.items ?? []), [mails.data]);

  // closes on navigation, Esc and an outside click
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && profileId === null) setOpen(false); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (profileId !== null || document.querySelector('.ws-modal')) return; // a profile dialog is open on top
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open, profileId]);

  const count = total.data?.totalCount;
  const roleCounts = people.data?.roleCounts ?? total.data?.roleCounts ?? {};

  return (
    <>
      <button
        ref={buttonRef}
        className={`ws-nav-btn ${open ? 'active' : ''}`}
        onClick={() => { setOpen(o => !o); if (!open) total.reload(); }}
        aria-expanded={open}
        aria-controls="ws-people-panel"
      >
        <Users size={16} />
        <span className="ws-nav-btn-label">People</span>
        {count !== undefined && <span className="ws-nav-count">{count}</span>}
        <ChevronDown size={14} className={`ws-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <>
          <div className="ws-dim" aria-hidden="true" />
          <div className="ws-people-panel" id="ws-people-panel" ref={panelRef} role="region" aria-label="People">
            <div className="ws-people-head">
              <div className="ws-people-search">
                <Search size={15} />
                <input
                  autoFocus
                  className="form-input"
                  placeholder="Search by name or role"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  aria-label="Search people"
                />
              </div>
              <div className="ws-people-tabs" role="tablist">
                {ROLE_TABS.map(t => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={role === t.key}
                    className={`ws-chip ${role === t.key ? 'active' : ''}`}
                    onClick={() => setRole(t.key)}
                  >
                    {t.label} <span className="ws-chip-count">{roleCounts[t.key] ?? 0}</span>
                  </button>
                ))}
              </div>
              <button className="btn btn-ghost ws-people-close" onClick={() => setOpen(false)}><X size={14} /> Close</button>
            </div>

            <div className="ws-people-body">
              {people.loading ? <Loading compact label="Loading people..." />
                : people.error ? <ErrorState compact error={people.error} onRetry={people.reload} />
                : (people.data?.items.length ?? 0) === 0 ? <EmptyState title="Nobody matches" text="Try another name or role." />
                : (
                  <div className="ws-people-grid">
                    {people.data!.items.map(p => (
                      <button key={p.id} className="ws-person-card" onClick={() => setProfileId(p.id)}>
                        <Avatar name={p.name} size={40} />
                        <div className="ws-person-info">
                          <strong>{p.name}</strong>
                          <span className="ws-muted">{roleLabel(p.role)}</span>
                          {mails.loading ? <span className="ws-muted ws-small">Loading mails...</span> : <MailCountsLine counts={counts.get(p.id) ?? NONE} />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </>
      )}

      {profileId !== null && (
        <PersonProfileDialog id={profileId} mails={mails.data?.items ?? []} onClose={() => setProfileId(null)} />
      )}
    </>
  );
};

const PersonProfileDialog: React.FC<{ id: number; mails: Campaign[]; onClose: () => void }> = ({ id, mails, onClose }) => {
  const navigate = useNavigate();
  const { data, error, loading, reload } = useLoad<PersonProfile>(() => wsApi.getPerson(id), [id]);
  const theirs = mails.filter(m => m.createdByUserId === id);
  const counts = countsByPerson(theirs).get(id) ?? NONE;

  return (
    <Modal title="Profile" onClose={onClose}>
      {loading ? <Loading compact /> : error || !data ? <ErrorState compact error={error} onRetry={reload} /> : (
        <div className="ws-profile">
          <div className="ws-profile-head">
            <Avatar name={data.name} size={56} />
            <div>
              <h4>{data.name}</h4>
              <Tag tone="info">{roleLabel(data.role)}</Tag>
            </div>
          </div>
          <dl className="ws-dl">
            <dt>Email</dt><dd><a href={`mailto:${data.email}`}>{data.email}</a></dd>
            <dt>Joined</dt><dd>{formatDateTime(data.joinedAt)}</dd>
            <dt>Campaign mails</dt><dd><MailCountsLine counts={counts} /></dd>
          </dl>
          {theirs.length > 0 && (
            <>
              <h5 className="ws-subhead">Recent mails</h5>
              <ul className="ws-mini-list">
                {theirs.slice(0, 5).map(m => (
                  <li key={m.id}>
                    <button className="ws-link" onClick={() => { if (!confirmLeave()) return; onClose(); navigate(`/workspace/campaigns/${m.id}`); }}>
                      {m.title} <ExternalLink size={12} />
                    </button>
                    <Tag>{m.status === 'pending' ? 'waiting' : m.status}</Tag>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

// ---------- Notification bell ----------

const POLL_MS = 60_000;

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<NotificationList | null>(null);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());
  const wrapRef = useRef<HTMLDivElement>(null);

  const fetchList = async () => {
    try {
      const result = await wsApi.notifications();
      setList(result);
      setUnread(result.unreadCount);
      setError(null);
      return result;
    } catch (e) {
      setError(describeError(e));
      return null;
    }
  };

  // poll every 60 seconds (not while the tab is hidden)
  useEffect(() => {
    fetchList();
    const timer = setInterval(() => { if (!document.hidden) fetchList(); }, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    const result = await fetchList();
    if (result && result.unreadCount > 0) {
      setFreshIds(new Set(result.items.filter(i => !i.isRead).map(i => i.id))); // keep them highlighted while the list is open
      try { await wsApi.readAllNotifications(); setUnread(0); } catch { /* stays unread; shown again next time */ }
    } else setFreshIds(new Set());
  };

  return (
    <div className="ws-bell" ref={wrapRef}>
      <button className="ws-icon-btn" onClick={toggle} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
        <Bell size={16} />
        {unread > 0 && <span className="ws-bell-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="ws-bell-menu" role="menu">
          <div className="ws-bell-head">Notifications</div>
          {error && <div className="ws-bell-error">{error}</div>}
          {!list ? <Loading compact /> : list.items.length === 0 ? (
            <div className="ws-bell-empty">You are all caught up.</div>
          ) : (
            <ul>
              {list.items.map(n => (
                <li key={n.id}>
                  <button
                    className={`ws-bell-item ${freshIds.has(n.id) ? 'fresh' : ''}`}
                    disabled={!n.link}
                    onClick={() => { if (n.link && !confirmLeave()) return; setOpen(false); if (n.link) navigate(n.link); }}
                  >
                    <span>{n.message}</span>
                    <span className="ws-muted ws-small">{timeAgo(n.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default function NavbarItems() {
  return (
    <>
      <PeoplePanel />
      <NotificationBell />
    </>
  );
}
