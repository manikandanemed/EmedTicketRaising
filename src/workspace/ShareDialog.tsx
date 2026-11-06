import React, { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { SheetAccess, describeError, wsApi } from './workspaceApi';
import { Avatar, ErrorState, Loading, Modal, roleLabel, useLoad } from './ui';
import { toast } from '../services/toast';

/** Owner only: pick the people a sheet is shared with and whether each can edit or only view. Saving replaces the whole list. */
export default function ShareDialog({ sheetId, ownerId, current, onClose, onSaved }: {
  sheetId: number;
  ownerId: number;
  current: SheetAccess[];
  onClose: () => void;
  onSaved: (list: SheetAccess[]) => void;
}) {
  const [shared, setShared] = useState<Map<number, boolean>>(() => new Map(current.map(a => [a.userId, a.canEdit])));
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebounce(search, 200);
  const people = useLoad(() => wsApi.listPeople({ search: debounced }), [debounced]);

  const candidates = useMemo(() => (people.data?.items ?? []).filter(p => p.id !== ownerId), [people.data, ownerId]);

  const toggle = (id: number) => setShared(prev => { const n = new Map(prev); if (!n.delete(id)) n.set(id, true); return n; });
  const setEdit = (id: number, canEdit: boolean) => setShared(prev => new Map(prev).set(id, canEdit));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const list = await wsApi.setSheetAccess(sheetId, [...shared].map(([userId, canEdit]) => ({ userId, canEdit })));
      toast.success('Sharing updated');
      onSaved(list);
    } catch (e) {
      setError(describeError(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Share this sheet"
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 size={14} className="spinner" />} Save ({shared.size} shared)</button>
        </>
      }
    >
      {error && <div className="ws-banner ws-banner-error" role="alert">{error}</div>}
      <div className="ws-people-search" style={{ marginBottom: 12 }}>
        <Search size={15} />
        <input className="form-input" placeholder="Search people" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search people" />
      </div>
      {people.loading ? <Loading compact /> : people.error ? <ErrorState compact error={people.error} onRetry={people.reload} /> : (
        <ul className="ws-share-list">
          {candidates.length === 0 && <li className="ws-muted">Nobody matches.</li>}
          {candidates.map(p => {
            const on = shared.has(p.id);
            return (
              <li key={p.id} className={on ? 'on' : ''}>
                <label className="ws-share-who">
                  <input type="checkbox" checked={on} onChange={() => toggle(p.id)} />
                  <Avatar name={p.name} size={28} />
                  <span><b>{p.name}</b><br /><span className="ws-muted ws-small">{roleLabel(p.role)}</span></span>
                </label>
                {on && (
                  <div className="ws-seg" role="group" aria-label={`Access for ${p.name}`}>
                    <button className={shared.get(p.id) ? 'active' : ''} onClick={() => setEdit(p.id, true)}>Can edit</button>
                    <button className={!shared.get(p.id) ? 'active' : ''} onClick={() => setEdit(p.id, false)}>View only</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="ws-muted ws-small">Product Managers can always view a sheet, but can only edit it when you choose "Can edit" for them.</p>
    </Modal>
  );
}
