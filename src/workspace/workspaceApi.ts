import { API_BASE_URL, request } from '../services/api';

// ---------- types (mirror the backend DTOs) ----------

export type CampaignStatus = 'draft' | 'pending' | 'approved' | 'sending' | 'sent';

export interface Campaign {
  id: number;
  title: string;
  clientName: string;
  contactName: string;
  clientEmail: string;
  subject: string;
  body: string;
  status: CampaignStatus;
  managerNote?: string | null;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string | null;
  importId?: number | null;
  sourceRow?: number | null;
  segment?: string | null;
  priority?: string | null;
  sendWave?: string | null;
  submitBlockers: string[];
  badge?: 'changes_asked' | 'needs_your_approval' | 'ready_to_send' | null;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canAskChanges: boolean;
  canTakeBack: boolean;
  canSend: boolean;
}

export interface CampaignHistory {
  id: number;
  userId: number;
  userName: string;
  action: string;
  note?: string | null;
  createdAt: string;
}

export interface CampaignDetail extends Campaign {
  fromName: string;
  fromEmail: string;
  footer: string;
  history: CampaignHistory[];
}

export interface CampaignList {
  counts: Record<string, number>;
  items: Campaign[];
}

export interface CampaignInput {
  title: string;
  clientName: string;
  contactName: string;
  clientEmail: string;
  subject: string;
  body: string;
}

export interface CampaignTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
}

export interface BulkItemResult {
  id: number;
  success: boolean;
  status: number;
  message: string;
  campaignStatus?: string | null;
}

export interface BulkResult {
  succeeded: number;
  failed: number;
  items: BulkItemResult[];
}

export interface ImportFlag {
  level: 'error' | 'warning';
  code: string;
  message: string;
}

export interface ImportRow {
  rowNumber: number;
  title: string;
  clientName: string;
  contactName: string;
  clientEmail: string;
  subject: string;
  body: string;
  segment?: string | null;
  priority?: string | null;
  sendWave?: string | null;
  severity: 'ok' | 'warning' | 'error';
  flags: ImportFlag[];
}

export interface ImportPreview {
  previewToken: string;
  expiresAt: string;
  fileName: string;
  format: string;
  totalRows: number;
  okRows: number;
  warningRows: number;
  errorRows: number;
  rows: ImportRow[];
}

export interface ImportCommitResult {
  importId: number;
  fileName: string;
  importedRows: number;
  skippedRows: number;
  campaigns: { rowNumber: number; campaignId: number }[];
}

export interface ImportBatch {
  id: number;
  fileName: string;
  importedBy: number;
  importedByName: string;
  createdAt: string;
  totalRows: number;
  importedRows: number;
}

export interface Person {
  id: number;
  name: string;
  role: 'Employee' | 'ProductManager' | 'Both';
  profilePicture?: string | null;
}

export interface PeopleList {
  totalCount: number;
  roleCounts: Record<string, number>;
  items: Person[];
}

export interface PersonProfile extends Person {
  email: string;
  joinedAt: string;
}

export interface WsNotification {
  id: number;
  type: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationList {
  unreadCount: number;
  items: WsNotification[];
}

export interface SheetAccess {
  userId: number;
  userName: string;
  canEdit: boolean;
}

export interface SheetListItem {
  id: number;
  title: string;
  ownerId: number;
  ownerName: string;
  isOwner: boolean;
  canEdit: boolean;
  version: number;
  updatedBy?: number | null;
  updatedByName?: string | null;
  updatedAt: string;
  createdAt: string;
  sharedWith?: SheetAccess[] | null;
}

export interface SheetCell {
  v?: string | number | boolean | null;
  f?: string | null;
  t?: string | null;
}

export interface SheetBook {
  sheets: { name: string; rows: Record<string, Record<string, SheetCell>> }[];
}

export interface SheetDetail extends SheetListItem {
  data: SheetBook;
  formattingLost: boolean;
}

export interface SheetVersion {
  version: number;
  updatedBy?: number | null;
  updatedByName?: string | null;
  updatedAt: string;
}

export interface CellChange {
  sheet: string;
  row: number;
  col: number;
  value: string | number | boolean | null;
}

export interface SheetConflict {
  sheet: string;
  row: number;
  col: number;
  currentValue: string | number | boolean | null;
  changedInVersion: number;
  changedByName: string;
}

export interface SheetPatchResult {
  version: number;
  appliedCells: number;
  updatedAt: string;
  conflicts: SheetConflict[];
}

export interface SheetHistoryItem {
  version: number;
  userId: number;
  userName: string;
  cellCount: number;
  createdAt: string;
}

// ---------- errors ----------

/** A failed call with the HTTP status, for the calls that need more than the message. */
export class WsError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/** One sentence for the user, whatever went wrong (including the 403 / 409 / 503 texts the server sends). */
export function describeError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  if (message === 'Failed to fetch') return 'Could not reach the server. Check your connection and try again.';
  return message;
}

/** The server answers 404 with this text when the feature is off, and 503 when its tables could not be created. */
export function isUnavailable(e: unknown): boolean {
  const message = e instanceof Error ? e.message : '';
  return /workspace (features are disabled|is unavailable)/i.test(message);
}

// ---------- helpers ----------

const base = '/api/workspace';

export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function data<T>(p: Promise<{ data: T }>): Promise<T> {
  return (await p).data;
}

export async function rawFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = localStorage.getItem('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API_BASE_URL}${url}`, { ...init, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = `${import.meta.env.BASE_URL}login`;
    throw new WsError(401, 'Unauthorized');
  }
  return res;
}

export async function download(url: string): Promise<{ blob: Blob; filename: string }> {
  const res = await rawFetch(url);
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try { message = (await res.json())?.message || message; } catch { /* not json */ }
    throw new WsError(res.status, message);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return { blob: await res.blob(), filename: match ? decodeURIComponent(match[1]) : 'download.xlsx' };
}

/** Saves a downloaded blob through a temporary link. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- API ----------

export const wsApi = {
  // campaigns
  listCampaigns: (p: { search?: string; onlyMine?: boolean; importId?: number | null } = {}) =>
    data(request<CampaignList>(`${base}/campaigns${query(p)}`)),
  getCampaign: (id: number) => data(request<CampaignDetail>(`${base}/campaigns/${id}`)),
  campaignTemplates: () => data(request<CampaignTemplate[]>(`${base}/campaigns/templates`)),
  createCampaign: (input: CampaignInput) =>
    data(request<CampaignDetail>(`${base}/campaigns`, { method: 'POST', body: JSON.stringify(input) })),
  updateCampaign: (id: number, input: CampaignInput) =>
    data(request<CampaignDetail>(`${base}/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(input) })),
  submitCampaign: (id: number) => data(request<CampaignDetail>(`${base}/campaigns/${id}/submit`, { method: 'POST' })),
  approveCampaign: (id: number) => data(request<CampaignDetail>(`${base}/campaigns/${id}/approve`, { method: 'POST' })),
  askChanges: (id: number, note: string) =>
    data(request<CampaignDetail>(`${base}/campaigns/${id}/ask-changes`, { method: 'POST', body: JSON.stringify({ note }) })),
  takeBack: (id: number) => data(request<CampaignDetail>(`${base}/campaigns/${id}/take-back`, { method: 'POST' })),
  sendCampaign: (id: number) =>
    data(request<CampaignDetail>(`${base}/campaigns/${id}/send`, { method: 'POST', body: JSON.stringify({ confirm: true }) })),
  bulkSubmit: (ids: number[]) =>
    data(request<BulkResult>(`${base}/campaigns/bulk/submit`, { method: 'POST', body: JSON.stringify({ ids }) })),
  bulkApprove: (ids: number[]) =>
    data(request<BulkResult>(`${base}/campaigns/bulk/approve`, { method: 'POST', body: JSON.stringify({ ids }) })),

  // excel import
  importPreview: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return data(request<ImportPreview>(`${base}/campaigns/import/preview`, { method: 'POST', body: form }));
  },
  importCommit: (previewToken: string, selectedRows: number[]) => {
    const form = new FormData();
    form.append('previewToken', previewToken);
    selectedRows.forEach(r => form.append('selectedRows', String(r)));
    return data(request<ImportCommitResult>(`${base}/campaigns/import/commit`, { method: 'POST', body: form }));
  },
  importTemplate: () => download(`${base}/campaigns/import/template`),
  listImports: (take = 50) => data(request<ImportBatch[]>(`${base}/campaigns/imports${query({ take })}`)),

  // people and notifications
  listPeople: (p: { role?: string; search?: string } = {}) => data(request<PeopleList>(`${base}/people${query(p)}`)),
  getPerson: (id: number) => data(request<PersonProfile>(`${base}/people/${id}`)),
  notifications: () => data(request<NotificationList>(`${base}/notifications`)),
  readAllNotifications: () => data(request<number>(`${base}/notifications/read-all`, { method: 'POST' })),

  // shared sheets
  listSheets: () => data(request<SheetListItem[]>(`${base}/sheets`)),
  getSheet: (id: number) => data(request<SheetDetail>(`${base}/sheets/${id}`)),
  sheetVersion: (id: number) => data(request<SheetVersion>(`${base}/sheets/${id}/version`)),
  createBlankSheet: (title: string) =>
    data(request<SheetDetail>(`${base}/sheets`, { method: 'POST', body: JSON.stringify({ title }) })),
  uploadSheet: (file: File, title?: string) => {
    const form = new FormData();
    if (title) form.append('title', title);
    form.append('file', file);
    return data(request<SheetDetail>(`${base}/sheets`, { method: 'POST', body: form }));
  },
  setSheetAccess: (id: number, people: { userId: number; canEdit: boolean }[]) =>
    data(request<SheetAccess[]>(`${base}/sheets/${id}/access`, { method: 'PUT', body: JSON.stringify(people) })),
  sheetHistory: (id: number) => data(request<SheetHistoryItem[]>(`${base}/sheets/${id}/history`)),
  deleteSheet: (id: number) => data(request<boolean>(`${base}/sheets/${id}`, { method: 'DELETE' })),
  downloadSheet: (id: number) => download(`${base}/sheets/${id}/download`),
  sheetImportPreview: (id: number) => data(request<ImportPreview>(`${base}/sheets/${id}/import-preview`, { method: 'POST' })),

  /**
   * Saves changed cells on top of baseVersion. Done with fetch directly because a 409 carries the conflicting cells
   * in its body, which the shared request helper would drop. Resolves { conflicts } instead of throwing for a 409.
   */
  async patchSheet(id: number, baseVersion: number, changes: CellChange[]): Promise<{ result?: SheetPatchResult; conflicts?: SheetConflict[]; version?: number }> {
    const res = await rawFetch(`${base}/sheets/${id}`, { method: 'PATCH', body: JSON.stringify({ baseVersion, changes }) });
    let json: any = null;
    try { json = await res.json(); } catch { /* not json */ }
    if (res.ok) return { result: json.data as SheetPatchResult };
    if (res.status === 409 && json?.data?.conflicts?.length) {
      return { conflicts: json.data.conflicts as SheetConflict[], version: json.data.version as number };
    }
    throw new WsError(res.status, json?.message || `Save failed (${res.status})`, json?.data);
  },
};
