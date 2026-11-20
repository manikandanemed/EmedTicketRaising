import React from 'react';
import { ChevronLeft, ChevronRight, Mail, Pencil, Trash2 } from 'lucide-react';
import { ProspectRow, TransitionAction } from './prospectApi';
import { StatusDropdown, linkify } from './status';

interface Props {
  headers: string[];
  rows: ProspectRow[];
  loading: boolean;
  isMarketing: boolean;
  busyRowId: number | null;
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onAction: (row: ProspectRow, action: TransitionAction) => void;
  onEdit: (row: ProspectRow) => void;
  onDelete: (row: ProspectRow) => void;
  onMail: (row: ProspectRow) => void;
}

const SKELETON_ROWS = 6;

export default function ProspectTable({ headers, rows, loading, isMarketing, busyRowId, page, pageSize, total, onPage, onAction, onEdit, onDelete, onMail }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const colSpan = headers.length + 2;

  return (
    <>
      <div className="table-container pr-table-wrap">
        <table className="custom-table pr-table">
          <thead>
            <tr>
              {headers.map(h => <th key={h}>{h}</th>)}
              <th>Approval</th>
              <th className="pr-sticky">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <tr key={i} aria-hidden="true">
                  <td colSpan={colSpan}><div className="pr-skeleton" /></td>
                </tr>
              ))
              : rows.length === 0
                ? <tr><td colSpan={colSpan} className="pr-no-rows">No rows match.</td></tr>
                : rows.map(row => (
                  <tr key={row.id}>
                    {headers.map(h => <td key={h}><div className="pr-cell">{linkify(row.cells[h] ?? '')}</div></td>)}
                    <td className="pr-approval">
                      <StatusDropdown status={row.status} actions={row.allowedActions} disabled={busyRowId === row.id} onAction={a => onAction(row, a)} />
                      {row.team && <div className="ws-muted ws-small">{row.team}{row.round > 1 && ` · round ${row.round}`}</div>}
                    </td>
                    <td className="pr-sticky">
                      <div className="pr-row-actions">
                        {isMarketing && row.status !== 'Sent' && (
                          <button className="btn btn-ghost" onClick={() => onEdit(row)} title="Edit row" aria-label={`Edit row ${row.rowIndex}`}><Pencil size={15} /></button>
                        )}
                        <button className="btn btn-ghost" onClick={() => onMail(row)} title="View mail" aria-label={`View mail for row ${row.rowIndex}`}><Mail size={15} /></button>
                        {isMarketing && (
                          <button className="btn btn-ghost pr-danger" onClick={() => onDelete(row)} title="Delete row" aria-label={`Delete row ${row.rowIndex}`}><Trash2 size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="pr-pager">
          <span className="ws-muted">Page {page} of {pages} · {total} rows</span>
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={14} /> Previous</button>
          <button className="btn btn-secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next <ChevronRight size={14} /></button>
        </div>
      )}
    </>
  );
}
