import { useState, useEffect } from 'react';
import { Bell, Plus, Pencil, Trash2, X, Save, Copy } from 'lucide-react';
import { notificationTemplateAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const typeLabels: Record<string,string> = {
  booking_confirmed: 'Booking Confirmed', booking_cancelled: 'Booking Cancelled',
  booking_reminder: 'Booking Reminder', booking_rescheduled: 'Rescheduled',
  otp: 'OTP Verification', welcome: 'Welcome', feedback_request: 'Feedback Request',
};
const variables = ['{{name}}','{{refCode}}','{{date}}','{{time}}','{{service}}','{{branch}}','{{token}}','{{orgName}}'];

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ type:'booking_confirmed', channel:'email', subject:'', bodyTemplate:'', language:'en', isActive:true });

  const fetch = () => { setLoading(true); notificationTemplateAPI.getAll().then(r => setTemplates(r.data.templates)).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(fetch, []);

  const openNew = () => { setForm({ type:'booking_confirmed', channel:'email', subject:'', bodyTemplate:'', language:'en', isActive:true }); setEditing(null); setModal(true); };
  const openEdit = (t: any) => { setForm({ type:t.type, channel:t.channel, subject:t.subject, bodyTemplate:t.bodyTemplate, language:t.language, isActive:t.isActive }); setEditing(t); setModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { await notificationTemplateAPI.update(editing._id, form); toast.success('Updated'); }
      else { await notificationTemplateAPI.create(form); toast.success('Created'); }
      setModal(false); fetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const loadDefaults = async () => {
    try {
      const { data } = await notificationTemplateAPI.getDefaults();
      const defaults = data.defaults;
      setForm(f => {
        const match = defaults.find((d: any) => d.type === f.type);
        return match ? { ...f, subject: match.subject, bodyTemplate: match.bodyTemplate } : f;
      });
      toast.success('Default template loaded');
    } catch { toast.error('Failed to load defaults'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Bell className="w-6 h-6 text-slate-400" />Notification Templates</h1>
        <button onClick={openNew} className="btn-primary btn-sm"><Plus className="w-4 h-4" />New Template</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800 border-b"><tr>
            {['Type','Channel','Subject','Language','Active','Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
          </tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr> :
            templates.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No templates. Create one or load defaults.</td></tr> :
            templates.map(t => (
              <tr key={t._id}>
                <td className="px-4 py-3 font-medium">{typeLabels[t.type] || t.type}</td>
                <td className="px-4 py-3"><span className="badge-info text-[10px] uppercase">{t.channel}</span></td>
                <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{t.subject}</td>
                <td className="px-4 py-3 text-xs uppercase">{t.language}</td>
                <td className="px-4 py-3"><span className={t.isActive ? 'badge-success' : 'badge-danger'}>{t.isActive ? 'Yes' : 'No'}</span></td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-slate-100 dark:bg-slate-800"><Pencil className="w-4 h-4 text-slate-400" /></button>
                  <button onClick={async() => { if(confirm('Delete?')){ await notificationTemplateAPI.remove(t._id); fetch(); }}} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h2 className="font-display text-lg font-bold dark:text-white">{editing ? 'Edit' : 'New'} Template</h2><button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Type</label>
                <select value={form.type} onChange={e => setForm({...form,type:e.target.value})} className="input-field">
                  {Object.entries(typeLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
                <div><label className="block text-sm font-medium mb-1">Channel</label>
                <select value={form.channel} onChange={e => setForm({...form,channel:e.target.value})} className="input-field">
                  <option value="email">Email</option><option value="sms">SMS</option>
                </select></div>
                <div><label className="block text-sm font-medium mb-1">Language</label>
                <select value={form.language} onChange={e => setForm({...form,language:e.target.value})} className="input-field">
                  <option value="en">English</option><option value="ne">Nepali</option>
                </select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Subject</label><input value={form.subject} onChange={e => setForm({...form,subject:e.target.value})} className="input-field" required placeholder="Booking Confirmed - {{refCode}}" /></div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Body Template</label>
                  <button type="button" onClick={loadDefaults} className="text-xs text-primary-600 hover:underline flex items-center gap-1"><Copy className="w-3 h-3" />Load Default</button>
                </div>
                <textarea value={form.bodyTemplate} onChange={e => setForm({...form,bodyTemplate:e.target.value})} className="input-field font-mono text-xs" rows={6} required placeholder="Hello {{name}}, your appointment..." />
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-slate-400">Variables:</span>
                  {variables.map(v => <button key={v} type="button" onClick={() => setForm(f => ({...f, bodyTemplate: f.bodyTemplate + v}))} className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded hover:bg-slate-200 font-mono">{v}</button>)}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form,isActive:e.target.checked})} className="rounded" />Active</label>
              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary"><Save className="w-4 h-4" />{editing?'Update':'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
