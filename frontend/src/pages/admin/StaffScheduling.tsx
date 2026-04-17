import { useState, useEffect } from 'react';
import { Users, Clock, Calendar, Save, Plus, X, AlertCircle } from 'lucide-react';
import { adminAPI, staffAvailabilityAPI, branchAPI } from '../../lib/api';
import { dayNames } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function StaffScheduling() {
  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [avail, setAvail] = useState<any>(null);
  const [overrideForm, setOverrideForm] = useState({ date: '', isAvailable: false, startTime: '', endTime: '', reason: '' });

  useEffect(() => {
    Promise.all([
      adminAPI.getUsers({ role: 'staff', limit: 100 }),
      branchAPI.getAll({ limit: 100 }),
    ]).then(([s, b]) => {
      const allStaff = [...(s.data.users || [])];
      adminAPI.getUsers({ role: 'branch_manager', limit: 50 }).then(m => {
        setStaff([...allStaff, ...(m.data.users || [])]);
      }).catch(() => setStaff(allStaff));
      setBranches(b.data.branches || []);
    }).finally(() => setLoading(false));
  }, []);

  const loadAvailability = async (userId: string) => {
    try {
      const { data } = await staffAvailabilityAPI.getByStaff(userId);
      setAvail(data.availability);
    } catch { setAvail(null); }
  };

  const handleSelectStaff = (s: any) => {
    setSelectedStaff(s);
    loadAvailability(s._id);
  };

  const handleSaveSchedule = async () => {
    if (!selectedStaff || !avail) return;
    try {
      await staffAvailabilityAPI.upsert(selectedStaff._id, {
        branch: selectedStaff.branch?._id || selectedStaff.branch || branches[0]?._id,
        weeklySchedule: avail.weeklySchedule,
        recurringBlockouts: avail.recurringBlockouts || [],
      });
      toast.success('Schedule saved');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Save failed'); }
  };

  const handleAddOverride = async () => {
    if (!selectedStaff || !overrideForm.date) return;
    try {
      await staffAvailabilityAPI.addOverride(selectedStaff._id, overrideForm);
      loadAvailability(selectedStaff._id);
      setOverrideForm({ date: '', isAvailable: false, startTime: '', endTime: '', reason: '' });
      toast.success('Override added');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemoveOverride = async (date: string) => {
    if (!selectedStaff) return;
    try {
      await staffAvailabilityAPI.removeOverride(selectedStaff._id, date);
      loadAvailability(selectedStaff._id);
      toast.success('Override removed');
    } catch { toast.error('Failed'); }
  };

  const updateWeekDay = (idx: number, field: string, val: any) => {
    const ws = [...(avail?.weeklySchedule || [])];
    ws[idx] = { ...ws[idx], [field]: val };
    setAvail({ ...avail, weeklySchedule: ws });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Staff Scheduling</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Staff list */}
        <div className="card p-4">
          <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><Users className="w-4 h-4" />Staff Members</h3>
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {staff.length === 0 ? <p className="text-sm text-slate-400 py-4 text-center">No staff found</p> :
            staff.map(s => (
              <button key={s._id} onClick={() => handleSelectStaff(s)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${selectedStaff?._id === s._id ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-slate-400">{s.email} · {s.role?.replace('_',' ')}</p>
                {s.specializations?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {s.specializations.map((sp: string) => <span key={sp} className="badge-info text-[9px]">{sp}</span>)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule editor */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedStaff ? (
            <div className="card p-8 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>Select a staff member to manage their schedule</p>
            </div>
          ) : (
            <>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{selectedStaff.name}</h3>
                    <p className="text-xs text-slate-500">{selectedStaff.email}</p>
                  </div>
                  <button onClick={handleSaveSchedule} className="btn-primary btn-sm"><Save className="w-4 h-4" />Save</button>
                </div>

                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" />Weekly Schedule</h4>
                <div className="space-y-2">
                  {(avail?.weeklySchedule || []).map((d: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 flex-wrap bg-slate-50 dark:bg-slate-800 rounded-lg p-2.5">
                      <span className="w-20 text-xs font-medium text-slate-600 dark:text-slate-400">{dayNames[d.day]}</span>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={d.isAvailable} onChange={e => updateWeekDay(i, 'isAvailable', e.target.checked)} className="rounded" aria-label={`${dayNames[d.day]} available`} />Available
                      </label>
                      {d.isAvailable && <>
                        <input type="time" value={d.startTime} onChange={e => updateWeekDay(i, 'startTime', e.target.value)} className="input-field py-1 px-2 text-xs w-28" aria-label={`${dayNames[d.day]} start time`} />
                        <span className="text-xs text-slate-400">to</span>
                        <input type="time" value={d.endTime} onChange={e => updateWeekDay(i, 'endTime', e.target.value)} className="input-field py-1 px-2 text-xs w-28" aria-label={`${dayNames[d.day]} end time`} />
                        <input type="number" value={d.maxAppointments || 10} onChange={e => updateWeekDay(i, 'maxAppointments', +e.target.value)} className="input-field py-1 px-2 text-xs w-16" min={1} title="Max appointments" aria-label={`${dayNames[d.day]} max appointments`} />
                      </>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Date overrides */}
              <div className="card p-5">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" />Date Overrides (Leave, Special Hours)</h4>

                {avail?.dateOverrides?.length > 0 && (
                  <div className="space-y-1 mb-4">
                    {avail.dateOverrides.map((o: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">{new Date(o.date).toLocaleDateString()}</span>
                          <span className={`ml-2 ${o.isAvailable ? 'badge-success' : 'badge-danger'} text-[10px]`}>
                            {o.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                          {o.reason && <span className="text-xs text-slate-500 ml-2">{o.reason}</span>}
                        </div>
                        <button onClick={() => handleRemoveOverride(new Date(o.date).toISOString().split('T')[0])} className="p-1 rounded hover:bg-red-50"><X className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <input type="date" value={overrideForm.date} onChange={e => setOverrideForm({...overrideForm, date: e.target.value})} className="input-field text-xs" aria-label="Override date" />
                  <select value={String(overrideForm.isAvailable)} onChange={e => setOverrideForm({...overrideForm, isAvailable: e.target.value === 'true'})} className="input-field text-xs" aria-label="Override type">
                    <option value="false">Unavailable</option>
                    <option value="true">Special Hours</option>
                  </select>
                  <input value={overrideForm.reason} onChange={e => setOverrideForm({...overrideForm, reason: e.target.value})} className="input-field text-xs" placeholder="Reason..." aria-label="Override reason" />
                  <button onClick={handleAddOverride} disabled={!overrideForm.date} className="btn-primary btn-sm"><Plus className="w-3.5 h-3.5" />Add</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
