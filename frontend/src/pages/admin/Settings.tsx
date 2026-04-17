import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { orgAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { useThemeStore } from '../../store/themeStore';

export default function Settings() {
  const { user } = useAuthStore();
  const { dark, toggle: toggleDark } = useThemeStore();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.organization) {
      const orgId = typeof user.organization === 'object' ? (user.organization as any)._id : user.organization;
      orgAPI.getById(orgId).then(r => setOrg(r.data.organization)).catch(() => {}).finally(() => setLoading(false));
    } else if (user?.role === 'super_admin') {
      orgAPI.getAll({ limit: 1 }).then(r => { if (r.data.organizations.length) setOrg(r.data.organizations[0]); }).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [user]);

  const handleSave = async () => {
    if (!org) return;
    try {
      await orgAPI.update(org._id, { settings: org.settings, branding: org.branding });
      toast.success('Settings saved');
    } catch { toast.error('Save failed'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!org) return <p className="text-slate-500 text-center py-10">No organization found</p>;

  const s = org.settings || {};
  const updateSettings = (k: string, v: any) => setOrg({ ...org, settings: { ...org.settings, [k]: v } });

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Organization Settings</h1>
      <div className="card p-6 space-y-6">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2"><SettingsIcon className="w-5 h-5 text-slate-400"/>Booking Configuration</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <input type="checkbox" checked={s.allowGuestBooking} onChange={e => updateSettings('allowGuestBooking', e.target.checked)} className="rounded" />
            <div><p className="text-sm font-medium">Allow Guest Booking</p><p className="text-xs text-slate-500">Public can book without account</p></div>
          </label>
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <input type="checkbox" checked={s.requireApproval} onChange={e => updateSettings('requireApproval', e.target.checked)} className="rounded" />
            <div><p className="text-sm font-medium">Require Approval</p><p className="text-xs text-slate-500">Admin must approve each booking</p></div>
          </label>
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <input type="checkbox" checked={s.emailEnabled} onChange={e => updateSettings('emailEnabled', e.target.checked)} className="rounded" />
            <div><p className="text-sm font-medium">Email Notifications</p><p className="text-xs text-slate-500">Send booking emails</p></div>
          </label>
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <input type="checkbox" checked={s.smsEnabled} onChange={e => updateSettings('smsEnabled', e.target.checked)} className="rounded" />
            <div><p className="text-sm font-medium">SMS Notifications</p><p className="text-xs text-slate-500">Send SMS via Nepal gateway</p></div>
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Advance Booking Days</label>
          <input type="number" value={s.maxAdvanceBookingDays} onChange={e => updateSettings('maxAdvanceBookingDays', +e.target.value)} className="input-field" min={1} /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Min Advance Hours</label>
          <input type="number" value={s.minAdvanceBookingHours} onChange={e => updateSettings('minAdvanceBookingHours', +e.target.value)} className="input-field" min={0} /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cancellation Policy (hours)</label>
          <input type="number" value={s.cancellationPolicyHours} onChange={e => updateSettings('cancellationPolicyHours', +e.target.value)} className="input-field" min={0} /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reminder Before (hours)</label>
          <input type="number" value={s.reminderHoursBefore} onChange={e => updateSettings('reminderHoursBefore', +e.target.value)} className="input-field" min={1} /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
          <input value={s.timezone} onChange={e => updateSettings('timezone', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
          <input value={s.currency} onChange={e => updateSettings('currency', e.target.value)} className="input-field" /></div>
        </div>

        <h3 className="font-semibold text-slate-900 dark:text-white pt-4">Branding</h3>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-xs text-slate-500 mb-1">Primary Color</label>
          <input type="color" value={org.branding?.primaryColor||'#2563eb'} onChange={e=>setOrg({...org,branding:{...org.branding,primaryColor:e.target.value}})} className="w-full h-10 rounded cursor-pointer"/></div>
          <div><label className="block text-xs text-slate-500 mb-1">Secondary Color</label>
          <input type="color" value={org.branding?.secondaryColor||'#1e40af'} onChange={e=>setOrg({...org,branding:{...org.branding,secondaryColor:e.target.value}})} className="w-full h-10 rounded cursor-pointer"/></div>
          <div><label className="block text-xs text-slate-500 mb-1">Accent Color</label>
          <input type="color" value={org.branding?.accentColor||'#f59e0b'} onChange={e=>setOrg({...org,branding:{...org.branding,accentColor:e.target.value}})} className="w-full h-10 rounded cursor-pointer"/></div>
        </div>

        <h3 className="font-semibold text-slate-900 dark:text-white pt-4">Appearance</h3>
        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div><p className="text-sm font-medium">Dark Mode</p><p className="text-xs text-slate-500">Toggle dark/light theme</p></div>
          <button onClick={toggleDark} className={`relative w-12 h-6 rounded-full transition-colors ${dark ? 'bg-primary-600' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${dark ? 'translate-x-6' : ''}`} />
          </button>
        </label>

        <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4"/>Save Settings</button>
      </div>
    </div>
  );
}
