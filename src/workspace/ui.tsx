import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw, ServerCrash, X } from 'lucide-react';
import { describeError, isUnavailable } from './workspaceApi';
import './workspace.css';

// ---------- time and text ----------

/** The server sends UTC timestamps, sometimes without the trailing Z. */
export function parseDate(iso: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - parseDate(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return parseDate(iso).toLocaleDateString();
}

export function formatDateTime(iso: string): string {
  return parseDate(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export function roleLabel(role: string): string {
  if (role === 'ProductManager') return 'Product Manager';
  if (role === 'Both') return 'Employee / Product Manager';
  return role;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

// ---------- loading data ----------

export function useLoad<T>(load: () => Promise<T>, deps: React.DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  const run = useCallback(async (quiet = false) => {
    const mine = ++seq.current;
    if (!quiet) setLoading(true);
    try {
      const result = await load();
      if (mine === seq.current) { setData(result); setError(null); }
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

// ---------- small components ----------

export const Loading: React.FC<{ label?: string; compact?: boolean }> = ({ label = 'Loading...', compact }) => (
  <div className={`ws-loading ${compact ? 'compact' : ''}`} role="status">
    <Loader2 size={20} className="spinner" />
    <span>{label}</span>
  </div>
);

export const ErrorState: React.FC<{ error: unknown; onRetry?: () => void; compact?: boolean }> = ({ error, onRetry, compact }) => {
  const off = isUnavailable(error);
  const denied = !off && /do not have access|no longer have permission|only the owner|only .* can/i.test(describeError(error));
  return (
    <div className={`ws-state ws-state-error ${compact ? 'compact' : ''}`} role="alert">
      {off ? <ServerCrash size={26} /> : <AlertCircle size={26} />}
      <strong>{off ? 'Workspace is not available right now' : denied ? 'You do not have access to this' : 'Something went wrong'}</strong>
      <span>{describeError(error)}</span>
      {onRetry && !denied && <button className="btn btn-secondary" onClick={onRetry}><RefreshCw size={14} /> Try again</button>}
    </div>
  );
};

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }> = ({ icon, title, text, action }) => (
  <div className="ws-state">
    {icon || <Inbox size={26} />}
    <strong>{title}</strong>
    {text && <span>{text}</span>}
    {action}
  </div>
);

export const Avatar: React.FC<{ name: string; size?: number; title?: string }> = ({ name, size = 28, title }) => (
  <span className="ws-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }} title={title ?? name}>{initialsOf(name)}</span>
);

export const AvatarStack: React.FC<{ names: string[]; max?: number }> = ({ names, max = 4 }) => (
  <span className="ws-avatar-stack">
    {names.slice(0, max).map((n, i) => <Avatar key={`${n}${i}`} name={n} size={24} />)}
    {names.length > max && <span className="ws-avatar more" style={{ width: 24, height: 24 }}>+{names.length - max}</span>}
  </span>
);

export const Tag: React.FC<{ children: React.ReactNode; tone?: 'neutral' | 'error' | 'warning' | 'ok' | 'info'; title?: string }> = ({ children, tone = 'neutral', title }) => (
  <span className={`ws-tag ws-tag-${tone}`} title={title}>{children}</span>
);

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  closeDisabled?: boolean;
}> = ({ title, onClose, children, footer, wide, closeDisabled }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !closeDisabled) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, closeDisabled]);

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget && !closeDisabled) onClose(); }}>
      <div className={`modal-content ws-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} disabled={closeDisabled} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="ws-modal-body">{children}</div>
        {footer && <div className="ws-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  title: string;
  confirmLabel: string;
  busy?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, confirmLabel, busy, danger, onConfirm, onClose, children }) => (
  <Modal
    title={title}
    onClose={onClose}
    closeDisabled={busy}
    footer={
      <>
        <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 size={14} className="spinner" />} {confirmLabel}
        </button>
      </>
    }
  >
    {children}
  </Modal>
);
