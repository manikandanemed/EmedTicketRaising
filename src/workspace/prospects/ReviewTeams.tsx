import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { toast } from '../../services/toast';
import { useDebounce } from '../../hooks/useDebounce';
import { describeError, wsApi } from '../workspaceApi';
import { Avatar, EmptyState, ErrorState, Loading, Modal, roleLabel, useLoad } from '../ui';
import { useMe } from '../session';
import { ReviewTeamInfo, pApi } from './prospectApi';
import { useProspectAccess } from './access';
import { EmptyTeamsBanner } from './ProspectParts';

export default function ReviewTeams() {
  const { isPM } = useMe();
  const { loaded, unavailable } = useProspectAccess();
  if (!loaded) return <Loading />;
  if (!isPM || unavailable) return <Navigate to="/workspace" replace />;
  return <ReviewTeamsPage />;
}

function ReviewTeamsPage() {
  const teams = useLoad(() => pApi.reviewTeams(), []);
  const [editing, setEditing] = useState<ReviewTeamInfo | null>(null);
  const [bannerKey, setBannerKey] = useState(0);

  return (
    <div className="pr-page">
      <div className="ws-title-row">
        <div>
          <h1>Review teams</h1>
          <p className="ws-muted">Who checks prospect emails for each team. Only members of a team can approve, ask for fixes or decline its requests.</p>
        </div>
      </div>

      <EmptyTeamsBanner refreshKey={bannerKey} />

      {teams.loading ? <Loading label="Loading teams..." />
        : teams.error || !teams.data ? <ErrorState error={teams.error} onRetry={teams.reload} />
        : (
          <div className="pr-team-grid">
            {teams.data.map(t => (
              <section key={t.team} className="ws-panel pr-team">
                <div className="ws-toolbar">
                  <h3>{t.team}</h3>
                  <button className="btn btn-secondary" onClick={() => setEditing(t)}><UserPlus size={15} /> Edit members</button>
                </div>
                {t.members.length === 0
                  ? <p className="ws-muted">No members yet.</p>
                  : <ul className="pr-members">{t.members.map(m => <li key={m.userId}><Avatar name={m.name} size={28} /> {m.name}</li>)}</ul>}
              </section>
            ))}
          </div>
        )}

      {editing && (
        <EditMembersDialog
          team={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); teams.reload(); setBannerKey(k => k + 1); }}
        />
      )}
    </div>
  );
}

function EditMembersDialog({ team, onClose, onSaved }: { team: ReviewTeamInfo; onClose: () => void; onSaved: () => void }) {
  const people = useLoad(() => wsApi.listPeople(), []);
  const [selected, setSelected] = useState(() => new Set(team.members.map(m => m.userId)));
  const [searchText, setSearchText] = useState('');
  const search = useDebounce(searchText, 200).trim().toLowerCase();
  const [busy, setBusy] = useState(false);

  // current members stay listed even if the people list does not include them
  const all = useMemo(() => {
    const known = new Map((people.data?.items ?? []).map(p => [p.id, { id: p.id, name: p.name, role: p.role as string }]));
    team.members.forEach(m => { if (!known.has(m.userId)) known.set(m.userId, { id: m.userId, name: m.name, role: '' }); });
    return [...known.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [people.data, team.members]);
  const shown = all.filter(p => !search || p.name.toLowerCase().includes(search));

  const toggle = (id: number) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    setBusy(true);
    try {
      await pApi.setTeamMembers(team.team, [...selected]);
      toast.success(`${team.team} members saved.`);
      onSaved();
    } catch (e) {
      toast.error(describeError(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`${team.team} members`}
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || people.loading}>
            {busy && <Loader2 size={14} className="spinner" />} Save ({selected.size})
          </button>
        </>
      }
    >
      <div className="pr-search pr-member-search">
        <Search size={15} />
        <input className="form-input" placeholder="Search people" aria-label="Search people" value={searchText} onChange={e => setSearchText(e.target.value)} />
      </div>
      {people.loading ? <Loading compact />
        : people.error ? <ErrorState compact error={people.error} onRetry={people.reload} />
        : shown.length === 0 ? <EmptyState title="Nobody matches" />
        : (
          <div className="pr-col-list pr-member-list">
            {shown.map(p => (
              <label key={p.id} className="ws-check">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /> {p.name}
                {p.role && <span className="ws-muted ws-small">{roleLabel(p.role)}</span>}
              </label>
            ))}
          </div>
        )}
    </Modal>
  );
}
