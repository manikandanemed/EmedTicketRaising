import { API_BASE_URL, ApiResponse } from '../services/api';

/**
 * Base URL of the Marketing API. By default it goes through the same origin / Vite proxy as the rest of the app
 * (`/ticket-system/api/marketing`). Set VITE_MARKETING_API_URL (for example http://localhost:5298/api/marketing)
 * to point somewhere else.
 */
const BASE: string = (import.meta.env.VITE_MARKETING_API_URL as string | undefined)?.replace(/\/$/, '') || `${API_BASE_URL}/api/marketing`;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const NO_ACCESS = "You don't have access to this page";

export function describeError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';
}
export const isForbidden = (e: unknown) => e instanceof ApiError && e.status === 403;

// ---------- types ----------
export type Stage = 'New' | 'Contacted' | 'Replied' | 'Interested' | 'Closed';
export type Temperature = 'Hot' | 'Warm' | 'Cold';

export interface Lookups {
  stages: string[]; channels: string[]; campaigns: string[]; interests: string[];
  closeReasons: string[]; historyKinds: string[]; loggableKinds: string[];
}
export interface Attachment { id: string; fileName: string; contentType: string; size: number; signedBy: string | null; signedAt: string | null }
export interface HistoryEntry {
  id: string; kind: string; occurredAt: string; subject: string | null; body: string | null; text: string | null;
  createdByName: string | null; attachments: Attachment[];
}
export interface LeadSummary {
  id: string; name: string; title: string; company: string; email: string; phone: string | null;
  orgPhone: string | null; linkedInUrl: string | null; possibleEmail: string | null; orgEmail: string | null;
  channel: string; campaign: string; interest: string; score: number; temperature: Temperature; stage: Stage;
  closeReason: string | null; consent: boolean; ownerUserId: string | null; ownerName: string | null; isMine: boolean;
  createdAt: string; pickedUpAt: string | null; lastContactAt: string | null; emailsSent: number;
}
export interface LeadImportResult {
  importId?: string; fileName: string; totalRows: number; imported: number; skipped: number; duplicates: number; emptyRows: number; issues: string[];
}
/** One uploaded Excel file in the upload history. */
export interface LeadImport {
  id: string; fileName: string; sizeBytes: number; uploadedByName: string; uploadedAt: string;
  totalRows: number; imported: number; skipped: number; duplicates: number;
  remaining: number; undoable: number;
  undone: boolean; undoneAt: string | null; undoneByName: string | null; canUndo: boolean;
}
export interface ImportUndoResult { importId: string; fileName: string; removed: number; kept: number }
/** One column of the imported Excel row, with its original header. */
export interface ImportedField { name: string; value: string }
export interface LeadDetail extends LeadSummary {
  /** Every Excel column in sheet order; empty/absent for leads not imported from Excel. */
  importedFields?: ImportedField[];
  history: HistoryEntry[];
}
export interface Dashboard {
  leadsTracked: number; emailsSent: number; waitingInQueue: number; onMyBench: number; replyRate: number;
  byStage: { stage: string; count: number }[];
  byChannel: { channel: string; count: number }[];
  byTemperature: { temperature: string; count: number }[];
  byCampaign: { campaign: string; leads: number; emails: number }[];
  recentActivity: { text: string; at: string }[];
}
export interface QueueQuery { search?: string; channel?: string; campaign?: string; temperature?: string; stage?: string; sort?: string; dir?: 'asc' | 'desc' }
export interface FileMeta { fileName: string; signedBy: string | null; signedAt: string | null }

// ---------- transport ----------
function goToLogin() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = `${import.meta.env.BASE_URL}login`;
}

async function send(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = localStorage.getItem('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }
  // 401 and 403 come with an empty body: decide by status code only
  if (res.status === 401) { goToLogin(); throw new ApiError(401, 'Your session has expired. Please sign in again.'); }
  if (res.status === 403) throw new ApiError(403, NO_ACCESS);
  if (!res.ok) {
    let message = '';
    try { message = (await res.json())?.message ?? ''; } catch { /* no body */ }
    throw new ApiError(res.status, message || (res.status === 404 ? 'Not found.' : `Request failed with status ${res.status}`));
  }
  return res;
}

/** Sends a request and unwraps the ApiResponse<T> envelope. */
async function callFull<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const res = await send(path, init);
  let json: ApiResponse<T> | null = null;
  try { json = await res.json(); } catch { /* handled below */ }
  if (!json || json.success === false) throw new ApiError(res.status, json?.message || 'Empty or invalid response from server');
  return json;
}
async function call<T>(path: string, init?: RequestInit): Promise<T> {
  return (await callFull<T>(path, init)).data;
}

const body = (o: unknown): RequestInit => ({ body: JSON.stringify(o) });

export function queueQueryString(q: QueueQuery): string {
  const p = new URLSearchParams();
  (Object.entries(q) as [string, string | undefined][]).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const mk = {
  lookups: () => call<Lookups>('/lookups'),
  dashboard: () => call<Dashboard>('/dashboard'),
  queue: (q: QueueQuery) => call<LeadSummary[]>(`/leads/queue${queueQueryString(q)}`),
  importLeads: (file: File) => { const f = new FormData(); f.append('file', file, file.name); return call<LeadImportResult>('/leads/import', { method: 'POST', body: f }); },
  /** Permanently deletes a lead that is still waiting in the queue. Resolves with the server's message. */
  removeLead: async (id: string) => (await callFull<LeadSummary>(`/leads/${id}`, { method: 'DELETE' })).message,
  imports: () => call<LeadImport[]>('/leads/imports'),
  /** Undoes an upload; resolves with the server's message and the counts. */
  undoImport: async (id: string) => { const r = await callFull<ImportUndoResult>(`/leads/imports/${id}/undo`, { method: 'POST' }); return { message: r.message, ...r.data }; },
  bench: (status: 'open' | 'closed' | 'all') => call<LeadSummary[]>(`/leads/bench?status=${status}`),
  lead: (id: string) => call<LeadDetail>(`/leads/${id}`),
  pickUp: (id: string) => call<LeadDetail>(`/leads/${id}/pick-up`, { method: 'POST' }),
  returnLead: (id: string) => call<LeadSummary>(`/leads/${id}/return`, { method: 'POST' }),
  setStage: (id: string, stage: string) => call<LeadDetail>(`/leads/${id}/stage`, { method: 'PUT', ...body({ stage }) }),
  setScore: (id: string, score: number) => call<LeadDetail>(`/leads/${id}/score`, { method: 'PUT', ...body({ score }) }),
  close: (id: string, reason: string) => call<LeadDetail>(`/leads/${id}/close`, { method: 'POST', ...body({ reason }) }),
  addHistory: (id: string, form: FormData) => call<LeadDetail>(`/leads/${id}/history`, { method: 'POST', body: form }),
  /** The raw file (not the envelope). */
  attachment: async (id: string): Promise<Blob> => (await send(`/attachments/${id}`)).blob(),
};

export function buildHistoryForm(o: {
  kind: string; occurredAt: string; subject?: string; body?: string; text?: string;
  files: { file: File; signed?: { by: string; at: string } }[];
}): FormData {
  const f = new FormData();
  f.append('kind', o.kind);
  f.append('occurredAt', o.occurredAt);
  if (o.subject) f.append('subject', o.subject);
  if (o.body) f.append('body', o.body);
  if (o.text) f.append('text', o.text);
  const meta: FileMeta[] = o.files.map(x => ({ fileName: x.file.name, signedBy: x.signed?.by ?? null, signedAt: x.signed?.at ?? null }));
  o.files.forEach(x => f.append('files', x.file, x.file.name));
  if (o.files.length) f.append('filesMeta', JSON.stringify(meta));
  return f;
}
