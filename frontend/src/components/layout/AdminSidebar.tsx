import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, GitBranch, CalendarClock, Users, FileSpreadsheet, Settings, ClipboardList, Calendar, Star, Shield, Globe, BarChart3, Webhook, Bell , UserCog } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const links = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin','org_admin','branch_manager'], section: 'main' },
  { to: '/admin/bookings', icon: ClipboardList, label: 'Bookings', roles: ['super_admin','org_admin','branch_manager','staff'], section: 'main' },
  { to: '/admin/calendar', icon: Calendar, label: 'Calendar', roles: ['super_admin','org_admin','branch_manager','staff'], section: 'main' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports', roles: ['super_admin','org_admin','branch_manager'], section: 'main' },
  { to: '/admin/organizations', icon: Building2, label: 'Organizations', roles: ['super_admin'], section: 'manage' },
  { to: '/admin/branches', icon: GitBranch, label: 'Branches', roles: ['super_admin','org_admin'], section: 'manage' },
  { to: '/admin/appointment-types', icon: CalendarClock, label: 'Service Types', roles: ['super_admin','org_admin','branch_manager'], section: 'manage' },
  { to: '/admin/users', icon: Users, label: 'Users & Staff', roles: ['super_admin','org_admin'], section: 'manage' },
  { to: '/admin/staff-scheduling', icon: UserCog, label: 'Staff Scheduling', roles: ['super_admin','org_admin','branch_manager'], section: 'manage' },
  { to: '/admin/feedback', icon: Star, label: 'Feedback', roles: ['super_admin','org_admin','branch_manager'], section: 'manage' },
  { to: '/admin/bulk-upload', icon: FileSpreadsheet, label: 'Bulk Upload', roles: ['super_admin','org_admin'], section: 'tools' },
  { to: '/admin/webhooks', icon: Webhook, label: 'Webhooks', roles: ['super_admin','org_admin'], section: 'tools' },
  { to: '/admin/notification-templates', icon: Bell, label: 'Notifications', roles: ['super_admin','org_admin'], section: 'tools' },
  { to: '/admin/settings', icon: Settings, label: 'Org Settings', roles: ['super_admin','org_admin'], section: 'config' },
  { to: '/admin/app-config', icon: Globe, label: 'App Config', roles: ['super_admin'], section: 'config' },
  { to: '/admin/audit-logs', icon: Shield, label: 'Audit Logs', roles: ['super_admin'], section: 'config' },
];

const sectionLabels: Record<string,string> = { main: '', manage: 'Manage', tools: 'Tools', config: 'Configuration' };

export default function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const role = user?.role || 'citizen';
  const filtered = links.filter(l => l.roles.includes(role));
  const sections = [...new Set(filtered.map(l => l.section))];

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 z-50 transform transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white">Admin Panel</h2>
          <p className="text-xs text-slate-500 mt-0.5 capitalize">{role.replace('_', ' ')}</p>
        </div>
        <nav className="p-3 space-y-1 overflow-y-auto" role="navigation" aria-label="Admin navigation" style={{ height: 'calc(100vh - 80px)' }}>
          {sections.map(section => (
            <div key={section}>
              {sectionLabels[section] && <p className="px-3 pt-4 pb-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{sectionLabels[section]}</p>}
              {filtered.filter(l => l.section === section).map(link => (
                <NavLink key={link.to} to={link.to} end={link.to === '/admin'} onClick={onClose}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                  <link.icon className="w-[18px] h-[18px]" />
                  {link.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
