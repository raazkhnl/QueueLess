import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, LogOut, User, LayoutDashboard, Search, Globe, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useI18n } from '../../lib/i18n';
import { useThemeStore } from '../../store/themeStore';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [searchRef, setSearchRef] = useState('');
  const { user, isAuthenticated, logout } = useAuthStore();
  const { lang, setLang, t } = useI18n();
  const { dark, toggle: toggleDark } = useThemeStore();
  const nav = useNavigate();

  const handleLogout = () => { logout(); nav('/'); };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchRef.trim()) nav(`/appointments/${searchRef.trim()}`);
  };
  const toggleLang = () => setLang(lang === 'en' ? 'ne' : 'en');
  const isAdmin = user && ['super_admin', 'org_admin', 'branch_manager', 'staff'].includes(user.role);

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50 dark:bg-slate-900/80 dark:border-slate-700" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-lg shadow-primary-600/20 group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-slate-900 dark:text-white tracking-tight block">{t('app.name')}</span>
              <span className="hidden sm:block text-[9px] text-slate-400 dark:text-slate-500 -mt-1 font-bold tracking-[0.15em] uppercase">{t('app.tagline')}</span>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5 w-72">
            <Search className="w-4 h-4 text-slate-400" />
            <input value={searchRef} onChange={e => setSearchRef(e.target.value)}
              placeholder={t('nav.searchPlaceholder')} className="bg-transparent text-sm outline-none flex-1 placeholder:text-slate-400" />
          </form>

          <div className="hidden md:flex items-center gap-2">
            <button onClick={toggleDark} className="btn-ghost btn-sm" title="Toggle dark mode">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={toggleLang} className="btn-ghost btn-sm gap-1" title="Switch language">
              <Globe className="w-4 h-4" /><span className="text-xs font-bold">{lang === 'en' ? 'ने' : 'EN'}</span>
            </button>
            <Link to="/book" className="btn-ghost btn-sm">{t('nav.book')}</Link>
            {isAuthenticated ? (
              <>
                {isAdmin && <Link to="/admin" className="btn-ghost btn-sm"><LayoutDashboard className="w-4 h-4" />{t('nav.dashboard')}</Link>}
                <Link to="/my-appointments" className="btn-ghost btn-sm">{t('nav.myAppointments')}</Link>
                <div className="relative group">
                  <button className="flex items-center gap-2 btn-ghost btn-sm">
                    <div className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {user?.name?.charAt(0)}
                    </div>
                    <span className="text-sm">{user?.name?.split(' ')[0]}</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"><User className="w-4 h-4" />{t('nav.profile')}</Link>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"><LogOut className="w-4 h-4" />{t('nav.logout')}</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost btn-sm">{t('nav.login')}</Link>
                <Link to="/register" className="btn-primary btn-sm">{t('nav.signup')}</Link>
              </>
            )}
          </div>

          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 mb-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={searchRef} onChange={e => setSearchRef(e.target.value)} placeholder="Search ref code..." className="bg-transparent text-sm outline-none flex-1" />
            </form>
            <button onClick={() => { toggleDark(); }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 w-full">
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}{dark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button onClick={() => { toggleLang(); setOpen(false); }} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 w-full">
              <Globe className="w-4 h-4" />{lang === 'en' ? 'नेपाली' : 'English'}
            </button>
            <Link to="/book" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">{t('nav.book')}</Link>
            {isAuthenticated ? (
              <>
                {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">{t('nav.dashboard')}</Link>}
                <Link to="/my-appointments" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">{t('nav.myAppointments')}</Link>
                <Link to="/profile" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">{t('nav.profile')}</Link>
                <button onClick={() => { handleLogout(); setOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">{t('nav.logout')}</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800">{t('nav.login')}</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50">{t('nav.signup')}</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
