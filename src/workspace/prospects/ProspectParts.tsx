import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react';
import { toast } from '../../services/toast';
import { describeError } from '../workspaceApi';
import { formatDateTime } from '../ui';
import { useMe } from '../session';
import { ProspectCounts, ProspectFile, StatusFilter, pApi } from './prospectApi';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.xlsx,.xls,.csv';

// ---------- upload ----------

export const FileUploadDropzone: React.FC<{ onUploaded: (file: ProspectFile) => void; compact?: boolean; label?: string }> = ({ onUploaded, compact, label }) => {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { toast.error('Choose an .xlsx, .xls or .csv file.'); return; }
    if (file.size > MAX_BYTES) { toast.error('That file is larger than 10 MB.'); return; }
    setProgress(0);
    try {
      const saved = await pApi.uploadFile(file, setProgress);
      const rows = saved.sheets.reduce((n, s) => n + s.rowCount, 0);
      toast.success(`${rows} rows imported from ${saved.sheets.length} sheets`);
      onUploaded(saved);
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  };

  const busy = progress !== null;
  const hidden = <input ref={input} type="file" accept={ACCEPT} hidden onChange={e => upload(e.target.files?.[0])} />;

  if (compact) {
    return (
      <>
        {hidden}
        <button className="btn btn-secondary" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? <Loader2 size={16} className="spinner" /> : <UploadCloud size={16} />} {busy ? `Uploading ${progress}%` : label ?? 'Upload Excel'}
        </button>
      </>
    );
  }

  return (
    <div
      className={`pr-dropzone ${dragging ? 'dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) upload(e.dataTransfer.files?.[0]); }}
    >
      {hidden}
      <UploadCloud size={32} />
      <strong>Drag and drop this week’s prospect Excel here</strong>
      <span className="ws-muted">.xlsx, .xls or .csv, up to 10 MB. Every row becomes a prospect email.</span>
      <button className="btn btn-primary" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? <Loader2 size={16} className="spinner" /> : <FileSpreadsheet size={16} />} {busy ? `Uploading ${progress}%` : 'Choose Excel file'}
      </button>
      {busy && <div className="pr-progress" role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>}
    </div>
  );
};

// ---------- file and sheet pickers ----------

export const FileSwitcher: React.FC<{ files: ProspectFile[]; selectedId: number; onSelect: (id: number) => void }> = ({ files, selectedId, onSelect }) => (
  <div className="pr-chips" role="group" aria-label="Files">
    {files.map(f => (
      <button key={f.id} className={`ws-chip ${f.id === selectedId ? 'active' : ''}`} aria-pressed={f.id === selectedId} onClick={() => onSelect(f.id)} title={`Uploaded ${formatDateTime(f.uploadedAt)}`}>
        <FileSpreadsheet size={13} /> {f.fileName}
      </button>
    ))}
  </div>
);

export const SheetTabs: React.FC<{ sheets: ProspectFile['sheets']; selectedId: number; onSelect: (id: number) => void }> = ({ sheets, selectedId, onSelect }) => (
  <div className="tabs-container" role="tablist" aria-label="Sheets">
    {sheets.map(s => (
      <button key={s.id} role="tab" aria-selected={s.id === selectedId} className={`tab-btn ${s.id === selectedId ? 'active' : ''}`} onClick={() => onSelect(s.id)}>
        {s.name} <span className="ws-chip-count">{s.rowCount}</span>
      </button>
    ))}
  </div>
);

// ---------- status cards ----------

const CARDS: { filter: StatusFilter; label: string; count: (c: ProspectCounts) => number; tone: string }[] = [
  { filter: 'All', label: 'All rows', count: c => c.all, tone: 'grey' },
  { filter: 'Waiting', label: 'Waiting for approval', count: c => c.waiting, tone: 'amber' },
  { filter: 'NeedsFixing', label: 'Needs fixing', count: c => c.needsFixing, tone: 'amber-dashed' },
  { filter: 'Declined', label: 'Declined', count: c => c.declined, tone: 'red' },
  { filter: 'Approved', label: 'Approved', count: c => c.approved, tone: 'green' },
  { filter: 'Sent', label: 'Sent', count: c => c.sent, tone: 'blue' },
];

export const StatusSummaryCards: React.FC<{ counts: ProspectCounts | null; active: StatusFilter; onSelect: (f: StatusFilter) => void }> = ({ counts, active, onSelect }) => (
  <div className="pr-cards" role="group" aria-label="Filter by status">
    {CARDS.map(c => (
      <button key={c.filter} className={`pr-card pr-card-${c.tone} ${active === c.filter ? 'active' : ''}`} aria-pressed={active === c.filter} onClick={() => onSelect(c.filter)}>
        <span className="pr-card-count">{counts ? c.count(counts) : '–'}</span>
        <span className="pr-card-label">{c.label}</span>
      </button>
    ))}
  </div>
);

// ---------- warning for product managers ----------

/** Shown to ProductManagers only, when a review team has no members. */
export const EmptyTeamsBanner: React.FC<{ refreshKey?: number }> = ({ refreshKey }) => {
  const { isPM } = useMe();
  const [empty, setEmpty] = useState<string[]>([]);

  useEffect(() => {
    if (!isPM) return;
    let stop = false;
    pApi.reviewTeams().then(t => { if (!stop) setEmpty(t.filter(x => x.members.length === 0).map(x => x.team)); }).catch(() => { /* the banner is optional */ });
    return () => { stop = true; };
  }, [isPM, refreshKey]);

  if (!isPM || empty.length === 0) return null;
  return (
    <>
      {empty.map(team => (
        <div key={team} className="ws-banner ws-banner-warning" role="alert">
          <AlertTriangle size={18} />
          <div>{team} has no members, so no one can approve its requests.</div>
        </div>
      ))}
    </>
  );
};
