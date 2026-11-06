import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FilePlus2, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { SheetListItem, describeError, wsApi } from './workspaceApi';
import { AvatarStack, EmptyState, ErrorState, Loading, Modal, Tag, timeAgo, useLoad } from './ui';
import { toast } from '../services/toast';

const MAX_BYTES = 10 * 1024 * 1024;

/** Asks for a title and opens the new blank sheet. */
export const NewSheetDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    if (!title.trim()) { setError('Give the sheet a title.'); return; }
    setBusy(true);
    setError(null);
    try {
      const sheet = await wsApi.createBlankSheet(title.trim());
      toast.success('Sheet created');
      navigate(`/workspace/sheets/${sheet.id}`);
    } catch (e) {
      setError(describeError(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New shared sheet"
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={create} disabled={busy}>{busy && <Loader2 size={14} className="spinner" />} Create sheet</button>
        </>
      }
    >
      {error && <div className="ws-banner ws-banner-error" role="alert">{error}</div>}
      <div className="form-group">
        <label htmlFor="ns-title">Title</label>
        <input id="ns-title" className="form-input" value={title} maxLength={200} autoFocus onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') create(); }} />
      </div>
      <p className="ws-muted ws-small">You can share it with colleagues from the sheet page.</p>
    </Modal>
  );
};

export default function SheetsTab({ refreshKey }: { refreshKey: number }) {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { data, error, loading, reload } = useLoad<SheetListItem[]>(() => wsApi.listSheets(), [refreshKey]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) { toast.error('Only .xlsx files can be uploaded.'); return; }
    if (file.size > MAX_BYTES) { toast.error('The file is too large. The limit is 10 MB.'); return; }
    setUploading(true);
    try {
      const sheet = await wsApi.uploadSheet(file);
      toast.success('Sheet uploaded');
      navigate(`/workspace/sheets/${sheet.id}`);
    } catch (e) {
      toast.error(describeError(e));
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="ws-toolbar">
        <p className="ws-muted">Edit an Excel sheet together with colleagues. Everyone with access sees each other's saved changes.</p>
        <div className="ws-actions">
          <button className="btn btn-secondary" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? <Loader2 size={14} className="spinner" /> : <Upload size={14} />} Upload Excel
          </button>
          <button className="btn btn-primary" onClick={() => setCreating(true)}><FilePlus2 size={14} /> New blank sheet</button>
          <input ref={fileInput} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </div>

      {loading ? <Loading label="Loading sheets..." />
        : error || !data ? <ErrorState error={error} onRetry={reload} />
        : data.length === 0 ? (
          <EmptyState icon={<FileSpreadsheet size={26} />} title="No shared sheets yet" text="Upload an Excel file or start a blank sheet, then share it with the people who should edit it." />
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead><tr><th>Title</th><th>Owner</th><th>Shared with</th><th>Last updated</th><th>Your access</th></tr></thead>
              <tbody>
                {data.map(s => (
                  <tr key={s.id}>
                    <td><Link className="ws-link" to={`/workspace/sheets/${s.id}`}><FileSpreadsheet size={14} /> {s.title}</Link></td>
                    <td>{s.isOwner ? 'You' : s.ownerName}</td>
                    <td>{(s.sharedWith?.length ?? 0) === 0 ? <span className="ws-muted">Only the owner</span> : <AvatarStack names={s.sharedWith!.map(a => a.userName)} />}</td>
                    <td>{s.updatedByName ? <>{s.updatedByName} · </> : null}<span className="ws-muted">{timeAgo(s.updatedAt)}</span></td>
                    <td>{s.isOwner ? <Tag tone="info">Owner</Tag> : s.canEdit ? <Tag tone="ok">Can edit</Tag> : <Tag>View only</Tag>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {creating && <NewSheetDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
