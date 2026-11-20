import React, { Suspense, lazy, useRef, useState } from 'react';
import { toast } from '../services/toast';
import { LeadDetail, buildHistoryForm, mk } from './marketingApi';
import { useLookups } from './lookupsContext';
import { MAX_FILE, MAX_FILES, fsize, localNow, showError } from './helpers';
import { Clip } from './ui';

const ESignDialog = lazy(() => import('./ESignDialog'));

export interface PendingFile { key: number; file: File; signed?: { by: string; at: string } }

let fileKey = 0;

export default function AddHistory({ lead, onSaved }: { lead: LeadDetail; onSaved: (d: LeadDetail) => void }) {
  const lookups = useLookups();
  const kinds = lookups.loggableKinds;
  const [kind, setKind] = useState('Email sent');
  const [when, setWhen] = useState(localNow());
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [invalid, setInvalid] = useState<'subject' | 'text' | null>(null);
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const isMail = kind === 'Email sent';

  /** Adds files to the pending list, checking the limits first. Returns the ones that were added. */
  const addFiles = (picked: File[]): PendingFile[] => {
    const added: PendingFile[] = [];
    let count = files.length;
    for (const f of picked) {
      if (count >= MAX_FILES) { toast.error(`You can attach up to ${MAX_FILES} files at a time`); break; }
      if (f.size > MAX_FILE) { toast.error(`${f.name} is over 10 MB. Choose a smaller file.`); continue; }
      added.push({ key: ++fileKey, file: f });
      count++;
    }
    if (added.length) setFiles(prev => [...prev, ...added]);
    return added;
  };

  const save = async () => {
    const sub = subject.trim();
    const txt = text.trim();
    if (isMail && !sub) { setInvalid('subject'); subjectRef.current?.focus(); toast.error('Add the email subject'); return; }
    if (!isMail && !txt && !files.length) { setInvalid('text'); textRef.current?.focus(); return; }
    setSaving(true);
    try {
      const d = await mk.addHistory(lead.id, buildHistoryForm({
        kind,
        occurredAt: (when ? new Date(when) : new Date()).toISOString(),
        subject: isMail ? sub : undefined,
        body: isMail ? txt : undefined,
        text: isMail ? undefined : txt,
        files: files.map(f => ({ file: f.file, signed: f.signed })),
      }));
      setFiles([]); setSubject(''); setText(''); setWhen(localNow()); setInvalid(null);
      toast.success('Saved to history');
      onSaved(d);
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  const label = isMail ? 'Message' : kind === 'Reply received' ? 'What did they say? *' : kind === 'Call' ? 'Call notes *' : 'Note *';
  const placeholder = isMail ? 'Paste the email you sent (optional)' : kind === 'Reply received' ? 'e.g. Asked for pricing for 10 seats'
    : kind === 'Call' ? 'e.g. 15-minute call, wants a demo next week' : 'Anything worth remembering';

  return (
    <div className="mk-logbox">
      <h2>Add to history</h2>
      <div className="mk-field">
        <label htmlFor="lg-when">When</label>
        <input type="datetime-local" id="lg-when" value={when} onChange={e => setWhen(e.target.value)} style={{ width: 'auto', alignSelf: 'flex-start' }} />
      </div>
      <div className="mk-seg" role="group" aria-label="What happened">
        {kinds.map(k => (
          <button key={k} type="button" aria-pressed={k === kind} onClick={() => { setKind(k); setInvalid(null); }}>{k}</button>
        ))}
      </div>
      {isMail && (
        <div className="mk-field">
          <label htmlFor="lg-sub">Subject *</label>
          <input id="lg-sub" ref={subjectRef} className={invalid === 'subject' ? 'invalid' : ''} placeholder="e.g. Webinar recording and slides" value={subject}
            onChange={e => { setSubject(e.target.value); setInvalid(null); }} />
        </div>
      )}
      <div className="mk-field">
        <label htmlFor="lg-text">{label}</label>
        <textarea id="lg-text" ref={textRef} className={invalid === 'text' ? 'invalid' : ''} placeholder={placeholder} value={text}
          onChange={e => { setText(e.target.value); setInvalid(null); }} />
      </div>
      <div className="mk-field">
        <span className="mk-label">Attachments</span>
        <div className="mk-attach-row">
          <button type="button" className="mk-btn sm" onClick={() => input.current?.click()}><Clip />Attach files</button>
          <button type="button" className="mk-btn sm" onClick={() => setSigning(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21c3-1 5-3 7-6M14.5 4.5l5 5L10 19l-6 1 1-6z" /></svg>E-sign
          </button>
          <span className="hint">Up to {MAX_FILES} files, 10 MB each</span>
        </div>
        <input ref={input} type="file" multiple hidden aria-label="Choose files to attach" onChange={e => { const p = [...(e.target.files ?? [])]; e.target.value = ''; addFiles(p); }} />
        <ul className="mk-files" aria-live="polite" style={{ display: files.length ? '' : 'none' }}>
          {files.map(f => (
            <li key={f.key} className="mk-file">
              <Clip /><span className="nm">{f.file.name}</span><span className="sz">{fsize(f.file.size)}</span>
              {f.signed && <span className="mk-sig-tag">Signed</span>}
              <button type="button" className="rm" aria-label={`Remove ${f.file.name}`} onClick={() => setFiles(prev => prev.filter(x => x.key !== f.key))}>×</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="mk-compose-row">
        <div style={{ flex: 1 }} />
        <button className="mk-btn primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save to history'}</button>
      </div>

      {signing && (
        <Suspense fallback={null}>
          <ESignDialog
            files={files}
            onAdd={addFiles}
            onClose={() => setSigning(false)}
            onSigned={(key, file, signed) => {
              setFiles(prev => prev.map(f => (f.key === key ? { key: f.key, file, signed } : f)));
              setSigning(false);
              toast.success(`${file.name} is ready. Save to history to keep it.`);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
