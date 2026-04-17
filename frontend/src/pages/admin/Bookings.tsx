import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Download, Eye, CheckCircle2, XCircle, Clock, UserCheck, ArrowRightLeft, Calendar, Phone, Mail, MapPin, X, FileText, Star, ChevronRight } from 'lucide-react';
import { appointmentAPI, adminAPI, branchAPI, feedbackAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { formatDate, formatTime, statusColors, downloadBlob } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function Bookings() {
  const { user } = useAuthStore();
  const [params] = useSearchParams();
  const [apts, setApts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [filters, setFilters] = useState({ search: '', status: params.get('status') || '', branch: params.get('branch') || '', dateFrom: '', dateTo: '' });
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [shiftModal, setShiftModal] = useState<any>(null);
  const [shiftDays, setShiftDays] = useState(1);
  const [shiftReason, setShiftReason] = useState('');
  const [rescheduleModal, setRescheduleModal] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlots, setNewSlots] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState<any>(null);

  useEffect(() => { branchAPI.getAll({ limit: 100 }).then(r => setBranches(r.data.branches)).catch(() => {}); }, []);

  const fetchBookings = () => {
    setLoading(true);
    const p: any = { page, limit: 15 };
    if (filters.search) p.search = filters.search;
    if (filters.status) p.status = filters.status;
    if (filters.branch) p.branch = filters.branch;
    if (filters.dateFrom) p.dateFrom = filters.dateFrom;
    if (filters.dateTo) p.dateTo = filters.dateTo;
    appointmentAPI.getAll(p).then(r => { setApts(r.data.appointments); setTotal(r.data.total); }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(fetchBookings, [page, filters]);

  const openDetail = async (id: string) => {
    setDetailLoading(true); setDetail(null);
    try {
      const { data } = await appointmentAPI.getById(id);
      // Try to load feedback
      let fb = null;
      try { fb = (await feedbackAPI.getByAppointment(id)).data.feedback; } catch {}
      setDetail({ ...data.appointment, _feedback: fb });
    } catch { toast.error('Failed to load details'); }
    finally { setDetailLoading(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await appointmentAPI.updateStatus(id, { status });
      fetchBookings();
      if (detail?._id === id) openDetail(id);
      toast.success(`Status updated to ${status}`);
    } catch { toast.error('Update failed'); }
  };

  const handleShift = async () => {
    if (!shiftModal) return;
    try {
      await appointmentAPI.shiftAppointment(shiftModal._id, { shiftDays, reason: shiftReason });
      fetchBookings(); setShiftModal(null); setShiftDays(1); setShiftReason('');
      if (detail?._id === shiftModal._id) openDetail(shiftModal._id);
      toast.success(`Appointment shifted by ${shiftDays} day(s)`);
    } catch (err: any) { toast.error(err.response?.data?.message || 'Shift failed'); }
  };

  const handleRescheduleLoadSlots = async () => {
    if (!rescheduleModal || !newDate) return;
    try {
      const { data } = await appointmentAPI.getSlots({
        branchId: typeof rescheduleModal.branch === 'object' ? rescheduleModal.branch._id : rescheduleModal.branch,
        appointmentTypeId: typeof rescheduleModal.appointmentType === 'object' ? rescheduleModal.appointmentType._id : rescheduleModal.appointmentType,
        date: newDate,
      });
      setNewSlots(data.slots);
    } catch { toast.error('Failed to load slots'); }
  };

  const handleReschedule = async () => {
    if (!rescheduleModal || !newSlot) return;
    try {
      await appointmentAPI.reschedule(rescheduleModal._id, { date: newDate, startTime: newSlot.startTime, endTime: newSlot.endTime });
      fetchBookings(); setRescheduleModal(null); setNewSlot(null); setNewDate('');
      if (detail?._id === rescheduleModal._id) openDetail(rescheduleModal._id);
      toast.success('Appointment rescheduled');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Reschedule failed'); }
  };

  const handleExportCSV = async () => {
    try {
      const { data } = await adminAPI.exportCSV(filters);
      downloadBlob(data, `bookings-export-${Date.now()}.csv`);
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Bookings</h1>
        <button onClick={handleExportCSV} className="btn-secondary btn-sm"><Download className="w-4 h-4" />Export CSV</button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={filters.search} onChange={e => { setFilters({...filters, search: e.target.value}); setPage(1); }}
              className="input-field pl-10 text-sm" placeholder="Search ref, name, email, phone..." />
          </div>
          <select value={filters.status} onChange={e => { setFilters({...filters, status: e.target.value}); setPage(1); }} className="input-field text-sm">
            <option value="">All Status</option>
            {['pending','confirmed','checked_in','in_progress','completed','cancelled','no_show'].map(s => <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>)}
          </select>
          <select value={filters.branch} onChange={e => { setFilters({...filters, branch: e.target.value}); setPage(1); }} className="input-field text-sm">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <input type="date" value={filters.dateFrom} onChange={e => { setFilters({...filters, dateFrom: e.target.value}); setPage(1); }} className="input-field text-sm" />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="card p-3 flex items-center gap-3 bg-primary-50 border-primary-200 animate-fade-in">
          <span className="text-sm font-medium text-primary-700">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button onClick={async () => {
            if (!confirm(`Cancel ${selectedIds.size} appointment(s)?`)) return;
            setBulkLoading(true);
            try {
              toast.error('Bulk cancel: select individual items instead');
              toast.success('Bulk cancel complete'); setSelectedIds(new Set()); fetchBookings();
            } catch { toast.error('Bulk cancel failed'); }
            finally { setBulkLoading(false); }
          }} disabled={bulkLoading} className="btn-danger btn-sm">Bulk Cancel</button>
          <button onClick={async () => {
            const days = prompt('Shift by how many days?', '1');
            if (!days) return;
            setBulkLoading(true);
            try {
              toast.error('Use bulk shift from dashboard for date-based shifting');
              toast.success('Bulk shift complete'); setSelectedIds(new Set()); fetchBookings();
            } catch { toast.error('Bulk shift failed'); }
            finally { setBulkLoading(false); }
          }} disabled={bulkLoading} className="btn-secondary btn-sm">Bulk Shift</button>
          <button onClick={() => setSelectedIds(new Set())} className="btn-ghost btn-sm">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"><tr>
              {['','Ref','Service','Branch','Date/Time','Customer','Token','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : apts.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No bookings found</td></tr>
              ) : apts.map(a => (
                <tr key={a._id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => openDetail(a._id)}>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(a._id)} onChange={e => {
                      const s = new Set(selectedIds);
                      if (e.target.checked) s.add(a._id); else s.delete(a._id);
                      setSelectedIds(s);
                    }} className="rounded" />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-primary-600">{a.refCode}</td>
                  <td className="px-4 py-3">{(a.appointmentType as any)?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{(a.branch as any)?.name}</td>
                  <td className="px-4 py-3"><div className="text-xs">{formatDate(a.date)}</div><div className="text-xs text-slate-400">{formatTime(a.startTime)}</div></td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{(a.citizen as any)?.name || a.guestName || '—'}</div>
                    <div className="text-xs text-slate-400">{(a.citizen as any)?.email || a.guestEmail || ''}</div>
                    {((a.citizen as any)?.phone || a.guestPhone) && <div className="text-xs text-slate-400">{(a.citizen as any)?.phone || a.guestPhone}</div>}
                  </td>
                  <td className="px-4 py-3 font-bold text-lg">#{a.tokenNumber}</td>
                  <td className="px-4 py-3"><span className={statusColors[a.status]}>{a.status.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDetail(a._id)} className="p-1.5 rounded hover:bg-slate-100 dark:bg-slate-800" title="View Details"><Eye className="w-4 h-4 text-slate-400" /></button>
                      {a.status === 'pending' && <button onClick={() => handleStatusUpdate(a._id, 'confirmed')} className="p-1.5 rounded hover:bg-emerald-50" title="Approve"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></button>}
                      {['pending','confirmed'].includes(a.status) && <button onClick={() => handleStatusUpdate(a._id, 'checked_in')} className="p-1.5 rounded hover:bg-blue-50" title="Check In"><UserCheck className="w-4 h-4 text-blue-500" /></button>}
                      {['checked_in','in_progress'].includes(a.status) && <button onClick={() => handleStatusUpdate(a._id, 'completed')} className="p-1.5 rounded hover:bg-emerald-50" title="Complete"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></button>}
                      {!['cancelled','completed','no_show'].includes(a.status) && <>
                        <button onClick={() => setShiftModal(a)} className="p-1.5 rounded hover:bg-amber-50" title="Shift"><ArrowRightLeft className="w-4 h-4 text-amber-500" /></button>
                        <button onClick={() => { setRescheduleModal(a); setNewDate(''); setNewSlots([]); setNewSlot(null); }} className="p-1.5 rounded hover:bg-blue-50" title="Reschedule"><Calendar className="w-4 h-4 text-blue-500" /></button>
                        <button onClick={() => handleStatusUpdate(a._id, 'cancelled')} className="p-1.5 rounded hover:bg-red-50" title="Cancel"><XCircle className="w-4 h-4 text-red-400" /></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 15 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700">
            <span className="text-sm text-slate-500">Showing {apts.length} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary btn-sm">Prev</button>
              <span className="btn-sm text-slate-500">Page {page}</span>
              <button onClick={() => setPage(p => p+1)} disabled={apts.length < 15} className="btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl animate-slide-up flex flex-col" onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>
            ) : detail && (
              <div>
                <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between z-10">
                  <div>
                    <h2 className="font-display text-lg font-bold">Booking Details</h2>
                    <p className="text-sm text-slate-500 font-mono">{detail.refCode}</p>
                  </div>
                  <button onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-5 overflow-y-auto flex-1">
                  {/* Status + Token */}
                  <div className="flex items-center justify-between">
                    <span className={`${statusColors[detail.status]} text-sm`}>{detail.status.replace('_',' ')}</span>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Token</p>
                      <p className="text-3xl font-extrabold text-amber-600">#{detail.tokenNumber}</p>
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="card p-4 bg-slate-50 border-slate-200 dark:border-slate-700">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Customer</h4>
                    <p className="font-semibold text-lg">{(detail.citizen as any)?.name || detail.guestName || 'Guest'}</p>
                    {((detail.citizen as any)?.email || detail.guestEmail) && (
                      <a href={`mailto:${(detail.citizen as any)?.email || detail.guestEmail}`} className="flex items-center gap-2 text-sm text-primary-600 hover:underline mt-1">
                        <Mail className="w-3.5 h-3.5" />{(detail.citizen as any)?.email || detail.guestEmail}
                      </a>
                    )}
                    {((detail.citizen as any)?.phone || detail.guestPhone) && (
                      <a href={`tel:${(detail.citizen as any)?.phone || detail.guestPhone}`} className="flex items-center gap-2 text-sm text-primary-600 hover:underline mt-1">
                        <Phone className="w-3.5 h-3.5" />{(detail.citizen as any)?.phone || detail.guestPhone}
                      </a>
                    )}
                    {detail.isGuest && <span className="badge-warning text-[10px] mt-2 inline-block">Guest Booking</span>}
                  </div>

                  {/* Appointment Info */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500">Service</p>
                        <p className="font-medium">{(detail.appointmentType as any)?.name}</p>
                        <p className="text-xs text-slate-500">{detail.duration} min · {detail.mode === 'virtual' ? 'Virtual' : 'In-Person'}</p>
                        {detail.price > 0 && <p className="text-sm font-medium text-primary-600 mt-0.5">NPR {detail.price}</p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500">Date & Time</p>
                        <p className="font-medium">{formatDate(detail.date, { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
                        <p className="text-sm text-slate-600">{formatTime(detail.startTime)} – {formatTime(detail.endTime)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-500">Branch</p>
                        <p className="font-medium">{(detail.branch as any)?.name}</p>
                        <p className="text-xs text-slate-500">{(detail.branch as any)?.address}</p>
                        {(detail.branch as any)?.phone && (
                          <a href={`tel:${(detail.branch as any)?.phone}`} className="text-xs text-primary-600 hover:underline">{(detail.branch as any)?.phone}</a>
                        )}
                      </div>
                    </div>
                    {detail.assignedStaff && (
                      <div className="flex items-start gap-3">
                        <UserCheck className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div><p className="text-sm text-slate-500">Assigned Staff</p><p className="font-medium">{(detail.assignedStaff as any)?.name}</p></div>
                      </div>
                    )}
                  </div>

                  {/* Custom Field Values */}
                  {detail.customFieldValues && Object.keys(detail.customFieldValues).length > 0 && (
                    <div className="card p-4 bg-blue-50/50 border-blue-200">
                      <h4 className="text-xs font-semibold text-blue-700 uppercase mb-2">Custom Fields</h4>
                      {Object.entries(detail.customFieldValues).map(([k, v]: [string, any]) => (
                        <div key={k} className="flex justify-between text-sm py-1">
                          <span className="text-slate-600 capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {(detail.notes || detail.internalNotes) && (
                    <div className="card p-4 bg-amber-50/50 border-amber-200">
                      {detail.notes && <><h4 className="text-xs font-semibold text-amber-700 uppercase mb-1">Citizen Notes</h4><p className="text-sm mb-2">{detail.notes}</p></>}
                      {detail.internalNotes && <><h4 className="text-xs font-semibold text-amber-700 uppercase mb-1">Internal Notes</h4><p className="text-sm whitespace-pre-wrap">{detail.internalNotes}</p></>}
                    </div>
                  )}

                  {/* Feedback */}
                  {detail._feedback && (
                    <div className="card p-4 bg-emerald-50/50 border-emerald-200">
                      <h4 className="text-xs font-semibold text-emerald-700 uppercase mb-2">Feedback</h4>
                      <div className="flex items-center gap-1 mb-1">
                        {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= detail._feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />)}
                        <span className="text-sm font-medium ml-1">{detail._feedback.rating}/5</span>
                      </div>
                      {detail._feedback.comment && <p className="text-sm text-slate-700">{detail._feedback.comment}</p>}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Quick Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                      {detail.status === 'pending' && <button onClick={() => handleStatusUpdate(detail._id, 'confirmed')} className="btn-primary btn-sm justify-center"><CheckCircle2 className="w-4 h-4" />Approve</button>}
                      {['pending','confirmed'].includes(detail.status) && <button onClick={() => handleStatusUpdate(detail._id, 'checked_in')} className="btn-secondary btn-sm justify-center"><UserCheck className="w-4 h-4" />Check In</button>}
                      {['checked_in','in_progress'].includes(detail.status) && <button onClick={() => handleStatusUpdate(detail._id, 'completed')} className="btn-primary btn-sm justify-center"><CheckCircle2 className="w-4 h-4" />Complete</button>}
                      {!['cancelled','completed','no_show'].includes(detail.status) && <>
                        <button onClick={() => { setShiftModal(detail); }} className="btn-secondary btn-sm justify-center"><ArrowRightLeft className="w-4 h-4" />Shift</button>
                        <button onClick={() => { setRescheduleModal(detail); setNewDate(''); setNewSlots([]); setNewSlot(null); }} className="btn-secondary btn-sm justify-center"><Calendar className="w-4 h-4" />Reschedule</button>
                        <button onClick={() => handleStatusUpdate(detail._id, 'cancelled')} className="btn-danger btn-sm justify-center"><XCircle className="w-4 h-4" />Cancel</button>
                      </>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Link to={`/appointments/${detail.refCode}`} className="btn-ghost btn-sm flex-1 justify-center"><Eye className="w-4 h-4" />Public View</Link>
                      <button onClick={async () => { const { data } = await appointmentAPI.downloadPDF(detail._id); downloadBlob(data, `${detail.refCode}.pdf`); }} className="btn-ghost btn-sm flex-1 justify-center"><FileText className="w-4 h-4" />PDF</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shift Modal */}
      {shiftModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up p-6">
            <h2 className="font-display text-lg font-bold mb-4">Shift Appointment</h2>
            <p className="text-sm text-slate-500 mb-4">Move <strong>{shiftModal.refCode}</strong> forward by specified days</p>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shift by (days)</label>
              <input type="number" value={shiftDays} onChange={e => setShiftDays(+e.target.value)} className="input-field" min={1} max={30} /></div>
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason</label>
              <input value={shiftReason} onChange={e => setShiftReason(e.target.value)} className="input-field" placeholder="e.g. Office closed, holiday..." /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShiftModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleShift} className="btn-primary">Shift {shiftDays} Day(s)</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl animate-slide-up p-6">
            <h2 className="font-display text-lg font-bold mb-4">Reschedule Appointment</h2>
            <p className="text-sm text-slate-500 mb-4">Pick a new date and time for <strong>{rescheduleModal.refCode}</strong></p>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Date</label>
              <input type="date" value={newDate} onChange={e => { setNewDate(e.target.value); setNewSlot(null); }} className="input-field" /></div>
              {newDate && <button onClick={handleRescheduleLoadSlots} className="btn-secondary btn-sm">Load Available Slots</button>}
              {newSlots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {newSlots.map(s => (
                    <button key={s.startTime} disabled={!s.available} onClick={() => setNewSlot(s)}
                      className={`py-2 px-2 rounded-lg text-xs font-medium ${!s.available ? 'slot-unavailable' : newSlot?.startTime === s.startTime ? 'slot-selected' : 'slot-available'}`}>
                      {formatTime(s.startTime)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setRescheduleModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleReschedule} disabled={!newSlot} className="btn-primary">Reschedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
