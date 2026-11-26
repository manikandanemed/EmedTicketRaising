import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { LeadImport } from './marketingApi';
import { ago, fsize, when } from './helpers';
import { ErrorBox, Loading, Spinner } from './ui';

const rel = (iso: string) => { const a = ago(iso); return a === 'just now' ? a : `${a} ago`; };

const Status: React.FC<{ i: LeadImport }> = ({ i }) => {
  if (i.undone) {
    const tip = `Undone${i.undoneByName ? ` by ${i.undoneByName}` : ''}${i.undoneAt ? ` · ${when(i.undoneAt)}` : ''}`;
    return <span className="mk-pill st-Done" title={tip}>Undone</span>;
  }
  if (i.remaining === 0) return <span className="mk-pill st-Done">All worked on / removed</span>;
  return <span className="mk-pill st-Active">Active</span>;
};

/** "Uploaded files": every Excel file uploaded to the queue, with Undo where it can still do something. */
export const ImportHistory: React.FC<{
  items: LeadImport[] | null; loading: boolean; error: unknown; undoingId: string | null;
  onRetry: () => void; onUndo: (i: LeadImport) => void;
}> = ({ items, loading, error, undoingId, onRetry, onUndo }) => (
  <section className="mk-imports" aria-label="Uploaded files">
    <h2>Uploaded files</h2>
    <p className="mk-sub">Every Excel file uploaded to the queue. Undo removes the leads from that file that nobody has started working on.</p>
    {error && !items ? <ErrorBox error={error} onRetry={onRetry} /> : loading && !items ? <Loading label="Loading uploaded files..." /> : (items ?? []).length === 0 ? (
      <div className="mk-tablewrap"><div className="mk-empty"><strong>No files uploaded yet.</strong>Use the Upload Excel button above to add leads to the queue.</div></div>
    ) : (
      <div className="mk-tablewrap">
        <table>
          <thead><tr><th>File</th><th>Uploaded by</th><th>Uploaded</th><th>Leads imported</th><th>Still in queue</th><th>Status</th><th><span className="mk-sr">Action</span></th></tr></thead>
          <tbody>
            {(items ?? []).map(i => (
              <tr key={i.id}>
                <td><div className="mk-file"><FileSpreadsheet aria-hidden /><span>{i.fileName}<div className="mk-muted-sm">{fsize(i.sizeBytes)}</div></span></div></td>
                <td>{i.uploadedByName}</td>
                <td title={when(i.uploadedAt)}>{rel(i.uploadedAt)}</td>
                <td>{i.imported}{(i.skipped > 0 || i.duplicates > 0) && <div className="mk-muted-sm">skipped {i.skipped}, duplicates {i.duplicates}</div>}</td>
                <td>{i.remaining}</td>
                <td><Status i={i} /></td>
                <td style={{ textAlign: 'right' }}>
                  {i.canUndo
                    ? <button className="mk-btn sm danger" disabled={undoingId === i.id} onClick={() => onUndo(i)}>{undoingId === i.id && <Spinner />}Undo ({i.undoable})</button>
                    : <span className="mk-muted-sm" aria-label="No action available">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
