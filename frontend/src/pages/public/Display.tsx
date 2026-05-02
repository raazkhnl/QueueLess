import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { displayAPI } from '../../lib/api';

const REFRESH_MS = 5000;

export default function Display() {
  const { code } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const lastSpoken = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      if (!code) return;
      displayAPI.getBranch(code)
        .then((r) => { if (!mounted) return; setData(r.data); setError(null); })
        .catch((e) => { if (!mounted) return; setError(e.response?.data?.message || 'Display unavailable'); });
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => { mounted = false; clearInterval(id); clearInterval(t); };
  }, [code]);

  // Voice announce when the now-serving token changes
  useEffect(() => {
    const top = data?.nowServing?.[0];
    if (!top || !('speechSynthesis' in window)) return;
    if (lastSpoken.current === top.tokenNumber) return;
    lastSpoken.current = top.tokenNumber;
    const utter = new SpeechSynthesisUtterance(`Token ${top.tokenNumber}, ${top.service || ''}, please proceed${top.roomNo ? ' to ' + top.roomNo : ''}`);
    utter.rate = 0.9;
    try { window.speechSynthesis.speak(utter); } catch {}
  }, [data?.nowServing]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">
        <div className="text-center"><h1 className="text-3xl font-bold">{error}</h1><p className="text-slate-400 mt-2">Branch code: {code}</p></div>
      </div>
    );
  }
  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white"><div className="animate-pulse">Loading display…</div></div>;
  }

  const top = data.nowServing?.[0];
  const next = data.next || [];
  const recent = data.recentlyCompleted || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-4 md:p-8 font-display">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">{data.branch.name}</h1>
          {data.branch.nameNp && <p className="text-lg md:text-2xl text-indigo-200">{data.branch.nameNp}</p>}
          {data.branch.organization?.name && <p className="text-sm text-slate-400 mt-1">{data.branch.organization.name}</p>}
        </div>
        <div className="text-right">
          <p className="text-3xl md:text-5xl font-mono font-bold">{now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          <p className="text-sm text-slate-400">{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </header>

      {/* Now-serving — hero */}
      <section className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-8 mb-6">
        <p className="uppercase text-amber-400 text-sm font-semibold tracking-widest mb-1">Now serving</p>
        {top ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-7xl md:text-9xl font-extrabold leading-none">{top.tokenNumber}</div>
              <p className="text-xl md:text-2xl text-slate-200 mt-2">{top.service || top.serviceNp || 'Service'}</p>
              <p className="text-slate-400 text-sm">{top.maskedName}</p>
            </div>
            {top.roomNo && (
              <div className="text-right">
                <p className="text-amber-300 text-sm uppercase tracking-wider">Counter</p>
                <p className="text-5xl md:text-7xl font-bold text-amber-300">{top.roomNo}</p>
                {top.roomNoNp && <p className="text-xl text-amber-400/80">{top.roomNoNp}</p>}
              </div>
            )}
          </div>
        ) : (
          <p className="text-3xl text-slate-400">— Waiting for next token —</p>
        )}
      </section>

      {/* Next + Recent */}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <p className="uppercase text-emerald-400 text-sm font-semibold tracking-widest mb-3">Up next</p>
          {next.length === 0 ? (
            <p className="text-slate-400">No one waiting</p>
          ) : (
            <ul className="space-y-2">
              {next.map((a: any) => (
                <li key={a.refCode} className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div>
                    <p className="font-mono text-2xl font-bold">#{a.tokenNumber}</p>
                    <p className="text-sm text-slate-300 truncate">{a.service}</p>
                  </div>
                  {a.roomNo && <span className="text-amber-300 font-bold">{a.roomNo}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-6">
          <p className="uppercase text-slate-400 text-sm font-semibold tracking-widest mb-3">Recently completed</p>
          {recent.length === 0 ? (
            <p className="text-slate-500">—</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((a: any) => (
                <li key={a.refCode} className="flex items-center justify-between border-b border-white/5 pb-2 opacity-70">
                  <p className="font-mono text-xl">#{a.tokenNumber}</p>
                  <p className="text-xs text-slate-400 truncate">{a.service}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="mt-6 flex items-center justify-between text-xs text-slate-500">
        <p>Live · refreshes every {REFRESH_MS / 1000}s · {data.totals.served}/{data.totals.scheduled} served · {data.totals.waiting} waiting</p>
        <p>Powered by QueueLess</p>
      </footer>
    </div>
  );
}
