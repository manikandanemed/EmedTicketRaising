import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '../services/toast';
import { Attachment, NO_ACCESS, Temperature, describeError, isForbidden, mk } from './marketingApi';

// ---------- formatting ----------
export const ago = (iso: string): string => {
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (m < 1) return 'just now';
  if (m < 60) return `${Math.round(m)} min`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
};
export const when = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const fsize = (b: number): string => (b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`);
export const tempColor = (t: Temperature | string) => (t === 'Hot' ? 'var(--mk-red)' : t === 'Warm' ? 'var(--mk-amber)' : 'var(--mk-blue)');
export const OPEN_STAGES = ['New', 'Contacted', 'Replied', 'Interested'];
export const isClosed = (stage: string) => stage === 'Closed';
/** The value for an <input type="datetime-local"> showing the current local time. */
export const localNow = (): string => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export const MAX_FILES = 5;
export const MAX_FILE = 10 * 1048576;

// ---------- data loading ----------
export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const run = useCallback(async (quiet = false) => {
    const mine = ++seq.current;
    if (!quiet) setLoading(true);
    try {
      const r = await load();
      if (mine === seq.current) { setData(r); setError(null); }
    } catch (e) {
      if (mine === seq.current) setError(e);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { data, error, loading, reload: () => run(true), setData };
}

export const showError = (e: unknown) => toast.error(describeError(e));

// ---------- links in text (escaped by React; only http(s) and www. become links) ----------
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;

export function linkify(input: string | null | undefined): React.ReactNode[] {
  const str = String(input ?? '');
  const out: React.ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of str.matchAll(URL_RE)) {
    let u = m[0];
    const trail = (u.match(/[.,;:!?)\]}]+$/) || [''])[0];
    if (trail) u = u.slice(0, -trail.length);
    if (!u) continue;
    const idx = m.index ?? 0;
    if (idx > last) out.push(str.slice(last, idx));
    out.push(
      <a key={n++} className="mk-ulink" href={/^www\./i.test(u) ? `https://${u}` : u} target="_blank" rel="noopener noreferrer">{u}</a>,
    );
    last = idx + u.length;
  }
  if (last < str.length) out.push(str.slice(last));
  return out;
}

// ---------- attachments: fetched with the auth token, then opened or downloaded ----------
const OPENABLE = /^(image\/(png|jpe?g|gif|webp)|text\/plain|application\/pdf)$/i;

export async function openAttachment(a: Attachment) {
  try {
    const raw = await mk.attachment(a.id);
    const blob = new Blob([raw], { type: a.contentType || raw.type });
    const url = URL.createObjectURL(blob);
    const w = OPENABLE.test(a.contentType) ? window.open(url, '_blank', 'noopener') : null;
    if (!w) {
      const d = document.createElement('a');
      d.href = url;
      d.download = a.fileName;
      document.body.appendChild(d);
      d.click();
      d.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    toast.error(isForbidden(e) ? NO_ACCESS : describeError(e) || 'Couldn’t open this file');
  }
}
