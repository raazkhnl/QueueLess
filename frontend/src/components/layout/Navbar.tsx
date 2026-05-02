import { useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, Search, Globe, Moon, Sun, AlertCircle, Building2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useI18n } from '../../lib/i18n';
import { useThemeStore } from '../../store/themeStore';

const CitizenSidebar = lazy(() => import('./CitizenSidebar'));

/**
 * Top navigation bar — public surface only.
 *
 * Logged-out: brand · Services · Book · Raise issue · search · theme · lang · Login / Sign up.
 * Logged-in:  brand · Services · Book · Raise issue · search · avatar (opens off-canvas drawer for personal links).
 *
 * The personal links (My Appointments, My Tickets, My Payments, Profile, Logout)
 * live in `CitizenSidebar` to keep this navbar tight regardless of role.
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchRef, setSearchRef] = useState('');
  const { user, isAuthenticated } = useAuthStore();
  const { lang, setLang, t } = useI18n();
  const { dark, toggle: toggleDark } = useThemeStore();
  const nav = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchRef.trim();
    if (!q) return;
    if (/^TKT-/i.test(q)) nav(`/issue/track/${q}`);
    else nav(`/appointments/${q}`);
    setMobileOpen(false);
  };
  const toggleLang = () => setLang(lang === 'en' ? 'ne' : 'en');
  const initial = user?.name?.charAt(0)?.toUpperCase() || '';

  return (
    <>
      <nav
        className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40 dark:bg-slate-900/80 dark:border-slate-700"
        role="navigation" aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand-link">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-lg shadow-primary-600/20 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight block">{t('app.name')}</span>
                <span className="hidden sm:block text-[9px] text-slate-400 dark:text-slate-500 -mt-1 font-bold tracking-[0.15em] uppercase">{t('app.tagline')}</span>
              </div>
            </Link>

            <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 w-72" role="search">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                value={searchRef} onChange={(e) => setSearchRef(e.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                className="bg-transparent text-sm outline-none flex-1 placeholder:text-slate-400"
                aria-label="Search"
              />
            </form>

            <div className="hidden md:flex items-center gap-1.5">
              <Link to="/services" className="btn-ghost btn-sm gap-1"><Building2 className="w-4 h-4" />Services</Link>
              <Link to="/book" className="btn-ghost btn-sm">{t('nav.book')}</Link>
              <Link to="/issue/submit" className="btn-ghost btn-sm gap-1"><AlertCircle className="w-4 h-4" />Raise issue</Link>
              <span className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" aria-hidden="true" />
              <button onClick={toggleDark} className="btn-ghost btn-sm" title="Toggle dark mode" aria-label="Toggle dark mode">
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={toggleLang} className="btn-ghost btn-sm gap-1" title="Switch language" aria-label="Switch language">
                <Globe className="w-4 h-4" /><span className="text-xs font-bold">{lang === 'en' ? 'ने' : 'EN'}</span>
              </button>

              {isAuthenticated ? (
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="ml-1 flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  data-testid="account-menu-trigger"
                  aria-label="Open account menu"
                  aria-haspopup="dialog" aria-expanded={drawerOpen}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {initial}
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                </button>
              ) : (
                <>
                  <Link to="/login" className="btn-ghost btn-sm" data-testid="login-link">{t('nav.login')}</Link>
                  <Link to="/register" className="btn-primary btn-sm" data-testid="signup-link">{t('nav.signup')}</Link>
                </>
              )}
            </div>

            <button
              className="md:hidden p-2"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              <form onSubmit={handleSearch} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 mb-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input value={searchRef} onChange={(e) => setSearchRef(e.target.value)} placeholder="Search ref code…" className="bg-transparent text-sm outline-none flex-1" aria-label="Search" />
              </form>
              <Link to="/services" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Services</Link>
              <Link to="/book" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">{t('nav.book')}</Link>
              <Link to="/issue/submit" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">Raise issue</Link>

              <div className="border-t border-slate-100 dark:border-slate-700 pt-2 mt-2">
                <button onClick={toggleDark} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 w-full">
                  {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}{dark ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button onClick={() => { toggleLang(); setMobileOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800 w-full">
                  <Globe className="w-4 h-4" />{lang === 'en' ? 'नेपाली' : 'English'}
                </button>
              </div>

              {isAuthenticated ? (
                <button
                  onClick={() => { setMobileOpen(false); setDrawerOpen(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 w-full"
                >
                  <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-full flex items-center justify-center text-xs font-bold">{initial}</div>
                  My account
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">{t('nav.login')}</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50">{t('nav.signup')}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {isAuthenticated && (
        <Suspense fallback={null}>
          <CitizenSidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
