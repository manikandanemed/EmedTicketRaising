import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { ApprovalStatus, TransitionAction } from './prospectApi';

export const STATUS_LABEL: Record<ApprovalStatus, string> = {
  Draft: 'Draft',
  WaitingForApproval: 'Waiting for approval',
  WaitingForReApproval: 'Waiting for re-approval',
  NeedsFixing: 'Needs fixing',
  Declined: 'Declined',
  Approved: 'Approved',
  Sent: 'Sent',
};

export const StatusBadge: React.FC<{ status: ApprovalStatus }> = ({ status }) => (
  <span className={`pr-status pr-status-${status}`}>{STATUS_LABEL[status] ?? status}</span>
);

/** Button text for a transition, depending on the status it starts from. */
export function actionLabel(action: TransitionAction, status: ApprovalStatus): string {
  switch (action) {
    case 'Send':
      return status === 'NeedsFixing' ? 'Fixed, send for approval…' : status === 'Declined' ? 'Send for re-approval…' : 'Send for approval…';
    case 'MarkSent': return 'Mark as sent';
    case 'Approve': return 'Approve';
    case 'RequestFixes': return 'Ask for fixes…';
    case 'Decline': return 'Decline…';
  }
}

/** Left border colour group of an approvals list item. */
export function statusTone(status: ApprovalStatus): 'amber' | 'green' | 'red' | 'grey' {
  if (status === 'Approved' || status === 'Sent') return 'green';
  if (status === 'Declined') return 'red';
  if (status === 'Draft') return 'grey';
  return 'amber';
}

/** Status badge that opens a menu of the actions the server allows for this row. No actions: a read-only badge. */
export const StatusDropdown: React.FC<{
  status: ApprovalStatus;
  actions: TransitionAction[];
  disabled?: boolean;
  onAction: (action: TransitionAction) => void;
}> = ({ status, actions, disabled, onAction }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (actions.length === 0) return <StatusBadge status={status} />;

  const toggle = () => {
    if (!open && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.min(r.left, window.innerWidth - 230) });
    }
    setOpen(o => !o);
  };

  return (
    <>
      <button ref={buttonRef} type="button" className="pr-status-btn" onClick={toggle} disabled={disabled} aria-haspopup="menu" aria-expanded={open}>
        <StatusBadge status={status} />
        <ChevronDown size={14} />
      </button>
      {open && createPortal(
        <ul ref={menuRef} className="pr-menu" role="menu" style={{ top: pos.top, left: pos.left }}>
          {actions.map(a => (
            <li key={a} role="none">
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onAction(a); }}>{actionLabel(a, status)}</button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
};

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

/** Cell text with line breaks kept (by CSS) and URLs made clickable. */
export function linkify(text: string): React.ReactNode {
  if (!text) return null;
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{part}</a>
      : <React.Fragment key={i}>{part}</React.Fragment>,
  );
}

/** Name used in confirmations: the organisation column, else the first non-empty cell. */
export function rowTitle(cells: Record<string, string>): string {
  const org = Object.entries(cells).find(([h, v]) => /organi[sz]ation|company|institution|hospital|client/i.test(h) && v?.trim());
  return (org ?? Object.entries(cells).find(([, v]) => v?.trim()))?.[1].trim() ?? 'this row';
}
