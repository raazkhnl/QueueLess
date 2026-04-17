import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Building2, GitBranch, Clock, TrendingUp, CheckCircle2, AlertCircle, ArrowRight, BarChart3, Star } from 'lucide-react';
import { adminAPI, appointmentAPI } from '../../lib/api';
import Onboarding from '../../components/ui/Onboarding';

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminAPI.getDashboard(),
      appointmentAPI.getAnalytics().catch(() => ({ data: null }))
    ]).then(([s, a]) => {
      setStats(s.data);
      setAnalytics(a.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!stats) return <p className="text-slate-500 text-center py-10">Failed to load dashboard</p>;

  const cards = [
    { label: 'Total Bookings', value: stats.totalBookings, icon: Calendar, color: 'bg-blue-50 text-blue-600 ring-blue-200', link: '/admin/bookings' },
    { label: "Today's Bookings", value: stats.todayBookings, icon: Clock, color: 'bg-emerald-50 text-emerald-600 ring-emerald-200', link: '/admin/bookings?date=today' },
    { label: 'This Month', value: stats.monthBookings, icon: TrendingUp, color: 'bg-amber-50 text-amber-600 ring-amber-200', link: '/admin/bookings' },
    { label: 'Pending Approval', value: stats.pendingBookings, icon: AlertCircle, color: 'bg-red-50 text-red-600 ring-red-200', link: '/admin/bookings?status=pending', highlight: stats.pendingBookings > 0 },
    { label: 'Organizations', value: stats.totalOrgs, icon: Building2, color: 'bg-purple-50 text-purple-600 ring-purple-200', link: '/admin/organizations' },
    { label: 'Branches', value: stats.totalBranches, icon: GitBranch, color: 'bg-cyan-50 text-cyan-600 ring-cyan-200', link: '/admin/branches' },
    { label: 'Users', value: stats.totalUsers, icon: Users, color: 'bg-pink-50 text-pink-600 ring-pink-200', link: '/admin/users' },
  ];

  const maxTrend = Math.max(...(stats.dailyTrend?.map((d: any) => d.count) || [1]), 1);
  const noShow = analytics?.noShowRate || {};
  const noShowPct = noShow.total ? Math.round((noShow.noShows / noShow.total) * 100) : 0;
  const completionPct = noShow.total ? Math.round((noShow.completed / noShow.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <Onboarding />

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <button onClick={() => nav('/admin/bookings')} className="btn-primary btn-sm">View All Bookings <ArrowRight className="w-4 h-4" /></button>
      </div>

      {/* Stat cards - all clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <button key={c.label} onClick={() => nav(c.link)}
            className={`card p-5 text-left hover:shadow-md hover:border-slate-300 transition-all group ${c.highlight ? 'ring-2 ring-red-300 animate-pulse' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${c.color}`}><c.icon className="w-5 h-5" /></div>
              <ArrowRight className="w-4 h-4 text-slate-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{c.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Booking Trend - clickable */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Booking Trend (30 days)</h3>
            <button onClick={() => nav('/admin/bookings')} className="text-xs text-primary-600 hover:text-primary-700 font-medium">View details →</button>
          </div>
          {stats.dailyTrend?.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {stats.dailyTrend.map((d: any) => (
                <button key={d._id} onClick={() => nav(`/admin/bookings?date=${d._id}`)}
                  className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full bg-primary-500 rounded-t transition-all hover:bg-primary-600 cursor-pointer min-h-[2px]"
                    style={{ height: `${(d.count / maxTrend) * 100}%` }} />
                  <div className="absolute -top-8 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {d._id}: {d.count} bookings
                  </div>
                </button>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm py-8 text-center">No data yet</p>}
        </div>

        {/* Status Breakdown - clickable */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Status Breakdown</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.statusBreakdown || {}).map(([status, count]: [string, any]) => {
              const total = Object.values(stats.statusBreakdown).reduce((a: any, b: any) => a + b, 0) as number;
              const pct = total ? Math.round((count / total) * 100) : 0;
              const colors: Record<string, string> = { confirmed: 'bg-blue-500', completed: 'bg-emerald-500', pending: 'bg-amber-500', cancelled: 'bg-red-500', no_show: 'bg-slate-500', checked_in: 'bg-cyan-500', in_progress: 'bg-indigo-500' };
              return (
                <button key={status} onClick={() => nav(`/admin/bookings?status=${status}`)} className="block w-full text-left hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize text-slate-700">{status.replace('_',' ')}</span>
                    <span className="font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${colors[status] || 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Analytics panel */}
        {analytics && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-slate-400" />Analytics</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{completionPct}%</p>
                <p className="text-xs text-emerald-600">Completion Rate</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{noShowPct}%</p>
                <p className="text-xs text-red-600">No-Show Rate</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{Math.round(analytics.avgWaitTime || 0)}</p>
                <p className="text-xs text-blue-600">Avg Wait (min)</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{analytics.peakHours?.[0]?._id || '—'}</p>
                <p className="text-xs text-amber-600">Peak Hour</p>
              </div>
            </div>
            {analytics.revenueData?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Revenue (30 days)</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">NPR {analytics.revenueData.reduce((s: number, r: any) => s + r.revenue, 0).toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        {/* Branch Stats - clickable */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Top Branches (This Month)</h3>
            <button onClick={() => nav('/admin/branches')} className="text-xs text-primary-600 hover:text-primary-700 font-medium">Manage →</button>
          </div>
          {stats.branchStats?.length > 0 ? (
            <div className="space-y-2">
              {stats.branchStats.map((b: any, i: number) => (
                <button key={i} onClick={() => nav(`/admin/bookings?branch=${b._id}`)} className="flex items-center gap-3 w-full hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors">
                  <span className="w-6 text-right text-xs text-slate-400 font-medium">{i + 1}</span>
                  <div className="flex-1 bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{b.branchName}</span>
                    <span className="text-sm font-bold text-primary-600">{b.count}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : <p className="text-slate-400 text-sm py-4 text-center">No data yet</p>}
        </div>
      </div>
    </div>
  );
}
