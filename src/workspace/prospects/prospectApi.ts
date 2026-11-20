import { API_BASE_URL } from '../../services/api';
import { WsError, download, query, rawFetch } from '../workspaceApi';

// ---------- types (mirror the backend DTOs) ----------

export type ReviewTeam = 'Development' | 'Research' | 'Operations';
export const REVIEW_TEAMS: ReviewTeam[] = ['Development', 'Research', 'Operations'];

export type ApprovalStatus = 'Draft' | 'WaitingForApproval' | 'WaitingForReApproval' | 'NeedsFixing' | 'Declined' | 'Approved' | 'Sent';
export type TransitionAction = 'Send' | 'Approve' | 'RequestFixes' | 'Decline' | 'MarkSent';
export type StatusFilter = 'All' | 'Waiting' | 'NeedsFixing' | 'Declined' | 'Approved' | 'Sent';

export interface ProspectAccess { isMarketing: boolean; teams: ReviewTeam[] }

export interface ReviewTeamInfo { team: ReviewTeam; members: { userId: number; name: string }[] }

export interface ProspectSheet { id: number; name: string; sortOrder: number; rowCount: number }

export interface ProspectFile {
  id: number;
  fileName: string;
  uploadedAt: string;
  uploadedByUserId: number;
  uploadedByName?: string | null;
  sheets: ProspectSheet[];
}

export interface ProspectRow {
  id: number;
  rowIndex: number;
  cells: Record<string, string>;
  rowVersion: string;
  status: ApprovalStatus;
  team?: ReviewTeam | null;
  round: number;
  allowedActions: TransitionAction[];
}

export interface ProspectCounts { all: number; waiting: number; needsFixing: number; declined: number; approved: number; sent: number }

export interface ProspectRows { headers: string[]; rows: ProspectRow[]; counts: ProspectCounts; total: number }

export interface Approval {
  rowId: number;
  status: ApprovalStatus;
  reviewTeam?: ReviewTeam | null;
  round: number;
  requestNote?: string | null;
  reviewerComment?: string | null;
  lastActionByUserId?: number | null;
  lastActionByName?: string | null;
  lastActionAt?: string | null;
}

export interface ApprovalHistoryItem {
  id: number;
  fromStatus: ApprovalStatus;
  toStatus: ApprovalStatus;
  action: string;
  team?: ReviewTeam | null;
  comment?: string | null;
  userId: number;
  userName?: string | null;
  createdAt: string;
}

export interface ProspectMail {
  rowId: number;
  sheetId: number;
  sheetName: string;
  fileName: string;
  rowVersion: string;
  mail: {
    organisation: string;
    to: string;
    recipientEmail: string;
    subject: string;
    preview: string;
    body: string;
    followUp: string;
    sourceSheetName?: string | null;
    details: { label: string; value: string }[];
    checks: { severity: 'error' | 'warning'; message: string }[];
  };
  approval: Approval;
  history: ApprovalHistoryItem[];
  allowedActions: TransitionAction[];
}

export interface TransitionInput { action: TransitionAction; team?: ReviewTeam; note?: string; comment?: string }
export interface TransitionResult { rowId: number; rowVersion: string; approval: Approval; allowedActions: TransitionAction[] }

export interface ApprovalItem {
  rowId: number;
  sheetId: number;
  organisation: string;
  subject: string;
  status: ApprovalStatus;
  team?: ReviewTeam | null;
  round: number;
  lastActionAt?: string | null;
  reviewerComment?: string | null;
}

// ---------- calls ----------

const base = '/api/workspace';

/** Every JSON call goes through here: the { success, message, data } envelope is unwrapped in this one place. */
async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await rawFetch(`${base}${url}`, init);
  let json: { success?: boolean; message?: string; data?: T } | null = null;
  try { json = await res.json(); } catch { /* not json */ }
  if (!res.ok || json?.success === false) throw new WsError(res.status, json?.message || `Request failed (${res.status})`, json?.data);
  return json?.data as T;
}

const send = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const pApi = {
  me: () => call<ProspectAccess>('/review-teams/me'),
  reviewTeams: () => call<ReviewTeamInfo[]>('/review-teams'),
  setTeamMembers: (team: ReviewTeam, userIds: number[]) => call<unknown>(`/review-teams/${team}/members`, send('PUT', { userIds })),

  files: () => call<ProspectFile[]>('/prospect-files'),
  deleteFile: (id: number) => call<boolean>(`/prospect-files/${id}`, send('DELETE')),
  /** XHR instead of fetch so the upload can report progress. */
  uploadFile: (file: File, onProgress: (percent: number) => void) =>
    new Promise<ProspectFile>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}${base}/prospect-files`);
      const token = localStorage.getItem('token');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onerror = () => reject(new WsError(0, 'Failed to fetch'));
      xhr.onload = () => {
        let json: { success?: boolean; message?: string; data?: ProspectFile } | null = null;
        try { json = JSON.parse(xhr.responseText); } catch { /* not json */ }
        if (xhr.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = `${import.meta.env.BASE_URL}login`;
          reject(new WsError(401, 'Unauthorized'));
        } else if (xhr.status >= 200 && xhr.status < 300 && json?.success !== false && json?.data) resolve(json.data);
        else reject(new WsError(xhr.status, json?.message || `Upload failed (${xhr.status})`));
      };
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    }),

  rows: (sheetId: number, p: { status: StatusFilter; search: string; page: number; pageSize: number }) =>
    call<ProspectRows>(`/prospect-sheets/${sheetId}/rows${query({ status: p.status === 'All' ? undefined : p.status, search: p.search, page: p.page, pageSize: p.pageSize })}`),
  columnPreferences: (sheetId: number) => call<{ hiddenColumns: string[] }>(`/prospect-sheets/${sheetId}/column-preferences`),
  saveColumnPreferences: (sheetId: number, hiddenColumns: string[]) =>
    call<{ hiddenColumns: string[] }>(`/prospect-sheets/${sheetId}/column-preferences`, send('PUT', { hiddenColumns })),
  /** columns is the plain comma-joined list: the backend re-joins header names that contain commas. */
  exportSheet: (sheetId: number, p: { columns?: string[]; status: StatusFilter; search: string }) =>
    download(`${base}/prospect-sheets/${sheetId}/export${query({ columns: p.columns?.join(','), status: p.status === 'All' ? undefined : p.status, search: p.search })}`),

  updateRow: (rowId: number, cells: Record<string, string>, rowVersion: string) =>
    call<ProspectRow>(`/prospect-rows/${rowId}`, send('PUT', { cells, rowVersion })),
  deleteRow: (rowId: number) => call<boolean>(`/prospect-rows/${rowId}`, send('DELETE')),
  mail: (rowId: number) => call<ProspectMail>(`/prospect-rows/${rowId}/mail`),
  transition: (rowId: number, input: TransitionInput) => call<TransitionResult>(`/prospect-rows/${rowId}/transitions`, send('POST', input)),

  inbox: () => call<{ waiting: ApprovalItem[]; answered: ApprovalItem[] }>('/approvals/inbox'),
  sent: () => call<ApprovalItem[]>('/approvals/sent'),
  badgeCount: () => call<{ count: number }>('/approvals/badge-count'),
};
