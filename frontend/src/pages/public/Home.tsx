import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Building2, Shield, ArrowRight, Search, MapPin, Zap, Users } from 'lucide-react';
import { orgAPI } from '../../lib/api';
import { useI18n } from '../../lib/i18n';

export default function Home() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [searchRef, setSearchRef] = useState('');
  const nav = useNavigate();
  const { t } = useI18n();

  useEffect(() => { orgAPI.getPublic().then(r => setOrgs(r.data.organizations)).catch(() => {}); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchRef.trim()) nav(`/appointments/${searchRef.trim()}`);
  };

  const categoryIcons: Record<string, string> = { government: '🏛️', healthcare: '🏥', education: '🎓', finance: '🏦', salon: '💇', legal: '⚖️', other: '🏢' };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Skip the queue. Book ahead.</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight mb-5 leading-[1.1]">
              {t('home.hero.title1')}<br/><span className="text-amber-300">{t('home.hero.title2')}</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8 max-w-xl leading-relaxed">
              {t('home.hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/book" className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 rounded-xl px-6 py-3.5 font-semibold hover:bg-primary-50 transition-all shadow-lg shadow-primary-900/30">
                {t('home.hero.cta')} <ArrowRight className="w-4 h-4" />
              </Link>
              <form onSubmit={handleSearch} className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 px-4 py-2">
                <Search className="w-4 h-4 text-primary-200 mr-2" />
                <input value={searchRef} onChange={e => setSearchRef(e.target.value)}
                  placeholder={t('home.hero.trackPlaceholder')} className="bg-transparent outline-none text-sm flex-1 placeholder:text-primary-200 min-w-[180px]" />
                <button type="submit" className="text-sm font-medium text-amber-300 hover:text-amber-200 ml-2">{t('home.hero.track')}</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-3">{t('home.howItWorks')}</h2>
            <p className="text-slate-500 max-w-lg mx-auto">Three simple steps to skip the queue</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Building2, title: t('home.step1'), desc: 'Select from government offices, clinics, salons, banks and more', color: 'bg-blue-50 text-blue-600' },
              { icon: Calendar, title: t('home.step2'), desc: 'Browse available slots and pick what works for you', color: 'bg-emerald-50 text-emerald-600' },
              { icon: Clock, title: t('home.step3'), desc: 'Receive instant confirmation with QR code and token number', color: 'bg-amber-50 text-amber-600' },
            ].map((f, i) => (
              <div key={i} className="group text-center p-8 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-lg transition-all bg-white dark:bg-slate-800">
                <div className={`w-14 h-14 ${f.color} rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-primary-600 mb-2">Step {i + 1}</div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Organizations */}
      {orgs.length > 0 && (
        <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('home.orgs')}</h2>
                <p className="text-slate-500">Book appointments at these organizations</p>
              </div>
              <Link to="/book" className="btn-primary hidden md:inline-flex">{t('common.viewAll')} <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {orgs.map(org => (
                <Link key={org._id} to={`/book?org=${org._id}`}
                  className="card p-6 hover:shadow-md hover:border-primary-200 transition-all group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: org.branding?.primaryColor + '15' }}>
                      {categoryIcons[org.category] || '🏢'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 transition-colors truncate">{org.name}</h3>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{org.description || 'Book an appointment'}</p>
                      <span className="inline-block mt-3 text-xs font-medium text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full capitalize">{org.category}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="py-16 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: Building2, value: `${orgs.length}+`, label: t('admin.organizations') },
              { icon: MapPin, value: '50+', label: t('admin.branches') },
              { icon: Users, value: '10k+', label: t('admin.totalBookings') },
              { icon: Shield, value: '99.9%', label: 'Uptime' },
            ].map((s, i) => (
              <div key={i}>
                <s.icon className="w-6 h-6 mx-auto mb-3 text-primary-400" />
                <div className="font-display text-3xl font-bold mb-1">{s.value}</div>
                <div className="text-sm text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-slate-900 dark:text-white">{t('app.name')}</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} {t('app.name')}. {t('app.tagline')}.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Built by{' '}
            <a href="https://github.com/raazkhnl" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600 font-medium">
              RaaZ Khanal @raazkhnl
            </a>
            {' '}· MIT License
          </p>
        </div>
      </footer>
    </div>
  );
}
