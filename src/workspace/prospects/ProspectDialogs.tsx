import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from '../../services/toast';
import { WsError, describeError } from '../workspaceApi';
import { Modal } from '../ui';
import { ProspectRow, pApi } from './prospectApi';

// ---------- columns ----------

export const ColumnPickerDialog: React.FC<{
  headers: string[];
  hidden: string[];
  onSave: (hidden: string[]) => Promise<void>;
  onClose: () => void;
}> = ({ headers, hidden, onSave, onClose }) => {
  const [visible, setVisible] = useState(() => new Set(headers.filter(h => !hidden.includes(h))));
  const [busy, setBusy] = useState(false);

  const toggle = (h: string) => setVisible(prev => {
    const next = new Set(prev);
    if (next.has(h)) next.delete(h); else next.add(h);
    return next;
  });

  const save = async () => {
    setBusy(true);
    try {
      await onSave(headers.filter(h => !visible.has(h)));
      onClose();
    } catch (e) {
      toast.error(describeError(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Choose columns"
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy || visible.size === 0}>
            {busy && <Loader2 size={14} className="spinner" />} Apply
          </button>
        </>
      }
    >
      <div className="pr-col-tools">
        <button className="ws-link" onClick={() => setVisible(new Set(headers))}>Select all</button>
        <button className="ws-link" onClick={() => setVisible(new Set())}>Clear all</button>
        <span className="ws-muted">{visible.size} of {headers.length} selected</span>
      </div>
      <div className="pr-col-list">
        {headers.map(h => (
          <label key={h} className="ws-check">
            <input type="checkbox" checked={visible.has(h)} onChange={() => toggle(h)} /> {h}
          </label>
        ))}
      </div>
      {visible.size === 0 && <p className="ws-field-error" role="alert">Keep at least one column.</p>}
    </Modal>
  );
};

// ---------- edit ----------

const isLong = (v: string) => v.length > 80 || v.includes('\n');

export const EditRowDialog: React.FC<{
  row: ProspectRow;
  headers: string[];
  onSaved: (row: ProspectRow) => void;
  onClose: () => void;
}> = ({ row, headers, onSaved, onClose }) => {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(headers.map(h => [h, row.cells[h] ?? ''])));
  const [busy, setBusy] = useState(false);
  const changed = headers.filter(h => values[h] !== (row.cells[h] ?? ''));

  const save = async () => {
    if (changed.length === 0) { onClose(); return; }
    setBusy(true);
    try {
      const updated = await pApi.updateRow(row.id, Object.fromEntries(changed.map(h => [h, values[h]])), row.rowVersion);
      if (updated.status === 'Draft' && row.status !== 'Draft') toast.success('Saved. The content changed, so send it for approval again.');
      else toast.success('Row saved.');
      onSaved(updated);
    } catch (e) {
      toast.error(e instanceof WsError && e.status === 409
        ? 'This row was changed by someone else or is already sent. Reload and try again.'
        : describeError(e));
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Edit row ${row.rowIndex}`}
      onClose={onClose}
      closeDisabled={busy}
      wide
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy && <Loader2 size={14} className="spinner" />} Save
          </button>
        </>
      }
    >
      <div className="pr-edit-grid">
        {headers.map((h, i) => {
          const id = `pr-edit-${i}`;
          const long = isLong(row.cells[h] ?? '') || isLong(values[h]);
          return (
            <div key={h} className={`form-group ${long ? 'pr-wide' : ''}`}>
              <label htmlFor={id}>{h}</label>
              {long
                ? <textarea id={id} className="form-input" rows={5} value={values[h]} onChange={e => setValues(v => ({ ...v, [h]: e.target.value }))} />
                : <input id={id} className="form-input" value={values[h]} onChange={e => setValues(v => ({ ...v, [h]: e.target.value }))} />}
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

// ---------- comment (ask for fixes / decline) ----------

export const CommentDialog: React.FC<{
  title: string;
  confirmLabel: string;
  danger?: boolean;
  onSubmit: (comment: string) => Promise<void>;
  onClose: () => void;
}> = ({ title, confirmLabel, danger, onSubmit, onClose }) => {
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const missing = comment.trim() === '';

  const submit = async () => {
    setTouched(true);
    if (missing) return;
    setBusy(true);
    try { await onSubmit(comment.trim()); } catch (e) { toast.error(describeError(e)); setBusy(false); }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={submit} disabled={busy}>
            {busy && <Loader2 size={14} className="spinner" />} {confirmLabel}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label htmlFor="pr-comment">Comment (required)</label>
        <textarea
          id="pr-comment"
          className="form-input"
          rows={5}
          autoFocus
          value={comment}
          onChange={e => setComment(e.target.value)}
          aria-invalid={touched && missing}
          placeholder="Tell Marketing what is wrong"
        />
        {touched && missing && <span className="ws-field-error" role="alert">Please write a comment.</span>}
      </div>
    </Modal>
  );
};
