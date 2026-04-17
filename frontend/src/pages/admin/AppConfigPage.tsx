import { useState, useEffect } from 'react';
import { Globe, Save, Palette } from 'lucide-react';
import { appConfigAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AppConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { appConfigAPI.get().then(r => setConfig(r.data.config)).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    try { await appConfigAPI.update(config); toast.success('App config saved'); } catch { toast.error('Save failed'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!config) return <p className="text-slate-400">Failed to load config</p>;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">App Configuration</h1>
      <div className="card p-6 space-y-6">
        <h3 className="font-semibold flex items-center gap-2"><Globe className="w-5 h-5 text-slate-400" />General</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">App Name</label>
          <input value={config.appName} onChange={e => setConfig({...config, appName: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tagline</label>
          <input value={config.tagline} onChange={e => setConfig({...config, tagline: e.target.value})} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Default Language</label>
          <select value={config.defaultLanguage} onChange={e => setConfig({...config, defaultLanguage: e.target.value})} className="input-field">
            <option value="en">English</option><option value="ne">नेपाली (Nepali)</option>
          </select></div>
          <label className="flex items-center gap-2 text-sm self-end pb-2"><input type="checkbox" checked={config.features?.multiLanguage} onChange={e => setConfig({...config, features:{...config.features, multiLanguage: e.target.checked}})} className="rounded" />Enable Multi-Language</label>
        </div>

        <h3 className="font-semibold flex items-center gap-2 pt-4"><Palette className="w-5 h-5 text-slate-400" />Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-xs text-slate-500 mb-1">Primary</label>
          <input type="color" value={config.theme?.primaryColor} onChange={e => setConfig({...config, theme:{...config.theme, primaryColor: e.target.value}})} className="w-full h-10 rounded cursor-pointer" /></div>
          <div><label className="block text-xs text-slate-500 mb-1">Secondary</label>
          <input type="color" value={config.theme?.secondaryColor} onChange={e => setConfig({...config, theme:{...config.theme, secondaryColor: e.target.value}})} className="w-full h-10 rounded cursor-pointer" /></div>
          <div><label className="block text-xs text-slate-500 mb-1">Accent</label>
          <input type="color" value={config.theme?.accentColor} onChange={e => setConfig({...config, theme:{...config.theme, accentColor: e.target.value}})} className="w-full h-10 rounded cursor-pointer" /></div>
        </div>

        <h3 className="font-semibold pt-4">Features</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm bg-slate-50 p-3 rounded-lg"><input type="checkbox" checked={config.features?.guestBooking} onChange={e => setConfig({...config, features:{...config.features, guestBooking: e.target.checked}})} className="rounded" />Guest Booking</label>
          <label className="flex items-center gap-2 text-sm bg-slate-50 p-3 rounded-lg"><input type="checkbox" checked={config.features?.feedbackEnabled} onChange={e => setConfig({...config, features:{...config.features, feedbackEnabled: e.target.checked}})} className="rounded" />Feedback System</label>
          <label className="flex items-center gap-2 text-sm bg-slate-50 p-3 rounded-lg"><input type="checkbox" checked={config.features?.smsEnabled} onChange={e => setConfig({...config, features:{...config.features, smsEnabled: e.target.checked}})} className="rounded" />SMS Notifications</label>
        </div>

        <h3 className="font-semibold pt-4">Contact</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label><input value={config.contact?.email||''} onChange={e => setConfig({...config, contact:{...config.contact, email: e.target.value}})} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label><input value={config.contact?.phone||''} onChange={e => setConfig({...config, contact:{...config.contact, phone: e.target.value}})} className="input-field" /></div>
        </div>

        <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4" />Save Configuration</button>
      </div>
    </div>
  );
}
