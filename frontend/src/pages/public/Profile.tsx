import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Save, Shield, Building2, GitBranch, Calendar, Clock } from 'lucide-react';
import { authAPI, appointmentAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { roleLabels, formatDate, formatTime, statusColors } from '../../lib/utils';
import toast from 'react-hot-toast';
import { useI18n } from '../../lib/i18n';

export default function Profile() {
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isAdmin = user && ['super_admin', 'org_admin', 'branch_manager', 'staff'].includes(user.role);
  const isCitizen = user?.role === 'citizen';

  useEffect(() => {
    if (isCitizen) {
      appointmentAPI.getAll({ limit: 5 }).then(r => setRecentBookings(r.data.appointments)).catch(() => {}).finally(() => setBookingsLoading(false));
    } else {
      setBookingsLoading(false);
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await authAPI.updateProfile(form);
      updateUser(data.user); toast.success('Profile updated!');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Update failed'); }
    finally { setLoading(false); }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast.error('Passwords do not match');
    if (pw.newPassword.length < 6) return toast.error('Min 6 characters');
    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' }); toast.success('Password changed!');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    ...(isCitizen ? [{ id: 'bookings', label: 'Recent Bookings', icon: Calendar }] : []),
    ...(isAdmin ? [{ id: 'role', label: 'Role & Access', icon: Shield }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-6">My Profile</h1>

      {/* Profile header */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary-600/25">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h2 className="font-semibold text-lg">{user?.name}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge-info text-[10px]">{roleLabels[user?.role || 'citizen']}</span>
              {user?.isActive && <span className="badge-success text-[10px]">Active</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap
              ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleUpdate} className="card p-6 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-slate-900 dark:text-white">Personal Information</h3>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
          <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field pl-10" required /></div></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field pl-10" required /></div></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
          <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field pl-10" placeholder="+977 98XXXXXXXX" /></div></div>
          <button type="submit" disabled={loading} className="btn-primary"><Save className="w-4 h-4" />{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <form onSubmit={handlePassword} className="card p-6 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-slate-900 dark:text-white">Change Password</h3>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Password</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="password" value={pw.currentPassword} onChange={e => setPw({...pw, currentPassword: e.target.value})} className="input-field pl-10" required /></div></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="password" value={pw.newPassword} onChange={e => setPw({...pw, newPassword: e.target.value})} className="input-field pl-10" required minLength={6} /></div></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm New Password</label>
          <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="password" value={pw.confirm} onChange={e => setPw({...pw, confirm: e.target.value})} className="input-field pl-10" required /></div></div>
          <button type="submit" disabled={loading} className="btn-secondary"><Lock className="w-4 h-4" />Change Password</button>
        </form>
      )}

      {/* Recent Bookings tab (citizens only) */}
      {activeTab === 'bookings' && isCitizen && (
        <div className="animate-fade-in space-y-3">
          {bookingsLoading ? <p className="text-slate-400 text-center py-8">Loading...</p> :
          recentBookings.length === 0 ? <p className="text-slate-400 text-center py-8">No bookings yet</p> :
          recentBookings.map(a => (
            <div key={a._id} className="card p-4 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold" style={{ backgroundColor: ((a.appointmentType as any)?.color || '#2563eb') + '15', color: (a.appointmentType as any)?.color }}>
                #{a.tokenNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{(a.appointmentType as any)?.name}</p>
                <p className="text-xs text-slate-500">{formatDate(a.date)} · {formatTime(a.startTime)} · {(a.branch as any)?.name}</p>
              </div>
              <span className={statusColors[a.status] + ' text-[10px]'}>{a.status.replace('_',' ')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Role & Access tab (admin/staff) */}
      {activeTab === 'role' && isAdmin && (
        <div className="card p-6 animate-fade-in space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><Shield className="w-5 h-5 text-slate-400" />Role & Access Control</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Role</p>
              <p className="font-semibold text-lg">{roleLabels[user?.role || 'citizen']}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Organization</p>
              <p className="font-semibold text-lg flex items-center gap-2"><Building2 className="w-4 h-4 text-slate-400" />{typeof user?.organization === 'object' ? (user?.organization as any)?.name : 'All'}</p>
            </div>
            {user?.branch && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Branch</p>
                <p className="font-semibold text-lg flex items-center gap-2"><GitBranch className="w-4 h-4 text-slate-400" />{typeof user.branch === 'object' ? (user.branch as any)?.name : 'N/A'}</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Account Created</p>
              <p className="font-semibold">{user?.createdAt ? formatDate(user.createdAt) : '—'}</p>
            </div>
          </div>

          <h4 className="font-medium text-sm text-slate-700 pt-2">Permissions</h4>
          <div className="space-y-2">
            {[
              { perm: 'View Dashboard', roles: ['super_admin','org_admin','branch_manager'] },
              { perm: 'Manage Organizations', roles: ['super_admin'] },
              { perm: 'Manage Branches', roles: ['super_admin','org_admin'] },
              { perm: 'Manage Service Types', roles: ['super_admin','org_admin'] },
              { perm: 'View & Manage Bookings', roles: ['super_admin','org_admin','branch_manager','staff'] },
              { perm: 'Approve/Cancel Bookings', roles: ['super_admin','org_admin','branch_manager','staff'] },
              { perm: 'Shift/Reschedule Appointments', roles: ['super_admin','org_admin','branch_manager','staff'] },
              { perm: 'Manage Users', roles: ['super_admin','org_admin'] },
              { perm: 'Bulk Upload', roles: ['super_admin','org_admin'] },
              { perm: 'View Feedback', roles: ['super_admin','org_admin','branch_manager'] },
              { perm: 'App Configuration', roles: ['super_admin'] },
              { perm: 'Audit Logs', roles: ['super_admin'] },
            ].map(p => (
              <div key={p.perm} className="flex items-center gap-3 text-sm">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${p.roles.includes(user?.role || '') ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {p.roles.includes(user?.role || '') ? '✓' : '—'}
                </div>
                <span className={p.roles.includes(user?.role || '') ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>{p.perm}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
