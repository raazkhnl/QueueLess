import { useState, useEffect } from 'react';
import { Webhook, Plus, Pencil, Trash2, X, Save, Play, CheckCircle2, XCircle } from 'lucide-react';
import { webhookAPI } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import toast from 'react-hot-toast';

const eventTypes = ['appointment.created','appointment.confirmed','appointment.cancelled','appointment.completed','appointment.rescheduled','appointment.checked_in','feedback.created','user.created'];

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: [] as string[], isActive: true });

  const fetch = () => { setLoading(true); webhookAPI.getAll().then(r => setWebhooks(r.data.webhooks)).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(fetch, []);

  const openNew = () => { setForm({ name:'', url:'', secret:'', events:[], isActive:true }); setEditing(null); setModal(true); };
  const openEdit = (w: any) => { setForm({ name:w.name, url:w.url, secret:w.secret||'', events:w.events||[], isActive:w.isActive }); setEditing(w); setModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { await webhookAPI.update(editing._id, form); toast.success('Updated'); }
      else { await webhookAPI.create(form); toast.success('Created'); }
      setModal(false); fetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleTest = async (id: string) => {
    try { await webhookAPI.test(id); toast.success('Test webhook sent!'); }
    catch { toast.error('Test failed'); }
  };

  const toggleEvent = (ev: string) => {
    setForm(f => ({ ...f, events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev] }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Webhook className="w-6 h-6 text-slate-400" />Webhooks</h1>
        <button onClick={openNew} className="btn-primary btn-sm"><Plus className="w-4 h-4" />New Webhook</button>
      </div>
      <p className="text-sm text-slate-500">Send real-time event notifications to external systems when bookings are created, updated, or completed.</p>

      <div className="space-y-3">
        {loading ? <p className="text-slate-400 text-center py-10">Loading...</p> :
        webhooks.length === 0 ? <p className="text-slate-400 text-center py-10">No webhooks configured</p> :
        webhooks.map(w => (
          <div key={w._id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{w.name}</h3>
                  {w.isActive ? <span className="badge-success text-[10px]">Active</span> : <span className="badge-danger text-[10px]">Inactive</span>}
                  {w.lastStatus && (w.lastStatus >= 200 && w.lastStatus < 300
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <p className="text-sm text-slate-500 font-mono break-all">{w.url}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {w.events?.map((e: string) => <span key={e} className="badge-neutral text-[9px]">{e}</span>)}
                </div>
                {w.lastTriggered && <p className="text-xs text-slate-400 mt-2">Last triggered: {formatDate(w.lastTriggered, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })} · Status: {w.lastStatus} · Fails: {w.failCount}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => handleTest(w._id)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Test"><Play className="w-4 h-4 text-blue-500" /></button>
                <button onClick={() => openEdit(w)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-400" /></button>
                <button onClick={async () => { if(confirm('Delete?')){ await webhookAPI.remove(w._id); fetch(); }}} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h2 className="font-display text-lg font-bold dark:text-white">{editing ? 'Edit' : 'New'} Webhook</h2><button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label><input value={form.name} onChange={e => setForm({...form,name:e.target.value})} className="input-field" required placeholder="My Webhook" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL *</label><input value={form.url} onChange={e => setForm({...form,url:e.target.value})} className="input-field font-mono text-sm" required placeholder="https://example.com/webhook" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Secret (optional)</label><input value={form.secret} onChange={e => setForm({...form,secret:e.target.value})} className="input-field font-mono text-sm" placeholder="Used to sign payload (HMAC-SHA256)" /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Events</label>
                <div className="grid grid-cols-2 gap-2">
                  {eventTypes.map(ev => (
                    <label key={ev} className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-700 p-2 rounded-lg cursor-pointer">
                      <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} className="rounded" />
                      {ev}
                    </label>
                  ))}
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
