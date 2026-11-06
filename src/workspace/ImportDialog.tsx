import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Download, FileSpreadsheet, FileUp, Loader2, Send, UploadCloud } from 'lucide-react';
import { BulkResult, ImportCommitResult, ImportPreview, ImportRow, describeError, saveBlob, wsApi } from './workspaceApi';
import { Modal, Tag, plural } from './ui';
import { toast } from '../services/toast';

const MAX_BYTES = 5 * 1024 * 1024;
type Filter = 'all' | 'ok' | 'warning' | 'error';

const SEVERITY: Record<ImportRow['severity'], { label: string; tone: 'ok' | 'warning' | 'error' }> = {
  ok: { label: 'OK', tone: 'ok' },
  warning: { label: 'Warning', tone: 'warning' },
  error: { label: 'Error', tone: 'error' },
};

/**
 * Upload -> Preview -> Result. Starts at step 1 with a file, or at step 2 when a preview already exists
 * (for example the one made from a shared sheet).
 */
export default function ImportDialog({ initialPreview, onClose, onImported }: {
  initialPreview?: ImportPreview;
  onClose: () => void;
  onImported?: () => void;
}) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ImportPreview | null>(initialPreview ?? null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initialPreview?.rows.filter(r => r.severity !== 'error').map(r => r.rowNumber)));
  const [filter, setFilter] = useState<Filter>('all');
  const [committed, setCommitted] = useState<ImportCommitResult | null>(null);
  const [submitted, setSubmitted] = useState<BulkResult | null>(null);
  const [busy, setBusy] = useState<'preview' | 'commit' | 'submit' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const step = committed ? 3 : preview ? 2 : 1;

  const startPreview = async (file: File) => {
    setBusy('preview');
    setError(null);
    try {
      const p = await wsApi.importPreview(file);
      setPreview(p);
      setSelected(new Set(p.rows.filter(r => r.severity !== 'error').map(r => r.rowNumber)));
      setFilter('all');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(null);
    }
  };

  const commit = async () => {
    if (!preview) return;
    setBusy('commit');
    setError(null);
    try {
      const result = await wsApi.importCommit(preview.previewToken, [...selected].sort((a, b) => a - b));
      setCommitted(result);
      onImported?.();
      toast.success(`${plural(result.importedRows, 'draft')} created`);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(null);
    }
  };

  const okIds = useMemo(() => {
    if (!preview || !committed) return [];
    const ok = new Set(preview.rows.filter(r => r.severity === 'ok').map(r => r.rowNumber));
    return committed.campaigns.filter(c => ok.has(c.rowNumber)).map(c => c.campaignId);
  }, [preview, committed]);

  const submitOk = async () => {
    setBusy('submit');
    setError(null);
    try {
      const result = await wsApi.bulkSubmit(okIds);
      setSubmitted(result);
      onImported?.();
      if (result.failed === 0) toast.success(`${result.succeeded} submitted for approval`);
      else toast.info(`${result.succeeded} submitted, ${result.failed} failed`);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal title="Import campaign mails from Excel" onClose={onClose} closeDisabled={busy !== null} wide>
      <ol className="ws-stepper" aria-label="Progress">
        {['Upload', 'Preview', 'Result'].map((label, i) => (
          <li key={label} className={step === i + 1 ? 'current' : step > i + 1 ? 'done' : ''} aria-current={step === i + 1 ? 'step' : undefined}>
            <span>{step > i + 1 ? <Check size={12} /> : i + 1}</span>{label}
          </li>
        ))}
      </ol>

      {error && <div className="ws-banner ws-banner-error" role="alert"><AlertTriangle size={16} /> <div>{error}</div></div>}

      {step === 1 && <UploadStep busy={busy === 'preview'} onFile={startPreview} onError={setError} />}

      {step === 2 && preview && (
        <PreviewStep
          preview={preview}
          selected={selected}
          setSelected={setSelected}
          filter={filter}
          setFilter={setFilter}
          busy={busy === 'commit'}
          canGoBack={!initialPreview}
          onBack={() => { setPreview(null); setError(null); }}
          onCommit={commit}
          onCancel={onClose}
        />
      )}

      {step === 3 && committed && (
        <div className="ws-import-result">
          <CheckCircle2 size={40} className="ws-ok-icon" />
          <h3>{plural(committed.importedRows, 'draft')} created</h3>
          <p className="ws-muted">
            From <b>{committed.fileName}</b>.
            {committed.skippedRows > 0 && <> {plural(committed.skippedRows, 'row')} left out.</>}
            {' '}Rows marked Error need fixing before they can be sent for approval.
          </p>
          {submitted && (
            <div className={`ws-result ${submitted.failed ? 'has-errors' : 'all-ok'}`} role="status">
              <div className="ws-result-head">
                {submitted.failed ? <AlertTriangle size={16} /> : <Check size={16} />}
                <span><b>{submitted.succeeded}</b> submitted for approval{submitted.failed > 0 && <>, <b>{submitted.failed}</b> failed: {[...new Set(submitted.items.filter(i => !i.success).map(i => i.message.replace(/\.$/, '')))].slice(0, 3).join('; ')}</>}</span>
              </div>
            </div>
          )}
          <div className="ws-actions ws-center">
            <button className="btn btn-primary" onClick={() => { onClose(); navigate(`/workspace/campaigns?tab=mails&importId=${committed.importId}`); }}>
              <FileUp size={14} /> Open drafts
            </button>
            {!submitted && (
              <button className="btn btn-secondary" onClick={submitOk} disabled={busy !== null || okIds.length === 0} title={okIds.length === 0 ? 'No imported row is free of errors and warnings' : undefined}>
                {busy === 'submit' ? <Loader2 size={14} className="spinner" /> : <Send size={14} />} Submit OK rows for approval ({okIds.length})
              </button>
            )}
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------- step 1 ----------

const UploadStep: React.FC<{ busy: boolean; onFile: (f: File) => void; onError: (m: string | null) => void }> = ({ busy, onFile, onError }) => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) { onError('Only .xlsx files can be imported.'); return; }
    if (file.size > MAX_BYTES) { onError('The file is too large. The limit is 5 MB.'); return; }
    onError(null);
    onFile(file);
  };

  const template = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await wsApi.importTemplate();
      saveBlob(blob, filename);
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div
        className={`ws-dropzone ${over ? 'over' : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
      >
        {busy ? <><Loader2 size={30} className="spinner" /><strong>Reading the file...</strong></> : (
          <>
            <UploadCloud size={30} />
            <strong>Drag an Excel file here</strong>
            <span className="ws-muted">.xlsx only, up to 5 MB and 500 rows</span>
            <button className="btn btn-primary" onClick={() => input.current?.click()}>Browse files</button>
          </>
        )}
        <input ref={input} type="file" hidden accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={e => { take(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <p className="ws-muted ws-small ws-center">
        Nothing is saved until you confirm on the next step.{' '}
        <button className="ws-link" onClick={template} disabled={downloading}><Download size={12} /> Download template</button>
      </p>
      <p className="ws-muted ws-small ws-center">The template has the columns Campaign name, Client, Contact person, Client email, Subject and Message. A prospect workbook (drafts sheet plus prospect list) is also recognised.</p>
    </div>
  );
};

// ---------- step 2 ----------

const PreviewStep: React.FC<{
  preview: ImportPreview;
  selected: Set<number>;
  setSelected: React.Dispatch<React.SetStateAction<Set<number>>>;
  filter: Filter;
  setFilter: (f: Filter) => void;
  busy: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onCommit: () => void;
  onCancel: () => void;
}> = ({ preview, selected, setSelected, filter, setFilter, busy, canGoBack, onBack, onCommit, onCancel }) => {
  const rows = preview.rows.filter(r => filter === 'all' || r.severity === filter);
  const allShownSelected = rows.length > 0 && rows.every(r => selected.has(r.rowNumber));
  const chosenErrors = preview.rows.filter(r => r.severity === 'error' && selected.has(r.rowNumber)).length;

  const toggle = (n: number) => setSelected(prev => { const next = new Set(prev); if (!next.delete(n)) next.add(n); return next; });
  const toggleAll = () => setSelected(prev => {
    const next = new Set(prev);
    rows.forEach(r => (allShownSelected ? next.delete(r.rowNumber) : next.add(r.rowNumber)));
    return next;
  });

  const chips: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: 'All', n: preview.totalRows },
    { key: 'ok', label: 'OK', n: preview.okRows },
    { key: 'warning', label: 'Warnings', n: preview.warningRows },
    { key: 'error', label: 'Errors', n: preview.errorRows },
  ];

  return (
    <div>
      <p className="ws-muted ws-small">
        <FileSpreadsheet size={13} /> <b>{preview.fileName}</b> · {preview.format === 'prospect_workbook' ? 'prospect workbook' : 'simple template'} · {plural(preview.totalRows, 'row')}
      </p>
      <div className="ws-people-tabs" role="tablist" aria-label="Filter rows">
        {chips.map(c => (
          <button key={c.key} role="tab" aria-selected={filter === c.key} className={`ws-chip ${filter === c.key ? 'active' : ''}`} onClick={() => setFilter(c.key)}>
            {c.label} <span className="ws-chip-count">{c.n}</span>
          </button>
        ))}
      </div>

      <div className="table-container ws-import-table">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allShownSelected} onChange={toggleAll} aria-label="Select all shown rows" /></th>
              <th>Row</th><th>Client</th><th>Contact</th><th>Email</th><th>Subject</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="ws-muted" style={{ textAlign: 'center', padding: 24 }}>No rows in this filter.</td></tr>}
            {rows.map(r => {
              const sev = SEVERITY[r.severity];
              return (
                <tr key={r.rowNumber} className={selected.has(r.rowNumber) ? 'ws-row-selected' : ''}>
                  <td><input type="checkbox" checked={selected.has(r.rowNumber)} onChange={() => toggle(r.rowNumber)} aria-label={`Import row ${r.rowNumber}`} /></td>
                  <td>{r.rowNumber}</td>
                  <td>{r.clientName || <span className="ws-muted">—</span>}</td>
                  <td>{r.contactName || <span className="ws-muted">—</span>}</td>
                  <td>{r.clientEmail || <span className="ws-field-error">missing</span>}</td>
                  <td className="ws-cell-subject" title={r.subject}>{r.subject || <span className="ws-muted">—</span>}</td>
                  <td>
                    <Tag tone={sev.tone}>{sev.label}</Tag>
                    {r.flags.length > 0 && (
                      <ul className="ws-flag-list">
                        {r.flags.map(f => <li key={f.code} className={f.level}>{f.message}</li>)}
                      </ul>
                    )}
                    {r.severity === 'error' && selected.has(r.rowNumber) && <div className="ws-small ws-muted">Will import as a draft; fix it before submitting.</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {chosenErrors > 0 && (
        <div className="ws-banner ws-banner-warning" role="note">
          <AlertTriangle size={16} />
          <div>{plural(chosenErrors, 'selected row')} with errors will import as drafts. They cannot be sent for approval until the problems are fixed.</div>
        </div>
      )}

      <div className="ws-modal-footer">
        {canGoBack ? <button className="btn btn-secondary" onClick={onBack} disabled={busy}><ArrowLeft size={14} /> Choose another file</button>
          : <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>}
        <button className="btn btn-primary" onClick={onCommit} disabled={busy || selected.size === 0}>
          {busy && <Loader2 size={14} className="spinner" />} Import {plural(selected.size, 'row')}
        </button>
      </div>
    </div>
  );
};
