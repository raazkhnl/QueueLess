import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { Camera, CheckCircle2, XCircle, Search } from 'lucide-react';
import { appointmentAPI } from '../../lib/api';

const SCANNER_ELEMENT_ID = 'qr-reader';

export default function CheckIn() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [running, setRunning] = useState(false);
  const [manual, setManual] = useState('');
  const [last, setLast] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (running) return;
    if (!scannerRef.current) scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID);
    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        (decoded) => { handleCode(decoded); },
        () => {}
      );
      setRunning(true);
    } catch (e: any) {
      toast.error(e?.message || 'Camera unavailable');
    }
  };
  const stop = async () => {
    try { await scannerRef.current?.stop(); } catch {}
    setRunning(false);
  };
  useEffect(() => () => { stop(); /* cleanup on unmount */ }, []);

  const handleCode = async (raw: string) => {
    if (busy) return;
    setBusy(true);
    let code = String(raw).trim();
    // Accept full URL or bare ref code
    const m = code.match(/(?:appointments|issue\/track)\/([A-Za-z0-9-/]+)/);
    if (m) code = m[1];
    try {
      const r = await appointmentAPI.getByRefCode(code);
      const apt = r.data.appointment;
      if (!apt) throw new Error('Not found');
      // Auto-progress: pending/confirmed → checked_in
      if (['pending', 'confirmed'].includes(apt.status)) {
        await appointmentAPI.updateStatus(apt._id, { status: 'checked_in' });
        toast.success(`Checked in: ${apt.refCode}`);
        setLast({ ok: true, apt: { ...apt, status: 'checked_in' } });
      } else {
        toast(`Already ${apt.status.replace('_', ' ')}`, { icon: 'ℹ️' });
        setLast({ ok: true, apt });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lookup failed');
      setLast({ ok: false, code });
    } finally { setBusy(false); }
  };

  const onManualSubmit = (e: React.FormEvent) => { e.preventDefault(); if (manual.trim()) handleCode(manual.trim()); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white">QR Check-in</h1>
        <p className="text-sm text-slate-500">Scan a citizen's appointment QR or enter a ref/file number to check them in instantly.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <div id={SCANNER_ELEMENT_ID} className="w-full bg-black rounded-lg overflow-hidden mb-3" style={{ minHeight: 280 }} />
          <div className="flex gap-2">
            {!running ? (
              <button onClick={start} className="btn-primary"><Camera className="w-4 h-4" /> Start camera</button>
            ) : (
              <button onClick={stop} className="btn-secondary">Stop</button>
            )}
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <form onSubmit={onManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={manual} onChange={(e) => setManual(e.target.value)}
                placeholder="Ref code (QL-…) or file number" className="input-field pl-10" />
            </div>
            <button type="submit" className="btn-primary" disabled={!manual.trim() || busy}>Check in</button>
          </form>

          {last && last.ok ? (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded p-3 text-sm">
              <div className="flex items-center gap-2 text-emerald-700 mb-1"><CheckCircle2 className="w-4 h-4" /> Verified</div>
              <p className="font-mono text-xs">{last.apt.refCode}{last.apt.fileNumber ? ` · ${last.apt.fileNumber}` : ''}</p>
              <p className="font-medium">{last.apt.guestName || last.apt.citizen?.name}</p>
              <p className="text-xs text-slate-600">{last.apt.appointmentType?.name || 'Service'} · #{last.apt.tokenNumber}</p>
              <p className="text-xs text-slate-500 mt-1">Status: <strong className="capitalize">{(last.apt.status || '').replace('_',' ')}</strong></p>
            </div>
          ) : last && !last.ok ? (
            <div className="border border-rose-200 bg-rose-50/50 rounded p-3 text-sm">
              <div className="flex items-center gap-2 text-rose-700 mb-1"><XCircle className="w-4 h-4" /> Not found</div>
              <p className="font-mono text-xs">{last.code}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Awaiting first scan…</p>
          )}
        </div>
      </div>
    </div>
  );
}
