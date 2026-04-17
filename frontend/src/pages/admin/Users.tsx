/**
 * Users & Staff Admin Page
 * CRUD for users with role assignment.
 * Branch dropdown is filtered by selected organization.
 */
import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Save, Search } from 'lucide-react';
import { adminAPI, orgAPI, branchAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { roleLabels } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';
import toast from 'react-hot-toast';

export default function Users() {
  const { user: me } = useAuthStore();
  const { t } = useI18n();
  const [users, setUsers] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name:'', email:'', phone:'', password:'', role:'staff', organization:'', branch:'', isActive:true });

  const fetchUsers = () => {
    setLoading(true);
    const p: any = { page, limit: 20 };
    if (search) p.search = search;
    if (roleFilter) p.role = roleFilter;
    adminAPI.getUsers(p).then(r => { setUsers(r.data.users); setTotal(r.data.total); }).finally(() => setLoading(false));
  };
  useEffect(fetchUsers, [page, search, roleFilter]);
  useEffect(() => {
    if (me?.role === 'super_admin') orgAPI.getAll().then(r => setOrgs(r.data.organizations));
    branchAPI.getAll({ limit: 200 }).then(r => setAllBranches(r.data.branches));
  }, []);

  // Filter branches by the organization selected in the form
  const filteredBranches = useMemo(() => {
    if (!form.organization) return allBranches;
    return allBranches.filter(b => {
      const bOrgId = typeof b.organization === 'object' ? b.organization._id : b.organization;
      return bOrgId === form.organization;
    });
  }, [allBranches, form.organization]);

  const openNew = () => {
    setForm({ name:'', email:'', phone:'', password:'QueueLess@123', role:'staff',
      organization: (me?.organization && typeof me.organization === 'string' ? me.organization : '') as string,
      branch:'', isActive:true });
    setEditing(null); setModal(true);
  };
  const openEdit = (u: any) => {
    setForm({
      name: u.name, email: u.email||'', phone: u.phone||'', password: '', role: u.role,
      organization: typeof u.organization === 'object' ? u.organization?._id||'' : u.organization||'',
      branch: typeof u.branch === 'object' ? u.branch?._id||'' : u.branch||'',
      isActive: u.isActive,
    });
    setEditing(u); setModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...form };
    if (editing && !payload.password) delete payload.password;
    try {
      if (editing) { await adminAPI.updateUser(editing._id, payload); toast.success('Updated'); }
      else { await adminAPI.createUser(payload); toast.success('Created'); }
      setModal(false); fetchUsers();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{t('admin.users')}</h1>
        <button onClick={openNew} className="btn-primary btn-sm"><Plus className="w-4 h-4" />{t('admin.newUser')}</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 text-sm" placeholder="Search name, email, phone..." /></div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input-field text-sm w-40">
          <option value="">{t('common.all')} Roles</option>
          {Object.entries(roleLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700"><tr>
            {[t('common.name'),t('common.email'),t('common.phone'),'Role',t('common.organization'),t('common.branch'),t('common.status'),t('common.actions')].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}
          </tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t('common.loading')}</td></tr> :
            users.map(u => (
              <tr key={u._id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-slate-500">{u.phone||'—'}</td>
                <td className="px-4 py-3"><span className="badge-info text-[10px]">{roleLabels[u.role]}</span></td>
                <td className="px-4 py-3 text-slate-500 text-xs">{(u.organization as any)?.name||'—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{(u.branch as any)?.name||'—'}</td>
                <td className="px-4 py-3"><span className={u.isActive?'badge-success':'badge-danger'}>{u.isActive?t('common.active'):t('common.inactive')}</span></td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-slate-100 dark:bg-slate-800"><Pencil className="w-4 h-4 text-slate-400" /></button>
                  <button onClick={async () => { if(confirm('Deactivate?')) { await adminAPI.deleteUser(u._id); fetchUsers(); }}} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div></td>
              </tr>
            ))}
          </tbody></table>
        </div>
        {total > 20 && <div className="flex items-center justify-between px-4 py-3 border-t"><span className="text-sm text-slate-500">{total} {t('common.total')}</span><div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-secondary btn-sm">{t('common.prev')}</button>
          <button onClick={() => setPage(p => p+1)} disabled={users.length<20} className="btn-secondary btn-sm">{t('common.next')}</button>
        </div></div>}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up my-8">
            <div className="flex items-center justify-between p-6 border-b"><h2 className="font-display text-lg font-bold">{editing ? t('admin.editUser') : t('admin.newUser')}</h2><button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800"><X className="w-5 h-5" /></button></div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('common.fullName')} *</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="Enter full name" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('common.email')} *</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="user@example.com" required /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('common.phone')}</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="input-field" placeholder="+977 98XXXXXXXX" /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{editing ? 'New Password (leave blank to keep)' : `${t('common.password')} *`}</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'} {...(editing?{}:{required:true})} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="input-field">
                {(me?.role === 'super_admin' ? ['org_admin','branch_manager','staff','citizen'] : ['branch_manager','staff','citizen']).map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </select></div>

              {/* Organization selection */}
              {me?.role === 'super_admin' && (
                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('common.organization')}</label>
                <select value={form.organization} onChange={e => setForm({...form, organization: e.target.value, branch: ''})} className="input-field">
                  <option value="">{t('common.none')}</option>
                  {orgs.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
                </select></div>
              )}

              {/* Branch filtered by selected org */}
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('common.branch')}</label>
              <select value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} className="input-field">
                <option value="">{t('common.none')}</option>
                {filteredBranches.map(b => <option key={b._id} value={b._id}>{b.name} ({b.code})</option>)}
              </select>
              {form.organization && filteredBranches.length === 0 && <p className="text-xs text-amber-600 mt-1">No branches found for selected organization</p>}
              </div>

              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />{t('common.active')}</label>
              <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setModal(false)} className="btn-secondary">{t('common.cancel')}</button><button type="submit" className="btn-primary"><Save className="w-4 h-4" />{editing ? t('common.update') : t('common.create')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
