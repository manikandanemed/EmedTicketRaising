import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Columns3, Download, Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from '../../services/toast';
import { useDebounce } from '../../hooks/useDebounce';
import { describeError, saveBlob } from '../workspaceApi';
import { ConfirmDialog, EmptyState, ErrorState, Loading, formatDateTime, useLoad } from '../ui';
import { ProspectRow, ProspectRows, StatusFilter, TransitionAction, TransitionResult, pApi } from './prospectApi';
import { refreshBadge, useProspectAccess } from './access';
import { EmptyTeamsBanner, FileSwitcher, FileUploadDropzone, SheetTabs, StatusSummaryCards } from './ProspectParts';
import ProspectTable from './ProspectTable';
import { ColumnPickerDialog, CommentDialog, EditRowDialog } from './ProspectDialogs';
import MailReviewDialog from './MailReviewDialog';
import { rowTitle } from './status';
import { useMe } from '../session';

const PAGE_SIZE = 50;

export default function ProspectEmails() {
  const { me, loaded, unavailable } = useProspectAccess();
  const { isPM } = useMe();
  if (!loaded) return <Loading />;
  if (unavailable || !me || !(me.isMarketing || me.teams.length > 0 || isPM)) return <Navigate to="/workspace" replace />;
  return <ProspectEmailsPage isMarketing={me.isMarketing} />;
}

type Dialog =
  | { kind: 'columns' }
  | { kind: 'edit'; row: ProspectRow }
  | { kind: 'delete'; row: ProspectRow }
  | { kind: 'removeFile' }
  | { kind: 'mail'; rowId: number; send: boolean }
  | { kind: 'comment'; row: ProspectRow; action: 'RequestFixes' | 'Decline' };

function ProspectEmailsPage({ isMarketing }: { isMarketing: boolean }) {
  const files = useLoad(() => pApi.files(), []);
  const [fileId, setFileId] = useState<number | null>(null);
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusFilter>('All');
  const [searchText, setSearchText] = useState('');
  const search = useDebounce(searchText, 300);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busyRowId, setBusyRowId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [teamsKey, setTeamsKey] = useState(0);

  const list = files.data ?? [];
  const file = list.find(f => f.id === fileId) ?? list[0];
  const sheet = file?.sheets.find(s => s.id === sheetId) ?? file?.sheets[0];

  const rows = useLoad<ProspectRows | null>(
    () => (sheet ? pApi.rows(sheet.id, { status, search, page, pageSize: PAGE_SIZE }) : Promise.resolve(null)),
    [sheet?.id, status, search, page],
  );
  const prefs = useLoad(() => (sheet ? pApi.columnPreferences(sheet.id) : Promise.resolve(null)), [sheet?.id]);

  const headers = rows.data?.headers ?? [];
  const hidden = prefs.data?.hiddenColumns ?? [];
  const visible = headers.filter(h => !hidden.includes(h));
  const total = rows.data?.total ?? 0;

  // search typing goes back to page 1 once the debounced value settles; a deleted last row of the last page steps back
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { if (!rows.loading && rows.data && rows.data.rows.length === 0 && rows.data.total > 0 && page > 1) setPage(p => p - 1); }, [rows.loading, rows.data, page]);

  const refresh = () => { rows.reload(); files.reload(); refreshBadge(); setTeamsKey(k => k + 1); };

  /** Updates the row from a transition response, then refreshes counts, the badge and the filtered list. */
  const applyTransition = (result: TransitionResult) => {
    rows.setData(d => d && {
      ...d,
      rows: d.rows.map(r => r.id !== result.rowId ? r : {
        ...r,
        status: result.approval.status,
        team: result.approval.reviewTeam,
        round: result.approval.round,
        rowVersion: result.rowVersion,
        allowedActions: result.allowedActions,
      }),
    });
    rows.reload();
    refreshBadge();
  };

  const runAction = async (row: ProspectRow, action: TransitionAction) => {
    if (action === 'Send') { setDialog({ kind: 'mail', rowId: row.id, send: true }); return; }
    if (action === 'RequestFixes' || action === 'Decline') { setDialog({ kind: 'comment', row, action }); return; }
    setBusyRowId(row.id);
    try {
      applyTransition(await pApi.transition(row.id, { action }));
      toast.success(action === 'Approve' ? 'Approved.' : 'Marked as sent.');
    } catch (e) {
      toast.error(describeError(e));
      rows.reload(); // the row may have changed under us (409): show the current state
    } finally {
      setBusyRowId(null);
    }
  };

  const saveColumns = async (hiddenColumns: string[]) => {
    if (!sheet) return;
    const saved = await pApi.saveColumnPreferences(sheet.id, hiddenColumns);
    prefs.setData(saved);
  };

  const downloadSheet = async () => {
    if (!sheet) return;
    setExporting(true);
    try {
      const { blob, filename } = await pApi.exportSheet(sheet.id, {
        columns: visible.length === headers.length ? undefined : visible,
        status,
        search,
      });
      saveBlob(blob, filename);
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setExporting(false);
    }
  };

  const confirmDeleteRow = async (row: ProspectRow) => {
    try {
      await pApi.deleteRow(row.id);
      toast.success('Row deleted.');
      setDialog(null);
      refresh();
    } catch (e) {
      toast.error(describeError(e));
      setDialog(null);
    }
  };

  const confirmRemoveFile = async () => {
    if (!file) return;
    setRemoving(true);
    try {
      await pApi.deleteFile(file.id);
      toast.success('File removed.');
      setFileId(null); setSheetId(null); setDialog(null);
      refresh();
    } catch (e) {
      toast.error(describeError(e));
      setDialog(null);
    } finally {
      setRemoving(false);
    }
  };

  const selectStatus = (s: StatusFilter) => { setStatus(s); setPage(1); };
  const selectSheet = (id: number) => { setSheetId(id); setStatus('All'); setPage(1); };
  const selectFile = (id: number) => { setFileId(id); setSheetId(null); setStatus('All'); setPage(1); };
  const onUploaded = (saved: { id: number; sheets: { id: number }[] }) => {
    setFileId(saved.id); setSheetId(saved.sheets[0]?.id ?? null); setStatus('All'); setPage(1);
    files.reload();
  };

  return (
    <div className="pr-page">
      <div className="ws-title-row">
        <div>
          <h1>Prospect emails</h1>
          <p className="ws-muted">Marketing sends each email to a review team to check. Fix, resend and mark as sent once approved.</p>
        </div>
      </div>

      <EmptyTeamsBanner refreshKey={teamsKey} />

      {files.loading ? <Loading label="Loading files..." />
        : files.error ? <ErrorState error={files.error} onRetry={files.reload} />
        : !file ? (
          isMarketing
            ? <FileUploadDropzone onUploaded={onUploaded} />
            : <EmptyState title="Marketing hasn’t uploaded a file yet." />
        ) : (
          <>
            <div className="ws-toolbar">
              <div>
                <h3>{file.fileName}</h3>
                <p className="ws-muted ws-small">uploaded {formatDateTime(file.uploadedAt)}{file.uploadedByName && ` by ${file.uploadedByName}`}</p>
              </div>
              {isMarketing && (
                <div className="ws-actions">
                  <FileUploadDropzone compact onUploaded={onUploaded} />
                  <button className="btn btn-secondary pr-danger" onClick={() => setDialog({ kind: 'removeFile' })}><Trash2 size={16} /> Remove file</button>
                </div>
              )}
            </div>

            {list.length > 1 && <FileSwitcher files={list} selectedId={file.id} onSelect={selectFile} />}
            {sheet && <SheetTabs sheets={file.sheets} selectedId={sheet.id} onSelect={selectSheet} />}
            <StatusSummaryCards counts={rows.data?.counts ?? null} active={status} onSelect={selectStatus} />

            <div className="pr-toolbar">
              <div className="pr-search">
                <Search size={15} />
                <input className="form-input" placeholder="Search all columns" aria-label="Search rows" value={searchText} onChange={e => setSearchText(e.target.value)} />
              </div>
              <div className="ws-actions">
                <button className="btn btn-secondary" onClick={() => setDialog({ kind: 'columns' })} disabled={headers.length === 0}>
                  <Columns3 size={16} /> Columns: {visible.length} of {headers.length}
                </button>
                <button className="btn btn-primary" onClick={downloadSheet} disabled={total === 0 || exporting || visible.length === 0}>
                  {exporting ? <Loader2 size={16} className="spinner" /> : <Download size={16} />} Download {total} rows (.xlsx)
                </button>
              </div>
            </div>

            {rows.error
              ? <ErrorState error={rows.error} onRetry={rows.reload} />
              : (
                <ProspectTable
                  headers={visible}
                  rows={rows.data?.rows ?? []}
                  loading={rows.loading}
                  isMarketing={isMarketing}
                  busyRowId={busyRowId}
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onPage={setPage}
                  onAction={runAction}
                  onEdit={row => setDialog({ kind: 'edit', row })}
                  onDelete={row => setDialog({ kind: 'delete', row })}
                  onMail={row => setDialog({ kind: 'mail', rowId: row.id, send: false })}
                />
              )}
          </>
        )}

      {dialog?.kind === 'columns' && <ColumnPickerDialog headers={headers} hidden={hidden} onSave={saveColumns} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && (
        <EditRowDialog
          row={dialog.row}
          headers={headers}
          onClose={() => setDialog(null)}
          onSaved={updated => {
            rows.setData(d => d && { ...d, rows: d.rows.map(r => r.id === updated.id ? updated : r) });
            setDialog(null);
            refresh();
          }}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmDialog title="Delete row" confirmLabel="Delete" danger onConfirm={() => confirmDeleteRow(dialog.row)} onClose={() => setDialog(null)}>
          <p>Delete the row for <strong>{rowTitle(dialog.row.cells)}</strong>? This can’t be undone.</p>
        </ConfirmDialog>
      )}
      {dialog?.kind === 'removeFile' && file && (
        <ConfirmDialog title="Remove file" confirmLabel="Remove file" danger busy={removing} onConfirm={confirmRemoveFile} onClose={() => setDialog(null)}>
          <p>Remove <strong>{file.fileName}</strong> and all of its rows and approvals from the list?</p>
        </ConfirmDialog>
      )}
      {dialog?.kind === 'mail' && (
        <MailReviewDialog rowId={dialog.rowId} sendMode={dialog.send} onClose={() => setDialog(null)} onChanged={applyTransition} />
      )}
      {dialog?.kind === 'comment' && (
        <CommentDialog
          title={dialog.action === 'Decline' ? 'Decline this email' : 'Ask for fixes'}
          confirmLabel={dialog.action === 'Decline' ? 'Decline' : 'Ask for fixes'}
          danger={dialog.action === 'Decline'}
          onClose={() => setDialog(null)}
          onSubmit={async comment => {
            applyTransition(await pApi.transition(dialog.row.id, { action: dialog.action, comment }));
            toast.success(dialog.action === 'Decline' ? 'Declined.' : 'Fixes requested.');
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
