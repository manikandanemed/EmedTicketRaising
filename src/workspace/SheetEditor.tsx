import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import type { Sheet } from '@fortune-sheet/core';
import { AlertTriangle, ArrowLeft, Download, FileUp, History, Loader2, RefreshCw, Save, Share2, Trash2, X } from 'lucide-react';
import { useMe } from './session';
import {
  SheetAccess, SheetConflict, SheetDetail, SheetHistoryItem, SheetVersion, ImportPreview,
  WsError, describeError, saveBlob, wsApi,
} from './workspaceApi';
import { ConfirmDialog, ErrorState, Loading, Modal, Tag, formatDateTime, plural, timeAgo } from './ui';
import ShareDialog from './ShareDialog';
import ImportDialog from './ImportDialog';
import { leaveGuard } from './leaveGuard';
import { CellMap, Edits, Input, addressOf, applyEdits, bookToGrid, bookToMap, cellKey, diffMaps, gridToMap, parseKey, rebase } from './sheetModel';
import { toast } from '../services/toast';

const POLL_MS = 20_000;
const CHUNK = 5000; // the API takes at most 5000 cells per save

const show = (v: Input | null | undefined) => (v === null || v === undefined ? '(empty)' : String(v));

export default function SheetEditor() {
  const { id } = useParams();
  const sheetId = Number(id);
  const navigate = useNavigate();
  const { userId, isPM } = useMe();

  const [sheet, setSheet] = useState<SheetDetail | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<{ sheets: Sheet[]; needsCalc: boolean; key: number }>({ sheets: [], needsCalc: false, key: 0 });
  const [dirty, setDirty] = useState<Edits>(new Map());
  const [touched, setTouched] = useState(false); // the grid reported a change that is not diffed yet
  const [remote, setRemote] = useState<SheetVersion | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [conflicts, setConflicts] = useState<SheetConflict[] | null>(null);
  const [lostEdit, setLostEdit] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [history, setHistory] = useState<SheetHistoryItem[] | 'loading' | { error: unknown } | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noteDismissed, setNoteDismissed] = useState(() => {
    try { return localStorage.getItem(`ws-format-note-${sheetId}`) === '1'; } catch { return false; }
  });

  // refs hold what handlers need right now (the grid reports every keystroke; React state would lag behind)
  const baseline = useRef<CellMap>(new Map());
  const version = useRef(0);
  const latest = useRef<Sheet[] | null>(null);
  const dirtyRef = useRef<Edits>(new Map());
  const timer = useRef<number | undefined>(undefined);
  const savingRef = useRef(false);

  const canEdit = !!sheet?.canEdit && !lostEdit;

  // ---------- dirty tracking ----------

  const publish = (edits: Edits) => {
    dirtyRef.current = edits;
    setTouched(false);
    setDirty(prev => (prev.size === 0 && edits.size === 0 ? prev : edits));
  };

  /** What differs between the grid and the last saved state, computed fresh. */
  const currentEdits = useCallback((): Edits => {
    if (!latest.current) return dirtyRef.current;
    const edits = diffMaps(baseline.current, gridToMap(latest.current));
    publish(edits);
    return edits;
  }, []);

  const onGridChange = useCallback((sheets: Sheet[]) => {
    latest.current = sheets;
    setTouched(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { currentEdits(); }, 80);
  }, [currentEdits]);

  /** Shows a loaded sheet in the grid with my still-valid unsaved edits laid over it. */
  const show_ = useCallback((fresh: SheetDetail, edits: Edits) => {
    baseline.current = bookToMap(fresh.data);
    version.current = fresh.version;
    latest.current = null;
    const converted = bookToGrid(applyEdits(fresh.data, edits));
    setSheet(fresh);
    setGrid(g => ({ ...converted, key: g.key + 1 }));
    publish(edits);
    setRemote(null);
  }, []);

  // ---------- load ----------

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    wsApi.getSheet(sheetId)
      .then(fresh => { if (!cancelled) { show_(fresh, new Map()); setLoadError(null); } })
      .catch(e => { if (!cancelled) setLoadError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; window.clearTimeout(timer.current); leaveGuard.active = false; };
  }, [sheetId, show_]);

  // ---------- poll the version every 20 s ----------

  useEffect(() => {
    if (!sheet) return;
    const tick = async () => {
      if (document.hidden || savingRef.current) return;
      try {
        const v = await wsApi.sheetVersion(sheetId);
        if (v.version > version.current) setRemote(v);
      } catch { /* a missed poll is fine; the next one tries again */ }
    };
    const t = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(t);
  }, [sheet, sheetId]);

  // ---------- reload and rebase ----------

  const reload = async (quiet = false) => {
    setReloading(true);
    try {
      const fresh = await wsApi.getSheet(sheetId);
      const { kept, dropped } = rebase(currentEdits(), baseline.current, bookToMap(fresh.data));
      show_(fresh, kept);
      if (dropped.length > 0) {
        const cells = dropped.slice(0, 6).map(k => { const p = parseKey(k); return `${p.sheet}!${addressOf(p.row, p.col)}`; }).join(', ');
        toast.info(`${plural(dropped.length, 'edit of yours was', 'edits of yours were')} dropped because someone else changed the same cell${dropped.length > 1 ? 's' : ''}: ${cells}${dropped.length > 6 ? '…' : ''}`);
      } else if (!quiet) {
        toast.success(kept.size > 0 ? `Reloaded. Your ${plural(kept.size, 'unsaved change')} kept.` : 'Reloaded');
      }
      return fresh;
    } catch (e) {
      toast.error(describeError(e));
      return null;
    } finally {
      setReloading(false);
    }
  };

  // ---------- save ----------

  const save = async () => {
    if (savingRef.current) return;
    const edits = currentEdits();
    if (edits.size === 0) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const entries = [...edits];
      let v = version.current;
      let expected = v;
      for (let i = 0; i < entries.length; i += CHUNK) {
        const chunk = entries.slice(i, i + CHUNK);
        const res = await wsApi.patchSheet(sheetId, v, chunk.map(([key, value]) => ({ ...parseKey(key), value })));
        if (res.conflicts) { setConflicts(res.conflicts); return; }
        if (res.result!.appliedCells > 0) expected += 1;
        v = res.result!.version;
        for (const [key, value] of chunk) { if (value === null) baseline.current.delete(key); else baseline.current.set(key, value); }
      }
      version.current = v;
      setSheet(s => (s ? { ...s, version: v, updatedBy: userId, updatedByName: 'You', updatedAt: new Date().toISOString() } : s));
      currentEdits();
      toast.success(`Saved ${plural(entries.length, 'cell')}`);
      if (v > expected) { savingRef.current = false; await reload(true); } // someone else saved other cells meanwhile
    } catch (e) {
      if (e instanceof WsError && e.status === 403) {
        setLostEdit(true);
        toast.error('You no longer have permission to edit this sheet.');
      } else if (e instanceof WsError && e.status === 409) {
        toast.error(`${e.message} Your changes are still here; try Save again.`);
      } else toast.error(`${describeError(e)} Your changes are still here.`);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  /** After the conflict dialog: reload, keep my choices, and save again. */
  const resolveConflicts = async (choices: Map<string, 'mine' | 'theirs'>) => {
    setReloading(true);
    try {
      const fresh = await wsApi.getSheet(sheetId);
      const edits = new Map(currentEdits());
      const keepMine = new Set<string>();
      for (const [key, choice] of choices) { if (choice === 'mine') keepMine.add(key); else edits.delete(key); }
      const { kept, dropped } = rebase(edits, baseline.current, bookToMap(fresh.data), keepMine);
      show_(fresh, kept);
      setConflicts(null);
      if (dropped.length > 0) toast.info(`${plural(dropped.length, 'more edit')} dropped: someone changed those cells too.`);
      setReloading(false);
      if (kept.size > 0) await save();
    } catch (e) {
      toast.error(describeError(e));
      setReloading(false);
    }
  };

  // Ctrl+S
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ---------- leaving with unsaved changes ----------

  const hasDirty = dirty.size > 0;
  useEffect(() => {
    leaveGuard.active = hasDirty;
    if (!hasDirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    // links inside the app (sidebar, navbar) are plain anchors; ask before they navigate
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.origin !== window.location.origin || a.pathname === window.location.pathname) return;
      if (!window.confirm(`${leaveGuard.message}\n\nLeave anyway?`)) { e.preventDefault(); e.stopPropagation(); }
    };
    // the browser Back button: the extra entry means the first Back stays on this page, where we can ask
    window.history.pushState(null, '', window.location.href);
    let leaving = false;
    const onPop = () => {
      if (leaving) return;
      if (window.confirm(`${leaveGuard.message}\n\nLeave anyway?`)) { leaving = true; window.history.back(); }
      else window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('popstate', onPop);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('click', onClick, true);
      leaveGuard.active = false;
    };
  }, [hasDirty]);

  // ---------- other toolbar actions ----------

  const download = async () => {
    try {
      const { blob, filename } = await wsApi.downloadSheet(sheetId);
      saveBlob(blob, filename);
      if (hasDirty) toast.info('The file has the saved version. Your unsaved changes are not in it.');
    } catch (e) { toast.error(describeError(e)); }
  };

  const openHistory = async () => {
    setHistory('loading');
    try { setHistory(await wsApi.sheetHistory(sheetId)); } catch (e) { setHistory({ error: e }); }
  };

  const openImport = async () => {
    setImporting(true);
    try { setImportPreview(await wsApi.sheetImportPreview(sheetId)); } catch (e) { toast.error(describeError(e)); } finally { setImporting(false); }
  };

  const remove = async () => {
    try {
      await wsApi.deleteSheet(sheetId);
      leaveGuard.active = false;
      toast.success('Sheet deleted');
      navigate('/workspace/campaigns?tab=sheets');
    } catch (e) { toast.error(describeError(e)); setDeleting(false); }
  };

  const goBack = () => {
    if (hasDirty && !window.confirm(`${leaveGuard.message}\n\nLeave anyway?`)) return;
    leaveGuard.active = false;
    navigate('/workspace/campaigns?tab=sheets');
  };

  const showNote = !!sheet?.formattingLost && !noteDismissed;
  const dismissNote = () => {
    setNoteDismissed(true);
    try { localStorage.setItem(`ws-format-note-${sheetId}`, '1'); } catch { /* private mode */ }
  };

  const lockedHooks = useMemo(() => ({
    // the API stores cell values only, so adding, renaming or deleting sheets here could never be saved
    beforeAddSheet: () => false,
    beforeDeleteSheet: () => false,
    beforeUpdateSheetName: () => false,
  }), []);

  if (loading) return <Loading label="Opening sheet..." />;
  if (loadError || !sheet) return <ErrorState error={loadError} onRetry={() => window.location.reload()} />;

  const unsavedLabel = dirty.size === 0 ? 'No unsaved changes' : `${plural(dirty.size, 'unsaved change')}`;

  return (
    <div className="ws-sheet-page">
      <div className="ws-sheet-head">
        <button className="btn btn-ghost" onClick={goBack}><ArrowLeft size={14} /> Shared sheets</button>
        <div className="ws-sheet-title">
          <h1>{sheet.title}</h1>
          <span className="ws-muted ws-small">
            Owner {sheet.isOwner ? 'you' : sheet.ownerName} · version {sheet.version} · last saved by {sheet.updatedByName ?? sheet.ownerName} {timeAgo(sheet.updatedAt)}
          </span>
        </div>
        <div className="ws-actions">
          {canEdit ? (
            <button className="btn btn-primary" onClick={save} disabled={(dirty.size === 0 && !touched) || saving || reloading} title="Save (Ctrl+S)">
              {saving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />} Save
              <span className="ws-save-count">{unsavedLabel}</span>
            </button>
          ) : <Tag tone="warning">View only</Tag>}
          <button className="btn btn-secondary" onClick={download} title="Download the saved version as .xlsx"><Download size={14} /> Download .xlsx</button>
          {sheet.isOwner && <button className="btn btn-secondary" onClick={() => setSharing(true)}><Share2 size={14} /> Share</button>}
          <button className="btn btn-secondary" onClick={openHistory}><History size={14} /> History</button>
          {!isPM && (
            <button className="btn btn-secondary" onClick={openImport} disabled={importing || hasDirty} title={hasDirty ? 'Save your changes first: the import reads the saved sheet' : 'Turn the rows into campaign drafts'}>
              {importing ? <Loader2 size={14} className="spinner" /> : <FileUp size={14} />} Import rows as campaigns
            </button>
          )}
          {sheet.isOwner && <button className="btn btn-ghost" onClick={() => setDeleting(true)} aria-label="Delete sheet" title="Delete sheet"><Trash2 size={14} /></button>}
        </div>
      </div>

      {remote && (
        <div className="ws-banner ws-banner-info" role="status">
          <RefreshCw size={16} />
          <div>
            {remote.updatedBy === userId ? 'You' : <b>{remote.updatedByName ?? 'Someone'}</b>} saved changes {timeAgo(remote.updatedAt)}
            {remote.updatedBy === userId && ' in another window'}.{hasDirty && ' Your unsaved edits are kept and reapplied where the cells were not changed.'}
          </div>
          <button className="btn btn-primary ws-banner-btn" onClick={() => reload()} disabled={reloading || saving}>
            {reloading ? <Loader2 size={14} className="spinner" /> : <RefreshCw size={14} />} Reload
          </button>
        </div>
      )}
      {!canEdit && <div className="ws-banner ws-banner-warning" role="note"><AlertTriangle size={16} /> <div>{lostEdit ? 'Your edit access was removed. Reload to see the latest.' : 'You can view this sheet but not edit it.'}</div></div>}
      {showNote && (
        <div className="ws-banner ws-banner-neutral" role="note">
          <AlertTriangle size={16} /> <div>Colors and formatting from the original file are not kept. Only values and formulas are stored.</div>
          <button className="modal-close" onClick={dismissNote} aria-label="Dismiss note"><X size={14} /></button>
        </div>
      )}

      <div className="ws-grid">
        <Workbook
          key={grid.key}
          data={grid.sheets}
          onChange={onGridChange}
          allowEdit={canEdit}
          showToolbar={false}
          showFormulaBar
          showSheetTabs
          forceCalculation={grid.needsCalc}
          lang="en"
          cellContextMenu={['copy', 'paste', '|', 'clear']}
          headerContextMenu={['copy', 'paste', '|', 'clear']}
          sheetTabContextMenu={[]}
          hooks={lockedHooks}
        />
      </div>

      {conflicts && (
        <ConflictDialog
          conflicts={conflicts}
          mine={dirtyRef.current}
          busy={reloading || saving}
          onCancel={() => setConflicts(null)}
          onResolve={resolveConflicts}
        />
      )}

      {sharing && (
        <ShareDialog
          sheetId={sheetId}
          ownerId={sheet.ownerId}
          current={sheet.sharedWith ?? []}
          onClose={() => setSharing(false)}
          onSaved={(list: SheetAccess[]) => { setSheet(s => (s ? { ...s, sharedWith: list } : s)); setSharing(false); }}
        />
      )}

      {history && (
        <Modal title="History" onClose={() => setHistory(null)}>
          {history === 'loading' ? <Loading compact /> : 'error' in history ? <ErrorState compact error={history.error} onRetry={openHistory} /> : history.length === 0 ? (
            <p className="ws-muted">Nobody has saved changes yet.</p>
          ) : (
            <ul className="ws-history">
              {history.map(h => (
                <li key={h.version}>
                  <span className="ws-tag ws-tag-neutral">v{h.version}</span>
                  <span><b>{h.userName}</b> saved {plural(h.cellCount, 'cell')}</span>
                  <span className="ws-muted ws-small" title={formatDateTime(h.createdAt)}>{timeAgo(h.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {importPreview && (
        <ImportDialog
          initialPreview={importPreview}
          onClose={() => setImportPreview(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog title="Delete this sheet?" confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDeleting(false)}>
          <p><b>{sheet.title}</b> will be deleted for everyone it is shared with, including its history. This cannot be undone.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

// ---------- 409: choose per cell ----------

const ConflictDialog: React.FC<{
  conflicts: SheetConflict[];
  mine: Edits;
  busy: boolean;
  onCancel: () => void;
  onResolve: (choices: Map<string, 'mine' | 'theirs'>) => void;
}> = ({ conflicts, mine, busy, onCancel, onResolve }) => {
  const [choices, setChoices] = useState<Map<string, 'mine' | 'theirs'>>(new Map());
  const keyOf = (c: SheetConflict) => cellKey(c.sheet, c.row, c.col);
  const all = (choice: 'mine' | 'theirs') => setChoices(new Map(conflicts.map(c => [keyOf(c), choice])));
  const complete = conflicts.every(c => choices.has(keyOf(c)));

  return (
    <Modal
      title="Someone else changed these cells"
      onClose={onCancel}
      closeDisabled={busy}
      wide
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel (keep editing)</button>
          <button className="btn btn-primary" disabled={!complete || busy} onClick={() => onResolve(choices)}>
            {busy && <Loader2 size={14} className="spinner" />} Apply my choices and save
          </button>
        </>
      }
    >
      <p className="ws-muted">
        Nothing was saved. For each cell below, pick whose value should stay. Your other changes are saved along with your choices.
      </p>
      <div className="ws-actions" style={{ marginBottom: 12 }}>
        <button className="btn btn-ghost" onClick={() => all('theirs')}>Keep all theirs</button>
        <button className="btn btn-ghost" onClick={() => all('mine')}>Keep all mine</button>
      </div>
      <div className="table-container">
        <table className="custom-table">
          <thead><tr><th>Cell</th><th>Their value</th><th>Your value</th></tr></thead>
          <tbody>
            {conflicts.map(c => {
              const k = keyOf(c);
              const choice = choices.get(k);
              const myValue = mine.get(k);
              return (
                <tr key={k}>
                  <td><b>{addressOf(c.row, c.col)}</b><div className="ws-muted ws-small">{c.sheet}</div></td>
                  <td>
                    <label className={`ws-choice ${choice === 'theirs' ? 'picked' : ''}`}>
                      <input type="radio" name={k} checked={choice === 'theirs'} onChange={() => setChoices(m => new Map(m).set(k, 'theirs'))} />
                      <span className="ws-choice-value">{show(c.currentValue as Input | null)}</span>
                      <span className="ws-muted ws-small">{c.changedByName}, v{c.changedInVersion}</span>
                    </label>
                  </td>
                  <td>
                    <label className={`ws-choice ${choice === 'mine' ? 'picked' : ''}`}>
                      <input type="radio" name={k} checked={choice === 'mine'} onChange={() => setChoices(m => new Map(m).set(k, 'mine'))} />
                      <span className="ws-choice-value">{show(myValue)}</span>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};
