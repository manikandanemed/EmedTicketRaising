import React, { useEffect, useRef, useState } from 'react';
import { toast } from '../services/toast';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { PendingFile } from './AddHistory';
import { MAX_FILE } from './helpers';
import { Clip, Dlg } from './ui';

const SIG_FONT = `"Dancing Script","Segoe Script","Brush Script MT","Lucida Handwriting","Apple Chancery",cursive`;
const SIG_W = 0.26; // signature width as a share of the page width
const signable = (f: File) => /^(application\/pdf|image\/(png|jpe?g))$/i.test(f.type);

// the PDF libraries are only downloaded when this dialog is opened (it is itself lazy-loaded)
let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;
function loadPdfjs() {
  pdfjsPromise ??= (async () => {
    const [lib, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  })();
  pdfjsPromise.catch(() => { pdfjsPromise = null; });
  return pdfjsPromise;
}

/** Crops a canvas to its drawn pixels. Returns null when nothing is drawn. */
function trimCanvas(c: HTMLCanvasElement): HTMLCanvasElement | null {
  const x = c.getContext('2d')!;
  const { width: w, height: h } = c;
  const d = x.getImageData(0, 0, w, h).data;
  let t = h, l = w, r = -1, b = -1;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    if (d[(y * w + i) * 4 + 3] > 8) { if (y < t) t = y; if (y > b) b = y; if (i < l) l = i; if (i > r) r = i; }
  }
  if (r < 0) return null;
  const pad = 6;
  const o = document.createElement('canvas');
  o.width = r - l + 1 + pad * 2;
  o.height = b - t + 1 + pad * 2;
  o.getContext('2d')!.drawImage(c, l, t, r - l + 1, b - t + 1, pad, pad, r - l + 1, b - t + 1);
  return o;
}

const dataToBytes = (d: string): Uint8Array => {
  const b = atob(d.slice(d.indexOf(',') + 1));
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
};

interface Props {
  files: PendingFile[];
  onAdd: (picked: File[]) => PendingFile[];
  onClose: () => void;
  onSigned: (key: number, file: File, signed: { by: string; at: string }) => void;
}

export default function ESignDialog({ files, onAdd, onClose, onSigned }: Props) {
  const docs = files.filter(f => signable(f.file) && !f.signed);
  const [selKey, setSelKey] = useState<number | null>(docs[0]?.key ?? null);
  const current = files.find(f => f.key === selKey && signable(f.file) && !f.signed) ?? null;

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [src, setSrc] = useState<Uint8Array | null>(null);
  const [docMsg, setDocMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [mark, setMark] = useState<{ page: number; fx: number; fy: number } | null>(null);
  const [view, setView] = useState({ w: 0, h: 0 });

  const [name, setName] = useState('');
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typed, setTyped] = useState('');
  const [ink, setInk] = useState(0); // bumps on every stroke so the preview refreshes
  const [preview, setPreview] = useState<string | null>(null);
  const [errName, setErrName] = useState('');
  const [errSig, setErrSig] = useState('');
  const [errPlace, setErrPlace] = useState('');
  const [busy, setBusy] = useState(false);

  const padRef = useRef<HTMLCanvasElement>(null);
  const hasInk = useRef(false);
  const pageCanvas = useRef<HTMLCanvasElement>(null);
  const viewBox = useRef<HTMLDivElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const loadTask = useRef<{ destroy: () => unknown } | null>(null);

  /** The signature as a trimmed canvas, or null when empty. */
  const sigImage = (): HTMLCanvasElement | null => {
    if (mode === 'draw') return hasInk.current && padRef.current ? trimCanvas(padRef.current) : null;
    if (!typed.trim()) return null;
    const c = document.createElement('canvas');
    c.width = 1400; c.height = 260;
    const x = c.getContext('2d')!;
    x.fillStyle = '#111827';
    x.font = `600 110px ${SIG_FONT}`;
    x.textBaseline = 'middle';
    x.fillText(typed.trim(), 20, 130, 1360);
    return trimCanvas(c);
  };

  // ----- signature pad -----
  useEffect(() => {
    if (mode !== 'draw') return;
    const pad = padRef.current;
    if (!pad) return;
    const dpr = window.devicePixelRatio || 1;
    pad.width = pad.clientWidth * dpr;
    pad.height = 150 * dpr;
    const ctx = pad.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827'; ctx.fillStyle = '#111827';
    hasInk.current = false;
    setPreview(null);
    let down = false;
    let last = { x: 0, y: 0 };
    const pt = (e: PointerEvent) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onDown = (e: PointerEvent) => { down = true; pad.setPointerCapture(e.pointerId); last = pt(e); ctx.beginPath(); ctx.arc(last.x, last.y, 1.1, 0, 7); ctx.fill(); hasInk.current = true; };
    const onMove = (e: PointerEvent) => { if (!down) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; hasInk.current = true; };
    const onUp = () => { if (down) { down = false; setErrSig(''); setInk(n => n + 1); } };
    pad.addEventListener('pointerdown', onDown);
    pad.addEventListener('pointermove', onMove);
    pad.addEventListener('pointerup', onUp);
    pad.addEventListener('pointercancel', onUp);
    return () => {
      pad.removeEventListener('pointerdown', onDown); pad.removeEventListener('pointermove', onMove);
      pad.removeEventListener('pointerup', onUp); pad.removeEventListener('pointercancel', onUp);
    };
  }, [mode]);

  // refresh the little signature preview that follows the click position on the page
  useEffect(() => {
    const img = sigImage();
    setPreview(img ? img.toDataURL() : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ink, typed, mode]);
  useEffect(() => {
    if (mode === 'type' && document.fonts?.load) document.fonts.load(`600 110px "Dancing Script"`).then(() => setInk(n => n + 1), () => { /* fallback font */ });
  }, [mode]);

  const clearSig = () => {
    if (mode === 'draw') {
      const pad = padRef.current;
      if (pad) { pad.getContext('2d')!.clearRect(0, 0, pad.width, pad.height); }
      hasInk.current = false;
    } else setTyped('');
    setPreview(null);
    setInk(n => n + 1);
  };

  // ----- load the chosen document -----
  useEffect(() => {
    let cancelled = false;
    setPdf(null); setSrc(null); setMark(null); setDocMsg(null); setCount(0);
    if (!current) return;
    const f = current.file;
    setDocMsg(`Opening ${f.name}…`);
    (async () => {
      try {
        const [lib, { PDFDocument }] = await Promise.all([loadPdfjs(), import('pdf-lib')]);
        let bytes = new Uint8Array(await f.arrayBuffer());
        if (f.type !== 'application/pdf') { // turn an image into a one-page PDF
          const doc = await PDFDocument.create();
          const img = /png$/i.test(f.type) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
          let w = img.width * 0.75, h = img.height * 0.75;
          const k = Math.min(1, 842 / Math.max(w, h));
          w *= k; h *= k;
          doc.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
          bytes = new Uint8Array(await doc.save());
        }
        const task = lib.getDocument({ data: bytes.slice() });
        loadTask.current?.destroy();
        loadTask.current = task;
        const loaded = await task.promise;
        if (cancelled) { task.destroy(); return; }
        setSrc(bytes); setPdf(loaded); setCount(loaded.numPages); setPage(loaded.numPages);
        setMark({ page: loaded.numPages, fx: 0.72, fy: 0.86 });
        setDocMsg(null);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        const loadFail = err instanceof TypeError && /fetch|import|module/i.test(err.message);
        setDocMsg(loadFail
          ? 'Couldn’t load the PDF tools. Check your connection and try again.'
          : 'This file couldn’t be opened. It may be password-protected or damaged.');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.key]);

  // ----- draw the current page -----
  useEffect(() => {
    if (!pdf) return;
    let task: RenderTask | null = null;
    let cancelled = false;
    (async () => {
      const p = await pdf.getPage(page);
      if (cancelled) return;
      const vp1 = p.getViewport({ scale: 1 });
      const box = viewBox.current;
      const fitW = Math.min(560, Math.max(240, (box?.clientWidth ?? 560) - 26));
      const fitH = Math.max(300, Math.min(520, window.innerHeight * 0.55));
      const scale = Math.min(fitW / vp1.width, fitH / vp1.height);
      const dpr = window.devicePixelRatio || 1;
      const vp = p.getViewport({ scale: scale * dpr });
      const c = pageCanvas.current;
      if (!c) return;
      c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      c.style.width = `${vp.width / dpr}px`; c.style.height = `${vp.height / dpr}px`;
      setView({ w: vp.width / dpr, h: vp.height / dpr });
      task = p.render({ canvas: c, viewport: vp });
      try { await task.promise; } catch { /* cancelled by a newer render */ }
    })();
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, page]);

  useEffect(() => () => { loadTask.current?.destroy(); }, []);

  const onPageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMark({ page, fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height });
    setErrPlace('');
  };

  const markStyle = (): React.CSSProperties | null => {
    if (!mark || mark.page !== page || !view.w) return null;
    const w = view.w * SIG_W;
    const img = sigImage();
    const h = img ? (w * img.height) / img.width : w / 3;
    return { left: mark.fx * view.w - w / 2, top: mark.fy * view.h - h / 2, width: w, height: h };
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = [...(e.target.files ?? [])].filter(signable);
    e.target.value = '';
    if (!picked.length) { toast.error('Choose a PDF, PNG or JPG file'); return; }
    const added = onAdd(picked.slice(0, 1));
    if (added.length) setSelKey(added[0].key);
  };

  // ----- sign -----
  const sign = async () => {
    if (busy) return;
    const img = sigImage();
    let bad: HTMLElement | null = null;
    const nm = name.trim();
    if (!nm) { setErrName('Enter the signer’s name.'); bad ??= document.getElementById('es-name'); }
    if (!img) { setErrSig(mode === 'draw' ? 'Draw a signature in the box.' : 'Type a signature.'); bad ??= document.getElementById('es-sig'); }
    if (!pdf || !src || !current) { toast.error('Choose or upload a document to sign'); return; }
    if (!mark) { setErrPlace('Click on the page to place the signature.'); bad ??= viewBox.current; }
    if (bad || !img || !mark) { bad?.focus?.(); return; }

    setBusy(true);
    try {
      const at = new Date();
      const capt = `Signed by ${nm} · ${at.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
      // the signature with a caption underneath, drawn as one image so any language works
      const stamp = document.createElement('canvas');
      const fs = Math.max(18, Math.round(img.height * 0.16));
      const cx = stamp.getContext('2d')!;
      cx.font = `${fs}px system-ui,sans-serif`;
      const cw = Math.ceil(cx.measureText(capt).width);
      stamp.width = Math.max(img.width, cw + 8);
      stamp.height = img.height + fs + 14;
      const sx = stamp.getContext('2d')!;
      sx.drawImage(img, 0, 0);
      sx.strokeStyle = '#9ca3af'; sx.lineWidth = 2;
      sx.beginPath(); sx.moveTo(0, img.height + 3); sx.lineTo(stamp.width, img.height + 3); sx.stroke();
      sx.fillStyle = '#4b5563'; sx.font = `${fs}px system-ui,sans-serif`; sx.textBaseline = 'top';
      sx.fillText(capt, 2, img.height + 9);

      const { PDFDocument, degrees } = await import('pdf-lib');
      const doc = await PDFDocument.load(src, { ignoreEncryption: true });
      const pg = doc.getPage(mark.page - 1);
      const png = await doc.embedPng(dataToBytes(stamp.toDataURL('image/png')));
      const rot = ((pg.getRotation().angle % 360) + 360) % 360;
      const { width: pw, height: ph } = pg.getSize();
      const vw = rot % 180 ? ph : pw, vh = rot % 180 ? pw : ph; // page size as shown
      const sigW = vw * SIG_W;
      const w = (sigW * stamp.width) / img.width;
      const h = (w * stamp.height) / stamp.width;
      const vx = Math.min(Math.max(mark.fx * vw - sigW / 2, 4), vw - w - 4);
      const vy = Math.min(Math.max(mark.fy * vh - (sigW * img.height) / img.width / 2, 4), vh - h - 4);
      // map from the shown (top-left) corner to PDF space for each rotation
      if (rot === 0) pg.drawImage(png, { x: vx, y: ph - vy - h, width: w, height: h });
      else if (rot === 90) pg.drawImage(png, { x: vy + h, y: vx, width: w, height: h, rotate: degrees(90) });
      else if (rot === 180) pg.drawImage(png, { x: pw - vx, y: vy + h, width: w, height: h, rotate: degrees(180) });
      else pg.drawImage(png, { x: pw - vy - h, y: ph - vx, width: w, height: h, rotate: degrees(270) });

      const out = await doc.save();
      if (out.length > MAX_FILE) { toast.error('The signed file is over 10 MB. Try a smaller document.'); return; }
      const base = current.file.name.replace(/\.(pdf|png|jpe?g)$/i, '');
      const file = new File([out as BlobPart], `${base}-signed.pdf`, { type: 'application/pdf' });
      onSigned(current.key, file, { by: nm, at: at.toISOString() });
    } catch (err) {
      console.error(err);
      toast.error('Couldn’t sign this document. Try again or use a different file.');
    } finally {
      setBusy(false);
    }
  };

  const ms = markStyle();

  return (
    <Dlg label="E-sign a document" onClose={onClose} className="es-dlg">
      <div className="mk-dlg-body">
        <h2 style={{ margin: 0 }}>E-sign a document</h2>
        <div className="mk-field">
          <label htmlFor="es-doc">Document</label>
          <div className="mk-attach-row">
            <select id="es-doc" style={{ width: 'auto', minWidth: 240, maxWidth: '100%' }} disabled={!docs.length} value={current?.key ?? ''} onChange={e => setSelKey(Number(e.target.value))}>
              {docs.length ? docs.map(d => <option key={d.key} value={d.key}>{d.file.name}</option>) : <option value="">No PDF or image attached yet</option>}
            </select>
            <button type="button" className="mk-btn sm" onClick={() => upload.current?.click()}><Clip />Upload a document</button>
          </div>
          <input ref={upload} type="file" accept="application/pdf,image/png,image/jpeg" hidden aria-label="Upload a document to sign" onChange={onUpload} />
          <div className="hint">PDF, PNG or JPG, up to 10 MB. The signed copy is saved as a PDF and replaces the original in your attachments.</div>
        </div>

        <div className="mk-field">
          <label htmlFor="es-name">Signer name *</label>
          <input id="es-name" autoComplete="name" placeholder="e.g. Priya Raman" className={errName ? 'invalid' : ''} value={name}
            onChange={e => { setName(e.target.value); setErrName(''); }} />
          <div className="err" role="alert">{errName}</div>
        </div>

        <div className="mk-field">
          <span className="mk-label">Signature *</span>
          <div className="mk-sig-tools">
            <div className="mk-chips" style={{ margin: 0 }} role="group" aria-label="Signature type">
              <button type="button" className="mk-chip" aria-pressed={mode === 'draw'} onClick={() => { setMode('draw'); setErrSig(''); }}>Draw</button>
              <button type="button" className="mk-chip" aria-pressed={mode === 'type'} onClick={() => { setMode('type'); setErrSig(''); }}>Type</button>
            </div>
            <button type="button" className="mk-btn sm" onClick={clearSig}>Clear</button>
          </div>
          <div id="es-sig" tabIndex={-1}>
            {mode === 'draw' ? (
              <>
                <canvas ref={padRef} className="mk-sigpad" aria-label="Draw your signature here" />
                <div className="hint">Sign with your mouse, trackpad or finger.</div>
              </>
            ) : (
              <>
                <input aria-label="Type your signature" placeholder="Type your name" value={typed} onChange={e => { setTyped(e.target.value); setErrSig(''); }} />
                <div className="mk-typed" style={{ fontFamily: SIG_FONT }}>{typed}</div>
              </>
            )}
          </div>
          <div className="err" role="alert">{errSig}</div>
        </div>

        <div className="mk-field">
          <span className="mk-label">Place the signature</span>
          <div className="mk-sig-tools">
            <span className="hint">Click on the page where the signature should go.</span>
            <div className="mk-es-pager">
              <button type="button" className="mk-btn sm" aria-label="Previous page" disabled={!pdf || page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <span aria-live="polite">{pdf ? `Page ${page} of ${count}` : '–'}</span>
              <button type="button" className="mk-btn sm" aria-label="Next page" disabled={!pdf || page >= count} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
          <div className="mk-es-view" ref={viewBox} tabIndex={-1}>
            {!pdf && <div className="mk-es-empty">{docMsg ?? 'Choose or upload a document to sign.'}</div>}
            <div className="mk-es-page" style={{ display: pdf ? undefined : 'none' }} onClick={onPageClick} title="Click to place your signature">
              <canvas ref={pageCanvas} />
              {ms && (
                <div className="mk-es-mark" style={ms}>{preview && <img src={preview} alt="" />}</div>
              )}
            </div>
          </div>
          <div className="err" role="alert">{errPlace}</div>
        </div>
      </div>
      <div className="mk-dlg-foot">
        <button className="mk-btn" onClick={onClose}>Cancel</button>
        <button className="mk-btn primary" disabled={busy} onClick={sign}>{busy ? 'Signing…' : 'Sign and attach'}</button>
      </div>
    </Dlg>
  );
}
