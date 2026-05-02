import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { transparencyAPI } from '../../lib/api';
import { Eye, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Transparency() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transparencyAPI.get().then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto p-12 text-center text-slate-500">Loading transparency board…</div>;
  if (!data) return <div className="max-w-4xl mx-auto p-12 text-center text-slate-500">Transparency data unavailable.</div>;

  const apt = data.appointments;
  const tk = data.tickets;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <header className="mb-6 flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Eye className="w-6 h-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Public Transparency Board</h1>
          <p className="text-slate-500">Anonymised aggregate stats for the past {data.windowDays} days. Mandated by Nepal's Right-to-Information Act.</p>
        </div>
      </header>

      <section className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card label="Active organizations" value={data.orgsActive} icon={Building2} color="bg-blue-50 text-blue-700" />
        <Card label="Appointments completed" value={apt.completed} sub={`out of ${apt.total}`} icon={CheckCircle2} color="bg-emerald-50 text-emerald-700" />
        <Card label="Open tickets" value={tk.byStatus?.open || 0} icon={AlertCircle} color="bg-amber-50 text-amber-700" />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Appointments by status</h3>
          <Distribution data={apt.byStatus} />
          {apt.completionRate !== null && (
            <p className="mt-3 text-sm text-slate-500">Completion rate: <strong className="text-emerald-700">{apt.completionRate}%</strong></p>
          )}
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Tickets by priority</h3>
          <Distribution data={tk.byPriority} />
          {tk.avgResolutionHours != null && (
            <p className="mt-3 text-sm text-slate-500">Avg resolution: <strong>{tk.avgResolutionHours} hours</strong></p>
          )}
        </div>
      </section>

      <p className="text-[11px] text-slate-400 mt-6">Generated {new Date(data.generatedAt).toLocaleString()}. Data refreshed continuously. <Link to="/" className="text-primary-600 hover:underline">Return home</Link></p>
    </div>
  );
}

function Card({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${color}`}><Icon className="w-5 h-5" /></div>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function Distribution({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data || {});
  const total = entries.reduce((a, [, n]) => a + n, 0) || 1;
  if (entries.length === 0) return <p className="text-xs text-slate-400">No data in window</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {entries.map(([k, n]) => (
        <li key={k}>
          <div className="flex justify-between text-xs text-slate-600 mb-0.5">
            <span className="capitalize">{k.replace('_', ' ')}</span>
            <span>{n} <span className="text-slate-400">({Math.round((n / total) * 100)}%)</span></span>
          </div>
          <div className="bg-slate-100 dark:bg-slate-700 rounded h-2"><div className="h-2 bg-indigo-500 rounded" style={{ width: `${(n / total) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
