import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Building2, Clock, Coins, FileText, ArrowRight } from 'lucide-react';
import { apptTypeAPI } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

const CATEGORIES: Array<{ value: string; label: string; icon: string }> = [
  { value: '',           label: 'All',         icon: '🌐' },
  { value: 'government', label: 'Government',  icon: '🏛️' },
  { value: 'healthcare', label: 'Healthcare',  icon: '🏥' },
  { value: 'education',  label: 'Education',   icon: '🎓' },
  { value: 'finance',    label: 'Finance',     icon: '🏦' },
  { value: 'legal',      label: 'Legal',       icon: '⚖️' },
  { value: 'other',      label: 'Other',       icon: '🏢' },
];

export default function Services() {
  const { lang } = useI18n();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    setLoading(true);
    apptTypeAPI.getPublicCatalogue({ category: category || undefined })
      .then((r) => setServices(r.data.services || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = useMemo(() => {
    if (!search.trim()) return services;
    const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return services.filter((s) =>
      re.test(s.name || '') || re.test(s.nameNp || '') || re.test(s.description || '') || re.test(s.organization?.name || '')
    );
  }, [services, search]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-1">
          {lang === 'ne' ? 'सेवा सूची' : 'Service Catalogue'}
        </h1>
        <p className="text-slate-500">
          {lang === 'ne'
            ? 'सबै सरकारी, स्वास्थ्य, र निजी संस्थाहरूका सेवाहरू एकै ठाउँमा हेर्नुहोस् र बुक गर्नुहोस्।'
            : 'Browse every service offered across organizations — fees, eligibility, and required documents up front.'}
        </p>
      </header>

      <div className="card p-3 mb-5 flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" className="input-field pl-10"
            placeholder={lang === 'ne' ? 'सेवा वा कार्यालय खोज्नुहोस्…' : 'Search by service, organization, or keyword'}
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 overflow-x-auto">
          {CATEGORIES.map((c) => (
            <button
              key={c.value || 'all'}
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
                category === c.value ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              <span className="mr-1">{c.icon}</span>{c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-500">Loading services…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-500">No services match your search.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const totalFee = (s.feeBreakdown || []).reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
            const orgName = lang === 'ne' && s.organization?.nameNp ? s.organization.nameNp : s.organization?.name;
            const serviceName = lang === 'ne' && s.nameNp ? s.nameNp : s.name;
            const orgId = s.organization?._id || s.organization;
            return (
              <Link key={s._id} to={`/book?org=${orgId}&serviceTypeCode=${s.slug}`}
                className="card p-5 hover:border-primary-300 hover:shadow-md transition-all block group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (s.color || '#2563eb') + '15', color: s.color || '#2563eb' }}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors truncate">{serviceName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 flex-shrink-0" />{orgName}
                    </p>
                  </div>
                </div>

                {s.description && <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-3">{s.description}</p>}

                <div className="flex flex-wrap gap-2 text-xs">
                  {totalFee > 0 ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                      <Coins className="w-3 h-3" /> NPR {totalFee}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {lang === 'ne' ? 'निःशुल्क' : 'Free'}
                    </span>
                  )}
                  {s.processingTimeDays > 0 && (
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3" /> {s.processingTimeDays} {lang === 'ne' ? 'दिन' : 'd'}
                    </span>
                  )}
                  {s.requiredDocuments?.length > 0 && (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                      <FileText className="w-3 h-3" /> {s.requiredDocuments.length} {lang === 'ne' ? 'कागजात' : 'docs'}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-primary-600 font-semibold inline-flex items-center gap-1">
                  {lang === 'ne' ? 'बुक गर्नुहोस्' : 'Book this service'} <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
