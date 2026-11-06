import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FileUp, Loader2, MessageSquareWarning, Pencil, Send, ShieldCheck, Undo2 } from 'lucide-react';
import { CampaignDetail, wsApi, describeError } from './workspaceApi';
import { ConfirmDialog, ErrorState, Loading, Modal, Tag, formatDateTime, initialsOf, timeAgo, useLoad } from './ui';
import { MailTags } from './MailsBoard';
import MailForm from './MailForm';
import { toast } from '../services/toast';

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', pending: 'Waiting for approval', approved: 'Approved', sending: 'Sending', sent: 'Sent' };

export default function MailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mailId = Number(id);
  const { data, error, loading, reload, setData } = useLoad<CampaignDetail>(() => wsApi.getCampaign(mailId), [mailId]);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const act = async (key: string, call: () => Promise<CampaignDetail>, success: string) => {
    setBusy(key);
    setProblem(null);
    try {
      const updated = await call();
      setData(updated);
      toast.success(success);
      return true;
    } catch (e) {
      const message = describeError(e);
      setProblem(message);
      toast.error(message);
      reload(); // the mail may have changed under us (409), so show its real state
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading label="Opening mail..." />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;
  const c = data;
  const warnings: string[] = [];
  if (/autonom/i.test(`${c.title} ${c.subject} ${c.body}`)) warnings.push('The text contains "autonom…". Check the wording before it goes out.');

  return (
    <div className="ws-mailview">
      <button className="btn btn-ghost" onClick={() => navigate('/workspace/campaigns')}><ArrowLeft size={14} /> All mails</button>

      <div className="ws-title-row">
        <div>
          <h1>{c.title}</h1>
          <div className="ws-card-tags">
            <Tag tone={c.status === 'sent' ? 'ok' : c.status === 'draft' ? 'neutral' : 'info'}>{STATUS_LABEL[c.status] ?? c.status}</Tag>
            <MailTags c={c} />
            {c.importId && <Link className="ws-tag ws-tag-neutral" to={`/workspace/campaigns?importId=${c.importId}`}><FileUp size={11} /> Import #{c.importId}{c.sourceRow ? `, row ${c.sourceRow}` : ''}</Link>}
          </div>
        </div>
        <div className="ws-actions">
          {c.canEdit && <button className="btn btn-secondary" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>}
          {c.canSubmit && (
            <button className="btn btn-primary" disabled={busy !== null || c.submitBlockers.length > 0} title={c.submitBlockers.join(' ')} onClick={() => act('submit', () => wsApi.submitCampaign(c.id), 'Sent for approval')}>
              {busy === 'submit' ? <Loader2 size={14} className="spinner" /> : <Send size={14} />} Send for approval
            </button>
          )}
          {c.canTakeBack && <button className="btn btn-secondary" disabled={busy !== null} onClick={() => act('back', () => wsApi.takeBack(c.id), 'Taken back to draft')}><Undo2 size={14} /> Take back</button>}
          {c.canAskChanges && <button className="btn btn-secondary" disabled={busy !== null} onClick={() => { setNote(''); setAsking(true); }}><MessageSquareWarning size={14} /> Ask for changes</button>}
          {c.canApprove && <button className="btn btn-success" disabled={busy !== null} onClick={() => act('approve', () => wsApi.approveCampaign(c.id), 'Approved')}>{busy === 'approve' ? <Loader2 size={14} className="spinner" /> : <ShieldCheck size={14} />} Approve</button>}
          {c.canSend && <button className="btn btn-primary" disabled={busy !== null} onClick={() => setSending(true)}><Send size={14} /> Send mail</button>}
        </div>
      </div>

      {c.status === 'draft' && c.submitBlockers.length > 0 && (
        <div className="ws-banner ws-banner-error" role="alert">
          <AlertTriangle size={16} />
          <div>
            <b>This draft cannot be sent for approval yet:</b>
            <ul>{c.submitBlockers.map(b => <li key={b}>{b}</li>)}</ul>
            {c.canEdit && <button className="ws-link" onClick={() => setEditing(true)}>Edit the mail to fix this</button>}
          </div>
        </div>
      )}
      {warnings.map(w => <div key={w} className="ws-banner ws-banner-warning" role="note"><AlertTriangle size={16} /> <div>{w}</div></div>)}
      {c.status === 'draft' && c.managerNote && (
        <div className="ws-banner ws-banner-warning" role="note"><MessageSquareWarning size={16} /> <div><b>Changes asked:</b> {c.managerNote}</div></div>
      )}
      {problem && <div className="ws-banner ws-banner-error" role="alert">{problem}</div>}

      <div className="ws-mail-grid">
        <section className="ws-email" aria-label="Mail preview">
          <dl className="ws-email-head">
            <dt>From</dt><dd>{c.fromName} &lt;{c.fromEmail}&gt;</dd>
            <dt>To</dt><dd>{c.contactName || <i className="ws-muted">no contact</i>} {c.clientEmail ? <>&lt;{c.clientEmail}&gt;</> : <i className="ws-muted">(no email)</i>}{c.clientName && <span className="ws-muted"> · {c.clientName}</span>}</dd>
            <dt>Subject</dt><dd><b>{c.subject || <i className="ws-muted">no subject</i>}</b></dd>
          </dl>
          <div className="ws-email-body">{c.body || <i className="ws-muted">The message is empty.</i>}</div>
          <div className="ws-email-footer">{c.footer}</div>
        </section>

        <aside className="ws-panel ws-timeline" aria-label="History">
          <h3>History</h3>
          <ol>
            {c.history.map(h => (
              <li key={h.id}>
                <span className="ws-avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{initialsOf(h.userName)}</span>
                <div>
                  <div><b>{h.action}</b> <span className="ws-muted">by {h.userName}</span></div>
                  {h.note && <div className="ws-timeline-note">{h.note}</div>}
                  <div className="ws-muted ws-small" title={formatDateTime(h.createdAt)}>{timeAgo(h.createdAt)}</div>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {editing && <MailForm existing={c} onClose={() => setEditing(false)} onSaved={saved => { setData(saved); setEditing(false); }} />}

      {asking && (
        <Modal
          title="Ask for changes"
          onClose={() => setAsking(false)}
          closeDisabled={busy !== null}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setAsking(false)} disabled={busy !== null}>Cancel</button>
              <button className="btn btn-primary" disabled={!note.trim() || busy !== null} onClick={async () => { if (await act('ask', () => wsApi.askChanges(c.id, note.trim()), 'Sent back to the creator')) setAsking(false); }}>
                {busy === 'ask' && <Loader2 size={14} className="spinner" />} Send back
              </button>
            </>
          }
        >
          <div className="form-group">
            <label htmlFor="ask-note">What needs to change?</label>
            <textarea id="ask-note" className="form-textarea" rows={5} value={note} onChange={e => setNote(e.target.value)} maxLength={2000} autoFocus />
          </div>
        </Modal>
      )}

      {sending && (
        <ConfirmDialog
          title="Send this mail?"
          confirmLabel="Send now"
          busy={busy === 'send'}
          onClose={() => setSending(false)}
          onConfirm={async () => { if (await act('send', () => wsApi.sendCampaign(c.id), 'Mail sent')) setSending(false); }}
        >
          <p>Send to <b>{c.contactName || 'the contact'}</b> at <b>{c.clientEmail}</b>?</p>
          <p className="ws-muted">Subject: {c.subject}</p>
          <p className="ws-muted">It goes out immediately and cannot be recalled. If sending fails the mail stays approved and you can try again.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
