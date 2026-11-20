import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Copy, Loader2, XCircle } from 'lucide-react';
import { toast } from '../../services/toast';
import { describeError } from '../workspaceApi';
import { ErrorState, Loading, Modal, formatDateTime, useLoad } from '../ui';
import { REVIEW_TEAMS, ReviewTeam, TransitionAction, TransitionResult, pApi } from './prospectApi';
import { STATUS_LABEL, StatusBadge, actionLabel } from './status';

const DEFAULT_NOTE = 'Please check that the prospect email below is correct (names, titles, numbers and product claims) before it goes out.';

const DONE: Record<TransitionAction, string> = {
  Send: 'Sent for approval.',
  Approve: 'Approved.',
  RequestFixes: 'Fixes requested.',
  Decline: 'Declined.',
  MarkSent: 'Marked as sent.',
};

const Collapsible: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="pr-collapsible">
      <button type="button" className="pr-collapse-btn" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} {title}
      </button>
      {open && <div className="pr-collapse-body">{children}</div>}
    </div>
  );
};

/** The email as the review team sees it, with its approval state, history and the actions this user may take. */
export default function MailReviewDialog({ rowId, sendMode, onClose, onChanged }: {
  rowId: number;
  /** Open with the team picker and note box (the Send action from the table). */
  sendMode?: boolean;
  onClose: () => void;
  /** Called after a successful transition so the table, counts and badge can refresh. */
  onChanged: (result: TransitionResult) => void;
}) {
  const { data, error, loading, reload } = useLoad(() => pApi.mail(rowId), [rowId]);
  const [sending, setSending] = useState(!!sendMode);
  const [commentFor, setCommentFor] = useState<'RequestFixes' | 'Decline' | null>(null);
  const [comment, setComment] = useState('');
  const [commentTouched, setCommentTouched] = useState(false);
  const [team, setTeam] = useState<ReviewTeam | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: TransitionAction) => {
    if (!data) return;
    if (action === 'RequestFixes' || action === 'Decline') {
      setCommentTouched(true);
      if (!comment.trim()) return;
    }
    setBusy(true);
    try {
      const result = await pApi.transition(rowId, {
        action,
        team: action === 'Send' ? (team ?? data.approval.reviewTeam ?? 'Development') : undefined,
        note: action === 'Send' ? note.trim() || undefined : undefined,
        comment: action === 'RequestFixes' || action === 'Decline' ? comment.trim() : undefined,
      });
      toast.success(DONE[action]);
      onChanged(result);
      onClose();
    } catch (e) {
      toast.error(describeError(e));
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(`${data.mail.subject}\n\n${data.mail.body}`);
      toast.success('Email copied.');
    } catch {
      toast.error('Could not copy. Select the text and copy it by hand.');
    }
  };

  const startAction = (action: TransitionAction) => {
    if (action === 'Send') { setSending(true); setCommentFor(null); }
    else if (action === 'RequestFixes' || action === 'Decline') { setCommentFor(action); setSending(false); }
    else run(action);
  };

  const status = data?.approval.status;
  const a = data?.approval;
  const by = a?.lastActionByName ? ` (${a.lastActionByName})` : '';
  const title = data ? `Approval request: ${data.mail.subject} (${data.mail.organisation})` : 'Approval request';
  const sendTeam = team ?? a?.reviewTeam ?? 'Development';

  return (
    <Modal
      title={title}
      onClose={onClose}
      closeDisabled={busy}
      wide
      footer={data && (
        <div className="pr-mail-footer">
          <button className="btn btn-secondary" onClick={copy}><Copy size={14} /> Copy email</button>
          <span className="pr-spacer" />
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>Close</button>
          {commentFor
            ? (
              <>
                <button className="btn btn-secondary" onClick={() => setCommentFor(null)} disabled={busy}>Back</button>
                <button className={`btn ${commentFor === 'Decline' ? 'btn-danger' : 'btn-primary'}`} onClick={() => run(commentFor)} disabled={busy}>
                  {busy && <Loader2 size={14} className="spinner" />} {commentFor === 'Decline' ? 'Decline' : 'Ask for fixes'}
                </button>
              </>
            )
            : sending
              ? (
                <button className="btn btn-primary" onClick={() => run('Send')} disabled={busy}>
                  {busy && <Loader2 size={14} className="spinner" />} Send to {sendTeam}
                </button>
              )
              : data.allowedActions.map(act => (
                <button
                  key={act}
                  className={`btn ${act === 'Decline' ? 'btn-danger' : act === 'Approve' || act === 'MarkSent' ? 'btn-success' : act === 'Send' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => startAction(act)}
                  disabled={busy}
                >
                  {busy && <Loader2 size={14} className="spinner" />} {actionLabel(act, data.approval.status)}
                </button>
              ))}
        </div>
      )}
    >
      {loading ? <Loading label="Loading mail..." />
        : error || !data || !a || !status ? <ErrorState error={error} onRetry={reload} />
        : (
          <div className="pr-mail">
            <dl className="ws-dl pr-mail-head">
              <dt>From</dt><dd>Marketing team</dd>
              <dt><label htmlFor="pr-team">To</label></dt>
              <dd>
                {sending
                  ? (
                    <select id="pr-team" className="form-input pr-team-select" value={sendTeam} onChange={e => setTeam(e.target.value as ReviewTeam)}>
                      {REVIEW_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )
                  : (a.reviewTeam ?? 'Not sent to a team yet')}
              </dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={status} />
                {a.lastActionAt && <span className="ws-muted"> · {formatDateTime(a.lastActionAt)}</span>}
                {a.lastActionByName && <span className="ws-muted"> · {a.lastActionByName}</span>}
              </dd>
            </dl>

            {sending
              ? (
                <div className="form-group">
                  <label htmlFor="pr-note">Note for the reviewers (optional)</label>
                  <textarea id="pr-note" className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder={DEFAULT_NOTE} />
                </div>
              )
              : <p className="pr-note">{a.requestNote || DEFAULT_NOTE}</p>}

            {status === 'NeedsFixing' && (
              <div className="ws-banner ws-banner-warning" role="status">
                <AlertTriangle size={18} />
                <div>
                  <strong>Corrections from {a.reviewTeam}{by}:</strong> {a.reviewerComment}
                  <div className="ws-muted">Edit the row, then send it for approval again.</div>
                </div>
              </div>
            )}
            {status === 'Declined' && (
              <div className="ws-banner ws-banner-error" role="status">
                <XCircle size={18} />
                <div><strong>Declined by {a.reviewTeam}{by}:</strong> {a.reviewerComment}</div>
              </div>
            )}
            {status === 'Approved' && (
              <div className="ws-banner pr-banner-ok" role="status">
                <CheckCircle2 size={18} />
                <div><strong>Approved by {a.reviewTeam}{by}</strong>{a.reviewerComment && <>: {a.reviewerComment}</>}</div>
              </div>
            )}

            {data.mail.checks.map((c, i) => (
              <div key={i} className={`ws-banner ${c.severity === 'error' ? 'ws-banner-error' : 'ws-banner-warning'}`} role="alert">
                {c.severity === 'error' ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
                <div>{c.message}</div>
              </div>
            ))}

            <article className="pr-email">
              <div className="pr-email-to"><span className="ws-muted">To</span> {data.mail.to}{data.mail.recipientEmail && <> · {data.mail.recipientEmail}</>}</div>
              <h4 className="pr-email-subject">{data.mail.subject}</h4>
              {data.mail.preview && <p className="ws-muted">{data.mail.preview}</p>}
              <div className="pr-email-body">{data.mail.body}</div>
            </article>

            {data.mail.followUp && <Collapsible title="Follow-up"><div className="pr-email-body">{data.mail.followUp}</div></Collapsible>}
            {data.mail.details.length > 0 && (
              <Collapsible title={`Details from ${data.sheetName}${data.mail.sourceSheetName ? `, email text from ${data.mail.sourceSheetName}` : ''}`}>
                <dl className="ws-dl">
                  {data.mail.details.map((d, i) => <React.Fragment key={i}><dt>{d.label}</dt><dd>{d.value}</dd></React.Fragment>)}
                </dl>
              </Collapsible>
            )}

            {commentFor && (
              <div className="form-group">
                <label htmlFor="pr-reviewer-comment">{commentFor === 'Decline' ? 'Why are you declining?' : 'What needs fixing?'} (required)</label>
                <textarea
                  id="pr-reviewer-comment"
                  className="form-input"
                  rows={4}
                  autoFocus
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  aria-invalid={commentTouched && !comment.trim()}
                />
                {commentTouched && !comment.trim() && <span className="ws-field-error" role="alert">Please write a comment.</span>}
              </div>
            )}

            {data.history.length > 0 && (
              <>
                <h5 className="ws-subhead">History</h5>
                <ol className="pr-history">
                  {data.history.map(h => (
                    <li key={h.id}>
                      <strong>{h.userName ?? 'Someone'}</strong> · {h.action}: {STATUS_LABEL[h.fromStatus]} → {STATUS_LABEL[h.toStatus]}
                      {h.team && <> · {h.team}</>}
                      {h.comment && <> · “{h.comment}”</>}
                      <span className="ws-muted"> · {formatDateTime(h.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}
    </Modal>
  );
}
