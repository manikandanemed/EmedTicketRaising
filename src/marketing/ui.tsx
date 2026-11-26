import React, { useEffect, useRef } from 'react';
import { Attachment, HistoryEntry, ImportedField, NO_ACCESS, Temperature, describeError, isForbidden } from './marketingApi';
import { fsize, linkify, openAttachment, tempColor, when } from './helpers';

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
  <div className="mk-empty" role="status"><strong>{label}</strong></div>
);

export const ErrorBox: React.FC<{ error: unknown; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="mk-empty" role="alert">
    <strong>{isForbidden(error) ? NO_ACCESS : 'Something went wrong'}</strong>
    {!isForbidden(error) && <div>{describeError(error)}</div>}
    {onRetry && !isForbidden(error) && <p><button className="mk-btn" onClick={onRetry}>Try again</button></p>}
  </div>
);

export const StagePill: React.FC<{ stage: string; children?: React.ReactNode; large?: boolean }> = ({ stage, children, large }) => (
  <span className={`mk-pill st-${stage}`} style={large ? { fontSize: 13 } : undefined}>{children ?? stage}</span>
);

export const ScoreBar: React.FC<{ score: number; temperature: Temperature }> = ({ score, temperature }) => (
  <span className="mk-score" title={temperature}>
    {score}
    <i style={{ ['--w' as string]: `${score}%`, ['--c' as string]: tempColor(temperature) } as React.CSSProperties} />
  </span>
);

export const Clip: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m21 11-8.6 8.6a5 5 0 0 1-7-7l8.5-8.6a3.3 3.3 0 0 1 4.7 4.7L10 17.3a1.7 1.7 0 0 1-2.4-2.4l7.9-7.8" />
  </svg>
);

/** A native <dialog> opened modally: Esc closes it, focus is trapped, and a click on the backdrop closes it. */
export const Dlg: React.FC<{ label: string; onClose: () => void; className?: string; children: React.ReactNode }> = ({ label, onClose, className = '', children }) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => { if (d?.open) d.close(); };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`mk-dlg ${className}`}
      aria-label={label}
      onClose={onClose}
      onCancel={e => { e.preventDefault(); onClose(); }}
      onMouseDown={e => { if (e.target === ref.current) onClose(); }}
    >
      {children}
    </dialog>
  );
};

export const FileList: React.FC<{ files: Attachment[] }> = ({ files }) =>
  files.length ? (
    <ul className="mk-files">
      {files.map(f => (
        <li key={f.id}>
          <a
            className="mk-flink"
            href="#"
            title={`Open ${f.fileName}`}
            onClick={e => { e.preventDefault(); openAttachment(f); }}
          >
            <Clip /><span className="nm">{f.fileName}</span><span className="sz">({fsize(f.size)})</span>
          </a>
          {f.signedBy && <span className="mk-sig-tag" title={f.signedAt ? `Signed on ${when(f.signedAt)}` : undefined}>✓ Signed by {f.signedBy}</span>}
        </li>
      ))}
    </ul>
  ) : null;

export const HistoryItem: React.FC<{ n: HistoryEntry }> = ({ n }) => (
  <li className={n.kind === 'Email sent' ? 'is-mail' : n.kind === 'Reply received' ? 'is-reply' : ''}>
    <span className="k">{n.kind}</span><time>{when(n.occurredAt)}</time>
    {n.subject && <p><strong>{linkify(n.subject)}</strong></p>}
    {n.text && <p>{linkify(n.text)}</p>}
    {n.body && <details><summary>Show message</summary><div className="mk-mailbody">{linkify(n.body)}</div></details>}
    <FileList files={n.attachments ?? []} />
  </li>
);

const isUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);
const looksLikeWebsite = (v: string) => /^(www\.)\S+\.\S+$/i.test(v);

/**
 * Every column of the imported Excel row, rendered from whatever the backend sends (original headers, sheet order),
 * so new or custom columns show up without code changes. Blank values are hidden and values already shown
 * elsewhere (`skipValues`) are not repeated.
 */
export const ImportedData: React.FC<{ fields?: ImportedField[]; skipValues?: (string | null | undefined)[] }> = ({ fields, skipValues = [] }) => {
  const skip = new Set(skipValues.map(v => (v ?? '').trim().toLowerCase()).filter(Boolean));
  const seen = new Set<string>();
  const rows = (fields ?? []).filter(f => {
    const value = (f.value ?? '').trim();
    if (!value || skip.has(value.toLowerCase())) return false;
    const key = `${f.name}\u0000${value}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (rows.length === 0) return null;
  return (
    <section aria-label="Imported Excel data">
      <h2 style={{ margin: '0 0 8px', fontSize: 15 }}>Imported data</h2>
      <dl className="mk-facts mk-imported">
        {rows.map((f, i) => {
          const v = f.value.trim();
          const long = v.length > 80 || v.includes('\n');
          return (
            <div key={`${f.name}-${i}`} className={long ? 'wide' : undefined}>
              <dt>{f.name}</dt>
              <dd>
                {isUrl(v) ? <a href={v} target="_blank" rel="noopener noreferrer">{v}</a>
                  : looksLikeWebsite(v) ? <a href={`https://${v}`} target="_blank" rel="noopener noreferrer">{v}</a>
                  : v}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
};

export const Spinner: React.FC = () => <span className="mk-spin" aria-hidden />;

/** A small yes/no confirmation in the same dialog style as the rest of the page. */
export const ConfirmDlg: React.FC<{
  label: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean;
  onConfirm: () => void; onCancel: () => void;
}> = ({ label, message, confirmLabel, danger, busy, onConfirm, onCancel }) => (
  <Dlg label={label} onClose={() => { if (!busy) onCancel(); }}>
    <div className="mk-dlg-body"><h2 style={{ fontSize: 18, margin: 0 }}>{label}</h2><p style={{ margin: 0 }}>{message}</p></div>
    <div className="mk-dlg-foot">
      <button className="mk-btn" onClick={onCancel} disabled={busy}>Cancel</button>
      <button className={`mk-btn ${danger ? 'danger solid' : 'primary'}`} autoFocus onClick={onConfirm} disabled={busy}>{busy && <Spinner />}{confirmLabel}</button>
    </div>
  </Dlg>
);
