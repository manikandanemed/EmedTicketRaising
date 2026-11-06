import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CampaignInput, CampaignDetail, wsApi, describeError } from './workspaceApi';
import { Modal, useLoad } from './ui';
import { useMe } from './session';
import { toast } from '../services/toast';

const EMAIL = /^[^@\s,;<>]+@[^@\s,;<>]+\.[^@\s,;<>]+$/;

/** Create or edit a draft. Only the title is needed to save a draft; the rest is checked again when it is sent for approval. */
export default function MailForm({ existing, onClose, onSaved }: {
  existing?: CampaignDetail;
  onClose: () => void;
  onSaved: (saved: CampaignDetail) => void;
}) {
  const { name } = useMe();
  const [form, setForm] = useState<CampaignInput>({
    title: existing?.title ?? '',
    clientName: existing?.clientName ?? '',
    contactName: existing?.contactName ?? '',
    clientEmail: existing?.clientEmail ?? '',
    subject: existing?.subject ?? '',
    body: existing?.body ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const templates = useLoad(() => (existing ? Promise.resolve([]) : wsApi.campaignTemplates()), []);

  const set = (key: keyof CampaignInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const emailProblem = form.clientEmail.trim() && !EMAIL.test(form.clientEmail.trim()) ? 'Not a valid email address' : null;

  const applyTemplate = (id: string) => {
    const t = templates.data?.find(x => x.id === Number(id));
    if (!t) return;
    const fill = (s: string) => s
      .replaceAll('{client}', form.clientName.trim() || '{client}')
      .replaceAll('{name}', form.contactName.trim() || '{name}')
      .replaceAll('{me}', name || '{me}');
    setForm(f => ({ ...f, subject: fill(t.subject), body: fill(t.body), title: f.title || t.name }));
  };

  const save = async () => {
    if (!form.title.trim()) { setError('Give the mail a title.'); return; }
    if (emailProblem) { setError(emailProblem); return; }
    setSaving(true);
    setError(null);
    try {
      const saved = existing ? await wsApi.updateCampaign(existing.id, form) : await wsApi.createCampaign(form);
      toast.success(existing ? 'Draft saved' : 'Draft created');
      onSaved(saved);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={existing ? 'Edit mail' : 'New mail'}
      onClose={onClose}
      closeDisabled={saving}
      wide
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving && <Loader2 size={14} className="spinner" />} Save draft</button>
        </>
      }
    >
      {error && <div className="ws-banner ws-banner-error" role="alert">{error}</div>}
      {!existing && (templates.data?.length ?? 0) > 0 && (
        <div className="form-group">
          <label htmlFor="mf-template">Start from a template</label>
          <select id="mf-template" className="form-select" defaultValue="" onChange={e => applyTemplate(e.target.value)}>
            <option value="">No template</option>
            {templates.data!.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <span className="ws-muted ws-small">Fill the client and contact first: {'{client}'}, {'{name}'} and {'{me}'} are replaced.</span>
        </div>
      )}
      <div className="form-group"><label htmlFor="mf-title">Title</label><input id="mf-title" className="form-input" value={form.title} onChange={set('title')} maxLength={200} autoFocus /></div>
      <div className="ws-form-row">
        <div className="form-group"><label htmlFor="mf-client">Client</label><input id="mf-client" className="form-input" value={form.clientName} onChange={set('clientName')} maxLength={200} /></div>
        <div className="form-group"><label htmlFor="mf-contact">Contact person</label><input id="mf-contact" className="form-input" value={form.contactName} onChange={set('contactName')} maxLength={200} /></div>
      </div>
      <div className="form-group">
        <label htmlFor="mf-email">Client email</label>
        <input id="mf-email" className="form-input" type="email" value={form.clientEmail} onChange={set('clientEmail')} />
        {emailProblem && <span className="ws-field-error">{emailProblem}</span>}
      </div>
      <div className="form-group"><label htmlFor="mf-subject">Subject</label><input id="mf-subject" className="form-input" value={form.subject} onChange={set('subject')} maxLength={300} /></div>
      <div className="form-group"><label htmlFor="mf-body">Message</label><textarea id="mf-body" className="form-textarea" rows={10} value={form.body} onChange={set('body')} /></div>
    </Modal>
  );
}
