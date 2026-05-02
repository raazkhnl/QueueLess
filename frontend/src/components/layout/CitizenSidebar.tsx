import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  X, User, Calendar, AlertCircle, CreditCard, LogOut, Plus, MessageSquare,
  LayoutDashboard, Globe, Moon, Sun, Building2, Shield,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useI18n } from '../../lib/i18n';
import { roleLabels } from '../../lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Right-side off-canvas drawer that holds every personal link for a logged-in
 * citizen — keeps the top navbar uncluttered. Mirrors the admin sidebar
 * pattern but is presentation-only (drawer, not a permanent rail).
 *
 * Accessibility:
 *   - role="dialog", aria-modal, focus-visible escape handler
 *   - body scroll locked while open
 *   - clicking the backdrop or pressing ESC closes
 */
export default function CitizenSidebar({ open, onClose }: Props) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { dark, toggle: toggleDark } = useThemeStore();
  const { lang, setLang, t: _t } = useI18n();
  const location = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const initialPathRef = useRef<string | null>(null);

  // Close on route change — but skip the initial mount so opening the drawer
  // doesn't immediately close itself.
  useEffect(() => {
    if (initialPathRef.current === null) { initialPathRef.current = location.pathname; return; }
    if (initialPathRef.current !== location.pathname) {
      initialPathRef.current = location.pathname;
      onClose();
    }
  }, [location.pathname, onClose]);

  // Lock body scroll + ESC handler
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!isAuthenticated || !user) return null;

  const isAdmin = ['super_admin', 'org_admin', 'branch_manager', 'staff'].includes(user.role);
  const isCitizen = user.role === 'citizen';

  const handleLogout = () => { logout(); onClose(); };
  const toggleLang = () => setLang(lang === 'en' ? 'ne' : 'en');

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`}
      role="dialog" aria-modal="true" aria-label="Account menu" data-testid="citizen-sidebar"
    >
      {/* Backdrop */}
      <button
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        tabIndex={-1}
      />

      {/* Drawer */}
      <aside
        className={`absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col transform transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
              {user.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email || user.phone || ''}</p>
              <span className="inline-block mt-1 text-[10px] font-medium uppercase tracking-wider bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 px-2 py-0.5 rounded-full">
                {roleLabels[user.role] || user.role}
              </span>
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4" aria-label="Account navigation">
          {/* Citizen personal section */}
          {isCitizen && (
            <Section title="My QueueLess">
              <Item to="/profile" icon={User} label="Profile" />
              <Item to="/my-appointments" icon={Calendar} label="My appointments" />
              <Item to="/my-issues" icon={AlertCircle} label="My tickets" />
              <Item to="/profile?tab=tickets" icon={CreditCard} label="My payments" />
            </Section>
          )}

          {/* Admin shortcut */}
          {isAdmin && (
            <Section title="Admin">
              <Item to="/admin" icon={LayoutDashboard} label="Dashboard" end />
              <Item to="/admin/bookings" icon={Calendar} label="Bookings" />
              <Item to="/admin/issues" icon={AlertCircle} label="Tickets" />
              <Item to="/profile" icon={User} label="My profile" />
              {user.role === 'super_admin' && <Item to="/admin/app-config" icon={Shield} label="App config" />}
            </Section>
          )}

          {/* Quick actions */}
          <Section title="Quick actions">
            <Item to="/book" icon={Plus} label="Book appointment" />
            <Item to="/issue/submit" icon={MessageSquare} label="Raise an issue" />
            <Item to="/services" icon={Building2} label="Browse services" />
          </Section>

          {/* Preferences */}
          <Section title="Preferences">
            <button
              onClick={toggleDark}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              onClick={toggleLang}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Globe className="w-[18px] h-[18px]" />
              {lang === 'en' ? 'नेपाली' : 'English'}
            </button>
          </Section>
        </nav>

        <footer className="p-3 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Log out
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 pt-1 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({ to, icon: Icon, label, end }: { to: string; icon: any; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to} end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
        }`
      }
    >
      <Icon className="w-[18px] h-[18px]" />
      {label}
    </NavLink>
  );
}

// Re-export Link for callers that want it co-located
export { Link };
