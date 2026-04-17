import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Download, X, Eye, Search, Mail, Phone, ArrowRightLeft } from 'lucide-react';
import { appointmentAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatDate, formatTime, statusColors, downloadBlob } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';
import toast from 'react-hot-toast';

export default function MyAppointments() {
  const { isAuthenticated, user } = useAuthStore();
  const { t } = useI18n();
  const [apts, setApts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Guest lookup state
  const [guestMode, setGuestMode] = useState(!isAuthenticated);
  const [lookupValue, setLookupValue] = useState('');
  const [lookedUp, setLookedUp] = useState(false);

  // Self-reschedule state
  const [rescheduleApt, setRescheduleApt] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      appointmentAPI.getAll({ limit: 50 })
        .then(r => setApts(r.data.appointments))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupValue.trim()) return toast.error('Enter your email or phone');
    setLoading(true);
    try {
      const isEmail = lookupValue.includes('@');
      const params: any = {};
      if (isEmail) params.email = lookupValue.trim();
      else params.phone = lookupValue.trim();
      const { data } = await appointmentAPI.getMyByContact(params);
      setApts(data.appointments);
      setLookedUp(true);
      if (data.appointments.length === 0) toast('No appointments found for this email/phone', { icon: 'ℹ️' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lookup failed');
    } finally { setLoading(false); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await appointmentAPI.cancel(id);
      setApts(prev => prev.map(a => a._id === id ? { ...a, status: 'cancelled' } : a));
      toast.success('Appointment cancelled');
    } catch { toast.error('Cancel failed'); }
  };

  const handleDownload = async (id: string, ref: string) => {
    try {
      const { data } = await appointmentAPI.downloadPDF(id);
      downloadBlob(data, `appointment-${ref}.pdf`);
    } catch { toast.error('Download failed'); }
  };

  // Self-reschedule: load slots for new date
  const handleLoadSlots = async () => {
    if (!rescheduleApt || !newDate) return;
    setSlotsLoading(true);
    try {
      const branchId = typeof rescheduleApt.branch === 'object' ? rescheduleApt.branch._id : rescheduleApt.branch;
      const typeId = typeof rescheduleApt.appointmentType === 'object' ? rescheduleApt.appointmentType._id : rescheduleApt.appointmentType;
      const { data } = await appointmentAPI.getSlots({ branchId, appointmentTypeId: typeId, date: newDate });
      setSlots(data.slots);
    } catch { toast.error('Failed to load slots'); setSlots([]); }
    finally { setSlotsLoading(false); }
  };

  const handleReschedule = async () => {
    if (!rescheduleApt || !selectedSlot) return;
    try {
      await appointmentAPI.reschedule(rescheduleApt._id, {
        date: newDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
      toast.success('Appointment rescheduled!');
      setRescheduleApt(null); setNewDate(''); setSlots([]); setSelectedSlot(null);
      // Refresh list
      if (isAuthenticated) {
        appointmentAPI.getAll({ limit: 50 }).then(r => setApts(r.data.appointments));
      } else if (lookedUp) {
        const isEmail = lookupValue.includes('@');
        const params: any = isEmail ? { email: lookupValue } : { phone: lookupValue };
        appointmentAPI.getMyByContact(params).then(r => setApts(r.data.appointments));
      }
    } catch (err: any) { toast.error(err.response?.data?.message || 'Reschedule failed'); }
  };

  const generateDates = () => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  const filtered = filter === 'all' ? apts :
    apts.filter(a => filter === 'upcoming' ? ['pending','confirmed'].includes(a.status) : a.status === filter);

  // Guest lookup screen
  if (guestMode && !lookedUp) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('nav.myAppointments')}</h1>
          <p className="text-slate-500 text-sm">Look up your appointments by email or phone number</p>
        </div>
        <form onSubmit={handleGuestLookup} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email or Phone Number</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={lookupValue} onChange={e => setLookupValue(e.target.value)}
                className="input-field pl-10" placeholder="your@email.com or 98XXXXXXXX" required />
            </div>
            <p className="text-xs text-slate-400 mt-1">Enter the email or phone used during booking</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Looking up...' : 'Find My Appointments'}
          </button>
        </form>
        {isAuthenticated && (
          <button onClick={() => { setGuestMode(false); setLoading(true);
            appointmentAPI.getAll({ limit: 50 }).then(r => setApts(r.data.appointments)).finally(() => setLoading(false));
          }} className="btn-ghost w-full mt-3">View logged-in account appointments</button>
        )}
        <p className="text-center text-sm text-slate-400 mt-4">
          Don't have a booking? <Link to="/book" className="text-primary-600 font-medium hover:underline">Book now</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{t('nav.myAppointments')}</h1>
          {lookedUp && <p className="text-sm text-slate-500 mt-0.5">Showing results for: <strong>{lookupValue}</strong></p>}
        </div>
        <div className="flex gap-2">
          {lookedUp && (
            <button onClick={() => { setLookedUp(false); setApts([]); setLookupValue(''); }} className="btn-ghost btn-sm">
              <Search className="w-4 h-4" />New Lookup
            </button>
          )}
          <Link to="/book" className="btn-primary btn-sm">Book New</Link>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[['all','All'],['upcoming','Upcoming'],['completed','Completed'],['cancelled','Cancelled']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`btn-sm whitespace-nowrap ${filter === k ? 'btn-primary' : 'btn-secondary'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">{t('common.noData')}</p>
          <Link to="/book" className="btn-primary btn-sm mt-4">Book Now</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <div key={a._id} className="card p-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg"
                    style={{ backgroundColor: ((a.appointmentType as any)?.color || '#2563eb') + '15', color: (a.appointmentType as any)?.color }}>
                    #{a.tokenNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{(a.appointmentType as any)?.name || 'Appointment'}</h3>
                      <span className={statusColors[a.status]}>{a.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{a.refCode}</span>
                      <span className="mx-2">·</span>{(a.branch as any)?.name}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(a.date)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(a.startTime)} – {formatTime(a.endTime)}</span>
                    </div>
                    {(a.branch as any)?.address && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{(a.branch as any).address}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-shrink-0">
                  <Link to={`/appointments/${a.refCode}`} className="btn-ghost btn-sm" title="View"><Eye className="w-4 h-4" /></Link>
                  <button onClick={() => handleDownload(a._id, a.refCode)} className="btn-ghost btn-sm" title="PDF"><Download className="w-4 h-4" /></button>
                  {['pending', 'confirmed'].includes(a.status) && (
                    <>
                      <button onClick={() => { setRescheduleApt(a); setNewDate(''); setSlots([]); setSelectedSlot(null); }}
                        className="btn-ghost btn-sm text-blue-500 hover:bg-blue-50" title="Reschedule">
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleCancel(a._id)} className="btn-ghost btn-sm text-red-500 hover:bg-red-50" title="Cancel">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Self-Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Reschedule Appointment</h2>
              <button onClick={() => setRescheduleApt(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium">{(rescheduleApt.appointmentType as any)?.name}</p>
              <p className="text-slate-500">Currently: {formatDate(rescheduleApt.date)} at {formatTime(rescheduleApt.startTime)}</p>
              <p className="text-slate-500">Ref: {rescheduleApt.refCode}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select New Date</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {generateDates().map(d => {
                    const dt = new Date(d + 'T00:00:00');
                    return (
                      <button key={d} onClick={() => { setNewDate(d); setSelectedSlot(null); setSlots([]); }}
                        className={`flex-shrink-0 w-16 py-2 rounded-xl text-center transition-all border-2
                          ${newDate === d ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="text-[9px] uppercase font-semibold text-slate-400">{dt.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-lg font-bold">{dt.getDate()}</div>
                        <div className="text-[9px] text-slate-500">{dt.toLocaleDateString('en-US', { month: 'short' })}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {newDate && (
                <button onClick={handleLoadSlots} disabled={slotsLoading} className="btn-secondary btn-sm w-full">
                  {slotsLoading ? 'Loading...' : 'Show Available Slots'}
                </button>
              )}

              {slots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pick Time Slot</label>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {slots.map(s => (
                      <button key={s.startTime} disabled={!s.available} onClick={() => setSelectedSlot(s)}
                        className={`py-2 px-2 rounded-lg text-xs font-medium transition-all
                          ${!s.available ? 'slot-unavailable' : selectedSlot?.startTime === s.startTime ? 'slot-selected' : 'slot-available'}`}>
                        {formatTime(s.startTime)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button onClick={() => setRescheduleApt(null)} className="btn-secondary">{t('common.cancel')}</button>
              <button onClick={handleReschedule} disabled={!selectedSlot} className="btn-primary">Reschedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
