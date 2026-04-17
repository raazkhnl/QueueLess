import { useState, useEffect } from 'react';
import { GitBranch, Plus, Pencil, Trash2, X, Save, MapPin, Clock } from 'lucide-react';
import { branchAPI, orgAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { dayNames } from '../../lib/utils';
import toast from 'react-hot-toast';
import SearchBar from '../../components/ui/SearchBar';

const defaultHours = [0,1,2,3,4,5,6].map(d => ({ day:d, isOpen:d!==6, openTime:'09:00', closeTime:'17:00', breakStart:'', breakEnd:'' }));

export default function Branches() {
  const { user } = useAuthStore();
  const [branches, setBranches] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name:'', code:'', address:'', province:'', district:'', city:'', phone:'', email:'', organization:'', lat:'27.7172', lng:'85.3240', maxConcurrentBookings:5, workingHours: defaultHours });

  const fetchAll = () => {
    setLoading(true);
    Promise.all([branchAPI.getAll({limit:100}), user?.role==='super_admin' ? orgAPI.getAll() : Promise.resolve({data:{organizations:[]}})]).then(([b,o])=>{
      setBranches(b.data.branches); setOrgs(o.data.organizations);
    }).finally(()=>setLoading(false));
  };
  useEffect(fetchAll, []);

  const openNew = () => { setForm({ name:'', code:'', address:'', province:'', district:'', city:'', phone:'', email:'', organization: user?.organization || orgs[0]?._id || '', lat:'27.7172', lng:'85.3240', maxConcurrentBookings:5, workingHours: defaultHours.map(h=>({...h})) }); setEditing(null); setModal(true); };
  const openEdit = (b: any) => { setForm({ name:b.name, code:b.code, address:b.address, province:b.province||'', district:b.district||'', city:b.city||'', phone:b.phone||'', email:b.email||'', organization: typeof b.organization==='object' ? b.organization._id : b.organization, lat:String(b.location?.coordinates?.[1]||'27.7172'), lng:String(b.location?.coordinates?.[0]||'85.3240'), maxConcurrentBookings:b.maxConcurrentBookings, workingHours: b.workingHours?.length ? b.workingHours.map((h:any)=>({...h})) : defaultHours.map(h=>({...h})) }); setEditing(b); setModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, location: { type:'Point', coordinates:[parseFloat(form.lng), parseFloat(form.lat)] } };
    delete payload.lat; delete payload.lng;
    try {
      if (editing) { await branchAPI.update(editing._id, payload); toast.success('Updated'); }
      else { await branchAPI.create(payload); toast.success('Created'); }
      setModal(false); fetchAll();
    } catch (err:any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate branch?')) return;
    try { await branchAPI.remove(id); fetchAll(); toast.success('Deactivated'); } catch { toast.error('Failed'); }
  };

  const updateHour = (idx: number, field: string, val: any) => {
    const wh = [...form.workingHours];
    wh[idx] = { ...wh[idx], [field]: val };
    setForm({ ...form, workingHours: wh });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Branches</h1>
        <button onClick={openNew} className="btn-primary btn-sm"><Plus className="w-4 h-4"/>New Branch</button>
      </div>

      <div className="card p-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search branches by name, code, address..." />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700"><tr>
              {['Name','Code','Address','Province','Phone','Concurrent','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr> :
              branches.filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.code.toLowerCase().includes(search.toLowerCase()) || b.address?.toLowerCase().includes(search.toLowerCase())).map(b=>(
                <tr key={b._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.code}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{b.address}</td>
                  <td className="px-4 py-3 text-slate-500">{b.province}</td>
                  <td className="px-4 py-3 text-slate-500">{b.phone}</td>
                  <td className="px-4 py-3 text-center">{b.maxConcurrentBookings}</td>
                  <td className="px-4 py-3"><span className={b.isActive?'badge-success':'badge-danger'}>{b.isActive?'Active':'Inactive'}</span></td>
                  <td className="px-4 py-3"><div className="flex gap-1">
                    <button onClick={()=>openEdit(b)} className="p-1.5 rounded hover:bg-slate-100 dark:bg-slate-800"><Pencil className="w-4 h-4 text-slate-400"/></button>
                    <button onClick={()=>handleDelete(b._id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400"/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-[3vh] overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl animate-slide-up my-8">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="font-display text-lg font-bold">{editing?'Edit':'New'} Branch</h2><button onClick={()=>setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800"><X className="w-5 h-5"/></button></div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {user?.role==='super_admin' && <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Organization *</label>
              <select value={form.organization} onChange={e=>setForm({...form,organization:e.target.value})} className="input-field" required>
                <option value="">Select...</option>{orgs.map(o=><option key={o._id} value={o._id}>{o.name}</option>)}
              </select></div>}
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="input-field" required/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Code *</label><input value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} className="input-field font-mono" required placeholder="e.g. IRD-KTM"/></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address *</label><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="input-field" required/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Province</label><input value={form.province} onChange={e=>setForm({...form,province:e.target.value})} className="input-field"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">District</label><input value={form.district} onChange={e=>setForm({...form,district:e.target.value})} className="input-field"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label><input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="input-field"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="input-field"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="input-field"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Concurrent</label><input type="number" value={form.maxConcurrentBookings} onChange={e=>setForm({...form,maxConcurrentBookings:+e.target.value})} className="input-field" min={1}/></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"><MapPin className="w-3 h-3 inline"/>Latitude</label><input value={form.lat} onChange={e=>setForm({...form,lat:e.target.value})} className="input-field font-mono text-sm"/></div>
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"><MapPin className="w-3 h-3 inline"/>Longitude</label><input value={form.lng} onChange={e=>setForm({...form,lng:e.target.value})} className="input-field font-mono text-sm"/></div>
              </div>

              <h4 className="font-semibold text-sm text-slate-700 pt-2 flex items-center gap-2"><Clock className="w-4 h-4"/>Working Hours</h4>
              <div className="space-y-2">
                {form.workingHours.map((h: any, i: number) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="w-20 text-xs font-medium text-slate-600 dark:text-slate-400">{dayNames[h.day]}</span>
                      <label className="flex items-center gap-1 text-xs dark:text-slate-300"><input type="checkbox" checked={h.isOpen} onChange={e=>updateHour(i,'isOpen',e.target.checked)} className="rounded"/>Open</label>
                      {h.isOpen && <>
                        <input type="time" value={h.openTime} onChange={e=>updateHour(i,'openTime',e.target.value)} className="input-field py-1 px-2 text-xs w-28" aria-label={`${dayNames[h.day]} open time`}/>
                        <span className="text-xs text-slate-400">to</span>
                        <input type="time" value={h.closeTime} onChange={e=>updateHour(i,'closeTime',e.target.value)} className="input-field py-1 px-2 text-xs w-28" aria-label={`${dayNames[h.day]} close time`}/>
                      </>}
                    </div>
                    {h.isOpen && (
                      <div className="flex items-center gap-2 pl-[88px] flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Break:</span>
                        <input type="time" value={h.breakStart || ''} onChange={e=>updateHour(i,'breakStart',e.target.value)} className="input-field py-1 px-2 text-xs w-28" placeholder="Start" aria-label={`${dayNames[h.day]} break start`}/>
                        <span className="text-xs text-slate-400">to</span>
                        <input type="time" value={h.breakEnd || ''} onChange={e=>updateHour(i,'breakEnd',e.target.value)} className="input-field py-1 px-2 text-xs w-28" placeholder="End" aria-label={`${dayNames[h.day]} break end`}/>
                        {(h.breakStart || h.breakEnd) && <button type="button" onClick={()=>{updateHour(i,'breakStart','');updateHour(i,'breakEnd','');}} className="text-xs text-red-500 hover:underline">Clear</button>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary"><Save className="w-4 h-4"/>{editing?'Update':'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
