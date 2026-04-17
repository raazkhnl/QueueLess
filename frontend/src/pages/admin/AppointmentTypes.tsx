import { useState, useEffect } from 'react';
import { CalendarClock, Plus, Pencil, Trash2, X, Save, Clock, Building2, GitBranch } from 'lucide-react';
import { apptTypeAPI, orgAPI, branchAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function AppointmentTypes() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const isBranchManager = user?.role === 'branch_manager';
  const isOrgAdmin = user?.role === 'org_admin';
  const [types, setTypes] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({
    name: '', nameNp: '', description: '', organization: '', duration: 30, bufferTime: 5, price: 0,
    roomNo: '', roomNoNp: '',
    mode: 'in_person', color: '#2563eb', maxBookingsPerSlot: 1, requiresApproval: false,
    sortOrder: 0, customFields: [] as any[],
    // Scope
    applyToAllOrgs: false, // super admin only
    applyToAllBranches: true, // if false, select specific branches
    selectedBranches: [] as string[],
  });

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      apptTypeAPI.getAll(),
      isSuperAdmin ? orgAPI.getAll() : Promise.resolve({ data: { organizations: [] } }),
      branchAPI.getAll({ limit: 200 }),
    ]).then(([t, o, b]) => {
      setTypes(t.data.appointmentTypes);
      setOrgs(o.data.organizations);
      setBranches(b.data.branches);
    }).finally(() => setLoading(false));
  };
  useEffect(fetchAll, []);

  const filteredBranches = form.organization
    ? branches.filter(b => (typeof b.organization === 'object' ? b.organization._id : b.organization) === form.organization)
    : branches;

  const openNew = () => {
    setForm({
      name: '', nameNp: '', description: '', organization: (user?.organization as any)?._id || user?.organization || orgs[0]?._id || '',
      duration: 30, bufferTime: 5, price: 0, mode: 'in_person', color: '#2563eb',
      roomNo: '', roomNoNp: '',
      maxBookingsPerSlot: 1, requiresApproval: false, sortOrder: 0, customFields: [],
      applyToAllOrgs: false, applyToAllBranches: true, selectedBranches: [],
    });
    setEditing(null); setModal(true);
  };

  const openEdit = (t: any) => {
    const branchIds = (t.branches || []).map((b: any) => typeof b === 'object' ? b._id : b);
    setForm({
      name: t.name, nameNp: t.nameNp || '', description: t.description || '', organization: t.organization,
      duration: t.duration, bufferTime: t.bufferTime, price: t.price, mode: t.mode,
      roomNo: t.roomNo || '', roomNoNp: t.roomNoNp || '',
      color: t.color, maxBookingsPerSlot: t.maxBookingsPerSlot,
      requiresApproval: t.requiresApproval, sortOrder: t.sortOrder,
      customFields: t.customFields || [],
      applyToAllOrgs: false, applyToAllBranches: branchIds.length === 0,
      selectedBranches: branchIds,
    });
    setEditing(t); setModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSuperAdmin && form.applyToAllOrgs) {
        // Create for each org
        let created = 0;
        for (const org of orgs) {
          try {
            const payload = { ...form, organization: org._id, branches: form.applyToAllBranches ? [] : form.selectedBranches };
            delete payload.applyToAllOrgs; delete payload.applyToAllBranches; delete payload.selectedBranches;
            await apptTypeAPI.create(payload);
            created++;
          } catch { /* skip duplicates */ }
        }
        toast.success(`Created for ${created} organizations`);
      } else {
        const payload = { ...form, branches: form.applyToAllBranches ? [] : form.selectedBranches };
        delete payload.applyToAllOrgs; delete payload.applyToAllBranches; delete payload.selectedBranches;
        if (editing) { await apptTypeAPI.update(editing._id, payload); toast.success('Updated'); }
        else { await apptTypeAPI.create(payload); toast.success('Created'); }
      }
      setModal(false); fetchAll();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const addField = () => setForm({ ...form, customFields: [...form.customFields, { name: '', label: '', type: 'text', required: false, options: [] }] });
  const removeField = (i: number) => setForm({ ...form, customFields: form.customFields.filter((_: any, idx: number) => idx !== i) });
  const updateField = (i: number, k: string, v: any) => { const cf = [...form.customFields]; cf[i] = { ...cf[i], [k]: v }; setForm({ ...form, customFields: cf }); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Service Types</h1>
        <button onClick={openNew} className="btn-primary btn-sm"><Plus className="w-4 h-4" />New Type</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="text-slate-400 col-span-full text-center py-10">Loading...</p> :
          types.map(t => (
            <div key={t._id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: t.color + '20' }}><CalendarClock className="w-5 h-5" style={{ color: t.color }} /></div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil className="w-4 h-4 text-slate-400" /></button>
                  <button onClick={async () => { if (confirm('Deactivate?')) { await apptTypeAPI.remove(t._id); fetchAll(); } }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{t.name}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="badge-neutral text-[10px]"><Clock className="w-3 h-3 inline mr-0.5" />{t.duration}m + {t.bufferTime}m buffer</span>
                {t.price > 0 && <span className="badge-info text-[10px]">NPR {t.price}</span>}
                <span className="badge-neutral text-[10px] capitalize">{t.mode.replace('_', '-')}</span>
                {t.branches?.length > 0 && <span className="badge-warning text-[10px]">{t.branches.length} branches</span>}
                {t.branches?.length === 0 && <span className="badge-success text-[10px]">All branches</span>}
              </div>
            </div>
          ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-[3vh] overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 className="font-display text-lg font-bold dark:text-white">{editing ? 'Edit' : 'New'} Service Type</h2>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Scope: Super Admin can apply to all orgs */}
              {isSuperAdmin && !editing && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.applyToAllOrgs} onChange={e => setForm({ ...form, applyToAllOrgs: e.target.checked })} className="rounded w-5 h-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-200 flex items-center gap-2"><Building2 className="w-4 h-4" />Apply to ALL Organizations</p>
                      <p className="text-xs text-blue-700 dark:text-blue-400">This service type will be created across all {orgs.length} organizations</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Org selector (when not applying to all) */}
              {!form.applyToAllOrgs && (isSuperAdmin || isOrgAdmin) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Organization *</label>
                  <select value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value, selectedBranches: [] })} className="input-field" required>
                    <option value="">Select organization...</option>
                    {isSuperAdmin ? orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>) : <option value={form.organization}>Current Organization</option>}
                  </select>
                </div>
              )}

              {/* Branch scope */}
              {form.organization && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <label className="flex items-center gap-3 mb-3 cursor-pointer">
                    <input type="checkbox" checked={form.applyToAllBranches} onChange={e => setForm({ ...form, applyToAllBranches: e.target.checked, selectedBranches: [] })} className="rounded w-5 h-5 text-primary-600" />
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white flex items-center gap-2"><GitBranch className="w-4 h-4" />Available at all branches</p>
                      <p className="text-xs text-slate-500">Uncheck to select specific branches</p>
                    </div>
                  </label>
                  {!form.applyToAllBranches && (
                    <div className="space-y-1 max-h-40 overflow-y-auto pl-8">
                      {filteredBranches.map(b => (
                        <label key={b._id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                          <input type="checkbox" className="rounded" checked={form.selectedBranches.includes(b._id)}
                            onChange={e => {
                              if (e.target.checked) setForm({ ...form, selectedBranches: [...form.selectedBranches, b._id] });
                              else setForm({ ...form, selectedBranches: form.selectedBranches.filter((id: string) => id !== b._id) });
                            }} />
                          <span className="dark:text-slate-300">{b.name} <span className="text-xs text-slate-400">({b.code})</span></span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name (English) *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name (Nepali)</label><input value={form.nameNp} onChange={e => setForm({ ...form, nameNp: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Room/Section (English)</label><input value={form.roomNo} onChange={e => setForm({ ...form, roomNo: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Room/Section (Nepali)</label><input value={form.roomNoNp} onChange={e => setForm({ ...form, roomNoNp: e.target.value })} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mode</label>
                  <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })} className="input-field">
                    <option value="in_person">In-Person</option><option value="virtual">Virtual</option><option value="both">Both</option>
                  </select></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (min) *</label><input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: +e.target.value })} className="input-field" min={5} required /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Buffer between appts (min)</label><input type="number" value={form.bufferTime} onChange={e => setForm({ ...form, bufferTime: +e.target.value })} className="input-field" min={0} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price (NPR)</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} className="input-field" min={0} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Per Slot</label><input type="number" value={form.maxBookingsPerSlot} onChange={e => setForm({ ...form, maxBookingsPerSlot: +e.target.value })} className="input-field" min={1} /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full h-9 rounded cursor-pointer border border-slate-200 dark:border-slate-600" /></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sort Order</label><input type="number" value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: +e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} /></div>
              {isBranchManager && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
                  As Branch Manager, you can toggle active/suspended status, adjust buffer time, and approval settings for services at your branch.
                </div>
              )}
              <label className="flex items-center gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={form.requiresApproval} onChange={e => setForm({ ...form, requiresApproval: e.target.checked })} className="rounded" />Requires Admin Approval</label>

              {/* Custom Fields */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2"><h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Custom Fields</h4><button type="button" onClick={addField} className="btn-ghost btn-sm text-primary-600"><Plus className="w-3 h-3" />Add</button></div>
                {form.customFields.map((f: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 mb-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input value={f.label} onChange={e => updateField(i, 'label', e.target.value)} className="input-field text-xs" placeholder="Label" />
                      <input value={f.name} onChange={e => updateField(i, 'name', e.target.value)} className="input-field text-xs font-mono" placeholder="field_name" />
                      <select value={f.type} onChange={e => updateField(i, 'type', e.target.value)} className="input-field text-xs">
                        {['text', 'number', 'email', 'phone', 'select', 'textarea', 'date'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-xs dark:text-slate-300"><input type="checkbox" checked={f.required} onChange={e => updateField(i, 'required', e.target.checked)} className="rounded" />Required</label>
                      {f.type === 'select' && <input value={f.options?.join(',') || ''} onChange={e => updateField(i, 'options', e.target.value.split(','))} className="input-field text-xs col-span-2" placeholder="option1,option2,..." />}
                    </div>
                    <button type="button" onClick={() => removeField(i)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"><X className="w-4 h-4 text-red-400" /></button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary"><Save className="w-4 h-4" />{editing ? 'Update' : form.applyToAllOrgs ? `Create for ${orgs.length} Orgs` : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
