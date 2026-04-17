import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { auditLogAPI } from '../../lib/api';
import { formatDate } from '../../lib/utils';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    auditLogAPI.getAll({ page, limit: 30 }).then(r => { setLogs(r.data.logs); setTotal(r.data.total); }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  const actionColors: Record<string, string> = {
    create: 'bg-emerald-100 text-emerald-700', update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700', status_change: 'bg-amber-100 text-amber-700',
    reschedule: 'bg-purple-100 text-purple-700', login: 'bg-slate-100 text-slate-700',
    cancel: 'bg-red-100 text-red-700', bulk_upload: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Shield className="w-6 h-6 text-slate-400" />Audit Logs</h1>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700"><tr>
            {['Time','User','Action','Resource','Details'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
          </tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr> :
            logs.map(l => (
              <tr key={l._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(l.createdAt, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                <td className="px-4 py-3"><p className="font-medium text-sm">{(l.user as any)?.name}</p><p className="text-xs text-slate-400">{(l.user as any)?.email}</p></td>
                <td className="px-4 py-3"><span className={`badge text-[10px] ${actionColors[l.action] || 'bg-slate-100 text-slate-600'}`}>{l.action}</span></td>
                <td className="px-4 py-3 text-slate-500 capitalize">{l.resource}</td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">{l.details}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
        {total > 30 && <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-slate-500">{total} total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary btn-sm">Prev</button>
            <button onClick={() => setPage(p => p+1)} disabled={logs.length<30} className="btn-secondary btn-sm">Next</button>
          </div>
        </div>}
      </div>
    </div>
  );
}
