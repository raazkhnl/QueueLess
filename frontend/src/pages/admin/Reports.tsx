import { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, Users, Clock, DollarSign, Star, Calendar } from 'lucide-react';
import { reportsAPI } from '../../lib/api';
import { formatTime, downloadBlob } from '../../lib/utils';
import toast from 'react-hot-toast';

const dayLabels = ['','Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchData = () => {
    setLoading(true);
    reportsAPI.getAnalytics({ dateFrom, dateTo })
      .then(r => setData(r.data)).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(fetchData, [dateFrom, dateTo]);

  const handleExportExcel = async () => {
    try {
      const { data: blob } = await reportsAPI.exportExcel({ dateFrom, dateTo });
      downloadBlob(blob, `queueless-report-${dateFrom}-${dateTo}.xlsx`);
      toast.success('Excel report downloaded');
    } catch { toast.error('Export failed'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;

  const o = data?.overview || {};
  const completionRate = o.total ? Math.round((o.completed / o.total) * 100) : 0;
  const noShowRate = o.total ? Math.round((o.noShow / o.total) * 100) : 0;
  const cancelRate = o.total ? Math.round((o.cancelled / o.total) * 100) : 0;
  const maxDaily = Math.max(...(data?.dailyTrend?.map((d: any) => d.count) || [1]), 1);
  const fb = data?.feedbackStats || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-6 h-6 text-slate-400" />Reports & Analytics</h1>
        <div className="flex items-center gap-3">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm w-36" />
          <span className="text-slate-400 text-sm">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm w-36" />
          <button onClick={handleExportExcel} className="btn-secondary btn-sm"><Download className="w-4 h-4" />Excel</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Bookings', value: o.total || 0, icon: Calendar, color: 'text-blue-600 bg-blue-50' },
          { label: 'Completed', value: `${completionRate}%`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'No-Show', value: `${noShowRate}%`, icon: Users, color: 'text-red-600 bg-red-50' },
          { label: 'Revenue', value: `NPR ${(o.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-amber-600 bg-amber-50' },
          { label: 'Avg Rating', value: fb.avgRating ? `${fb.avgRating.toFixed(1)}/5` : '—', icon: Star, color: 'text-purple-600 bg-purple-50' },
        ].map(c => (
          <div key={c.label} className="card p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${c.color}`}><c.icon className="w-5 h-5" /></div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{c.value}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Daily Booking Trend</h3>
          {data?.dailyTrend?.length > 0 ? (
            <div className="flex items-end gap-[2px] h-44">
              {data.dailyTrend.map((d: any) => (
                <div key={d._id} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full bg-primary-500 rounded-t-sm hover:bg-primary-600 transition-colors min-h-[2px]"
                    style={{ height: `${(d.count / maxDaily) * 100}%` }} />
                  <div className="absolute -top-10 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {d._id}: {d.count} | NPR {d.revenue || 0}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm text-center py-10">No data</p>}
        </div>

        {/* Service breakdown */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">By Service Type</h3>
          <div className="space-y-3">
            {(data?.serviceBreakdown || []).map((s: any) => {
              const pct = o.total ? Math.round((s.count / o.total) * 100) : 0;
              return (
                <div key={s._id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{s.name || 'Unknown'}</span>
                    <span className="text-slate-500">{s.count} ({pct}%) · NPR {s.revenue}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.color || '#3b82f6' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-slate-400" />Peak Hours</h3>
          <div className="space-y-2">
            {(data?.hourlyDistribution || []).slice(0, 8).map((h: any, i: number) => {
              const max = data.hourlyDistribution[0]?.count || 1;
              return (
                <div key={h._id} className="flex items-center gap-3">
                  <span className="w-14 text-sm font-mono text-slate-500">{formatTime(h._id)}</span>
                  <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden">
                    <div className={`h-full rounded ${i === 0 ? 'bg-red-500' : i < 3 ? 'bg-amber-500' : 'bg-blue-500'}`}
                      style={{ width: `${(h.count / max) * 100}%` }} />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{h.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekday distribution */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">By Day of Week</h3>
          <div className="flex items-end gap-3 h-40">
            {(data?.weekdayDistribution || []).map((w: any) => {
              const max = Math.max(...(data.weekdayDistribution.map((d: any) => d.count) || [1]));
              return (
                <div key={w._id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{w.count}</span>
                  <div className="w-full bg-primary-500 rounded-t" style={{ height: `${(w.count / max) * 100}%`, minHeight: '4px' }} />
                  <span className="text-[10px] text-slate-500">{dayLabels[w._id]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overview table */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Period Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Completed', value: o.completed || 0, pct: completionRate },
            { label: 'Cancelled', value: o.cancelled || 0, pct: cancelRate },
            { label: 'No-Show', value: o.noShow || 0, pct: noShowRate },
            { label: 'Pending', value: o.pending || 0, pct: o.total ? Math.round((o.pending/o.total)*100) : 0 },
            { label: 'Guest Bookings', value: o.guests || 0, pct: o.total ? Math.round((o.guests/o.total)*100) : 0 },
            { label: 'Virtual', value: o.virtual || 0, pct: o.total ? Math.round((o.virtual/o.total)*100) : 0 },
            { label: 'Total Revenue', value: `NPR ${(o.totalRevenue||0).toLocaleString()}`, pct: null },
            { label: 'Feedback', value: `${fb.total || 0} reviews`, pct: null },
          ].map(item => (
            <div key={item.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="text-lg font-bold text-slate-900 dark:text-white">{item.value}{item.pct !== null && item.pct !== undefined ? ` (${item.pct}%)` : ''}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
