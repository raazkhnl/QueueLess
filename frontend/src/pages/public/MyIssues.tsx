import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AlertCircle, Plus, RefreshCw, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { issueAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useI18n } from '../../lib/i18n';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-blue-100 text-blue-700',
  forwarded: 'bg-violet-100 text-violet-700',
  escalated: 'bg-amber-100 text-amber-700',
  awaiting_user: 'bg-orange-100 text-orange-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-700',
  reopened: 'bg-rose-100 text-rose-700',
};

export default function MyIssues() {
  const { isAuthenticated } = useAuthStore();
  const { t, lang } = useI18n();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    issueAPI.getMy()
      .then((r) => setIssues(r.data.data || []))
      .catch(() => toast.error(t('issue.toast.failed')))
      .finally(() => setLoading(false));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [isAuthenticated]);

  if (!isAuthenticated) return <Navigate to="/login?redirect=/my-issues" replace />;

  const filtered = issues.filter((i) => {
    if (filter === 'open' && ['resolved', 'closed'].includes(i.status)) return false;
    if (filter === 'closed' && !['resolved', 'closed'].includes(i.status)) return false;
    if (search) {
      const re = new RegExp(search, 'i');
      return re.test(i.refCode || '') || re.test(i.description || '') || re.test(i.subject || '') || re.test(i.issueType?.name || '');
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white">{t('issue.list.title')}</h1>
          <p className="text-sm text-slate-500">{t('issue.list.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.location.reload()} className="btn-ghost btn-sm" title={t('issue.action.refresh')} aria-label={t('issue.action.refresh')}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link to="/issue/submit" className="btn-primary btn-sm"><Plus className="w-4 h-4" /> {t('issue.list.new')}</Link>
        </div>
      </div>

      <div className="card p-3 mb-4 flex gap-2 flex-wrap items-center">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {(['all', 'open', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                filter === f ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >{t(`issue.list.filter.${f}`)}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" className="input-field pl-8 py-1.5 text-sm"
            placeholder={t('issue.placeholder.search')}
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-3">{t('issue.list.empty')}</p>
          <Link to="/issue/submit" className="btn-primary btn-sm">{t('issue.list.cta.first')}</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => (
            <Link
              key={i._id}
              to={`/issue/track/${i.refCode}`}
              className="card p-4 hover:border-indigo-300 hover:shadow-sm transition-all flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{i.refCode}</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_COLORS[i.status] || 'bg-slate-100 text-slate-700'}`}>
                    {t(`status.${i.status}`)}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{i.subject || (lang === 'ne' && i.issueType?.nameNp ? i.issueType.nameNp : i.issueType?.name) || t('issue.list.title')}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{i.description}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {(lang === 'ne' && i.organization?.nameNp) ? i.organization.nameNp : i.organization?.name}
                  {i.branch?.name ? ` · ${(lang === 'ne' && i.branch?.nameNp) ? i.branch.nameNp : i.branch.name}` : ''}
                  {' · '}{new Date(i.createdAt).toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-GB')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
