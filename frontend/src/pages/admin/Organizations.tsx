import { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { orgAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';

const emptyOrg = { name:'', slug:'', description:'', email:'', phone:'', address:'', category:'other',
  branding:{ primaryColor:'#2563eb', secondaryColor:'#1e40af', accentColor:'#f59e0b', fontFamily:'Inter' },
  settings:{ allowGuestBooking:true, requireApproval:false, maxAdvanceBookingDays:30, minAdvanceBookingHours:1, cancellationPolicyHours:24, timezone:'Asia/Kathmandu', currency:'NPR', smsEnabled:false, emailEnabled:true, reminderHoursBefore:24 }
};

export default function Organizations() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({...emptyOrg});

  const fetch = () => { setLoading(true); orgAPI.getAll().then(r => setOrgs(r.data.organizations)).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(fetch, []);

  const openNew = () => { setForm({...emptyOrg}); setEditing(null); setModal(true); };
  const openEdit = (o: any) => { setForm({ name:o.name, slug:o.slug, description:o.description||'', email:o.email||'', phone:o.phone||'', address:o.address||'', category:o.category, branding:{...o.branding}, settings:{...o.settings} }); setEditing(o); setModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { await orgAPI.update(editing._id, form); toast.success('Updated'); }
      else { await orgAPI.create(form); toast.success('Created'); }
      setModal(false); fetch();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this organization?')) return;
    try { await orgAPI.remove(id); fetch(); toast.success('Deactivated'); } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Organizations</h1>
        <button onClick={openNew} className="btn-primary btn-sm"><Plus className="w-4 h-4"/>New Organization</button>
      </div>
      {/* Search & Filter */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search organizations..." className="flex-1" />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="input-field text-sm w-full sm:w-40" aria-label="Filter by category">
          <option value="">All Categories</option>
          {['government','healthcare','education','finance','salon','legal','other'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
        {loading ? <p className="text-slate-400 col-span-full text-center py-10">Loading...</p> :
        orgs.filter(o => (!search || o.name.toLowerCase().includes(search.toLowerCase()) || o.description?.toLowerCase().includes(search.toLowerCase())) && (!catFilter || o.category === catFilter)).map(o => (
          <div key={o._id} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{backgroundColor:o.branding?.primaryColor+'20'}}>
                <Building2 className="w-5 h-5" style={{color:o.branding?.primaryColor}} />
              </div>
              <div className="flex gap-1">
                <button onClick={()=>openEdit(o)} className="p-1.5 rounded hover:bg-slate-100 dark:bg-slate-800"><Pencil className="w-4 h-4 text-slate-400"/></button>
                <button onClick={()=>handleDelete(o._id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400"/></button>
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{o.name}</h3>
            <p className="text-xs text-slate-500 mt-1">{o.description || o.slug}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className="badge-info text-[10px] capitalize">{o.category}</span>
              <span className={o.isActive ? 'badge-success text-[10px]' : 'badge-danger text-[10px]'}>{o.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-display text-lg font-bold">{editing ? 'Edit' : 'New'} Organization</h2>
              <button onClick={()=>setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input-field" required/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug</label>
                <input value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} className="input-field" placeholder="auto-generated"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="input-field">
                  {['government','healthcare','education','finance','salon','legal','other'].map(c=><option key={c} value={c}>{c}</option>)}
                </select></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="input-field"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="input-field"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="input-field"/></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="input-field" rows={2}/></div>

              <h4 className="font-semibold text-sm text-slate-700 pt-2">Branding</h4>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-slate-500 mb-1">Primary</label>
                <input type="color" value={form.branding.primaryColor} onChange={e=>setForm({...form,branding:{...form.branding,primaryColor:e.target.value}})} className="w-full h-9 rounded cursor-pointer"/></div>
                <div><label className="block text-xs text-slate-500 mb-1">Secondary</label>
                <input type="color" value={form.branding.secondaryColor} onChange={e=>setForm({...form,branding:{...form.branding,secondaryColor:e.target.value}})} className="w-full h-9 rounded cursor-pointer"/></div>
                <div><label className="block text-xs text-slate-500 mb-1">Accent</label>
                <input type="color" value={form.branding.accentColor} onChange={e=>setForm({...form,branding:{...form.branding,accentColor:e.target.value}})} className="w-full h-9 rounded cursor-pointer"/></div>
              </div>

              <h4 className="font-semibold text-sm text-slate-700 pt-2">Settings</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.settings.allowGuestBooking} onChange={e=>setForm({...form,settings:{...form.settings,allowGuestBooking:e.target.checked}})} className="rounded"/>Allow Guest Booking</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.settings.requireApproval} onChange={e=>setForm({...form,settings:{...form.settings,requireApproval:e.target.checked}})} className="rounded"/>Require Approval</label>
                <div><label className="block text-xs text-slate-500 mb-1">Max Advance Days</label>
                <input type="number" value={form.settings.maxAdvanceBookingDays} onChange={e=>setForm({...form,settings:{...form.settings,maxAdvanceBookingDays:+e.target.value}})} className="input-field"/></div>
                <div><label className="block text-xs text-slate-500 mb-1">Reminder Hours Before</label>
                <input type="number" value={form.settings.reminderHoursBefore} onChange={e=>setForm({...form,settings:{...form.settings,reminderHoursBefore:+e.target.value}})} className="input-field"/></div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary"><Save className="w-4 h-4"/>{editing?'Update':'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
