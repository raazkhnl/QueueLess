import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertCircle, Clock, Link as LinkIcon, RefreshCcw, Send, UserPlus, Edit3, X, MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { issueAPI, issueTypeAPI, adminAPI, branchAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const STATUSES = ['open', 'in_progress', 'forwarded', 'escalated', 'awaiting_user', 'resolved', 'closed', 'reopened'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-blue-100 text-blue-700',
  forwarded: 'bg-violet-100 text-violet-700',
  escalated: 'bg-amber-100 text-amber-700',
  awaiting_user: 'bg-orange-100 text-orange-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-700',
  reopened: 'bg-rose-100 text-rose-700',
};

type IssueAction = 'status' | 'forward' | 'assign' | 'comment';

export default function IssueManagement() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'tickets' | 'types'>('tickets');

  const [filters, setFilters] = useState({ status: '', priority: '', branch: '', issueType: '', search: '' });

  const [selected, setSelected] = useState<any | null>(null);
  const [action, setAction] = useState<IssueAction | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkReason, setBulkReason] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { issueAPI.statsSummary().then((r) => setStats(r.data)).catch(() => {}); }, [tickets.length]);

  const togglePick = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allOnPage = useMemo(() => tickets.map((t) => t._id), [tickets]);
  const allChecked = picked.size > 0 && allOnPage.every((id) => picked.has(id));
  const toggleAll = () => setPicked((p) => allChecked ? new Set() : new Set(allOnPage));

  const runBulkStatus = async () => {
    if (!bulkStatus || picked.size === 0) return;
    if (!confirm(`Apply status "${bulkStatus}" to ${picked.size} tickets?`)) return;
    try {
      const r = await issueAPI.bulkStatus(Array.from(picked), bulkStatus, bulkReason);
      const okCount = r.data.results.filter((x: any) => x.ok).length;
      toast.success(`${okCount}/${r.data.count} updated`);
      setPicked(new Set()); setBulkStatus(''); setBulkReason('');
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Bulk update failed');
    }
  };

  const fetchTickets = () => {
    setLoading(true);
    const params: any = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    issueAPI.adminGetAll(params)
      .then((res) => setTickets(res.data.data || []))
      .catch(() => toast.error('Failed to load tickets'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    issueTypeAPI.getAll().then((r) => setIssueTypes(r.data.data || [])).catch(() => {});
    if (user?.organization) {
      const orgId = typeof user.organization === 'object' ? (user.organization as any)._id : user.organization;
      branchAPI.getPublicByOrg(orgId).then((r) => setBranches(r.data.branches || r.data.data || [])).catch(() => {});
    }
    adminAPI.getUsers({ role: 'staff', limit: 100 }).then((r) => setStaff(r.data.users || r.data.data || [])).catch(() => {});
  }, [user]);

  const counts = useMemo(() => {
    const c = { open: 0, in_progress: 0, escalated: 0, resolved: 0, closed: 0 };
    tickets.forEach((t) => { if ((c as any)[t.status] != null) (c as any)[t.status]++; });
    return c;
  }, [tickets]);

  const onApplyFilters = (e: React.FormEvent) => { e.preventDefault(); fetchTickets(); };

  const closeModal = () => { setAction(null); };
  const refreshSelected = async (id: string) => {
    try {
      const r = await issueAPI.getById(id);
      setSelected(r.data.data);
      fetchTickets();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">Tickets &amp; Grievances</h1>
          <p className="text-sm text-slate-500">Triage incoming issues, route to teams, and track SLA</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button onClick={() => setView('tickets')}
              className={`px-3 py-1.5 rounded text-sm font-medium ${view === 'tickets' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>
              Tickets
            </button>
            <button onClick={() => setView('types')}
              className={`px-3 py-1.5 rounded text-sm font-medium ${view === 'types' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>
              Categories
            </button>
          </div>
          <button onClick={fetchTickets} className="btn-secondary btn-sm"><RefreshCcw className="w-4 h-4 mr-1" /> Refresh</button>
          <Link to="/issue/submit" className="btn-primary btn-sm">Raise ticket</Link>
        </div>
      </div>

      {view === 'tickets' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Open" value={counts.open} color="border-indigo-500" />
            <StatCard label="In Progress" value={counts.in_progress} color="border-blue-500" />
            <StatCard label="Escalated" value={counts.escalated} color="border-amber-500" emphasis />
            <StatCard label="Resolved" value={counts.resolved} color="border-emerald-500" />
            <StatCard label="Closed" value={counts.closed} color="border-slate-400" />
          </div>

          <form onSubmit={onApplyFilters} className="card p-4 grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="col-span-2 md:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" className="input-field pl-10 py-2 text-sm" placeholder="Search ref, subject, name…"
                value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            </div>
            <select className="input-field py-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select className="input-field py-2 text-sm" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="input-field py-2 text-sm" value={filters.issueType} onChange={(e) => setFilters({ ...filters, issueType: e.target.value })}>
              <option value="">All categories</option>
              {issueTypes.map((it) => <option key={it._id} value={it._id}>{it.name}</option>)}
            </select>
            <select className="input-field py-2 text-sm" value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
              <option value="">All branches</option>
              {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <button type="submit" className="btn-primary btn-sm md:col-span-1 col-span-2">Apply</button>
          </form>

          {stats && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Last 30 days</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Sparkline data={stats.byDay} color="#6366f1" />
                <CategoryBar data={stats.byCategory.slice(0, 6)} color="#10b981" />
                <PriorityBar data={stats.byPriority} />
              </div>
            </div>
          )}

          {picked.size > 0 && (
            <div className="card p-3 flex items-center gap-2 flex-wrap bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/40">
              <strong className="text-sm text-indigo-700 dark:text-indigo-200">{picked.size} selected</strong>
              <select className="input-field py-1.5 text-sm max-w-[180px]" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                <option value="">Change status…</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              <input className="input-field py-1.5 text-sm flex-1 min-w-[180px]" placeholder="Reason / note (optional)" value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
              <button onClick={runBulkStatus} disabled={!bulkStatus} className="btn-primary btn-sm">Apply</button>
              <button onClick={() => setPicked(new Set())} className="btn-ghost btn-sm">Clear</button>
            </div>
          )}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500">Loading tickets…</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No tickets match the current filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                      <th className="px-4 py-3 font-medium">Ticket</th>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">SLA</th>
                      <th className="px-4 py-3 font-medium">Assignee</th>
                      <th className="px-4 py-3 font-medium">Linked</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {tickets.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer" onClick={() => setSelected(t)}>
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={picked.has(t._id)} onChange={() => togglePick(t._id)} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-mono font-bold text-indigo-600 text-xs">{t.refCode}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[180px]">{t.subject || t.description}</p>
                        </td>
                        <td className="px-4 py-3 text-xs">{t.issueType?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${STATUS_COLORS[t.status] || 'bg-slate-100 text-slate-700'}`}>
                            {(t.status || '').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs capitalize">{t.priority}</td>
                        <td className="px-4 py-3 text-xs">
                          {t.slaDueDate ? (
                            <span className={new Date(t.slaDueDate).getTime() < Date.now() ? 'text-rose-600 font-medium' : 'text-slate-500'}>
                              {new Date(t.slaDueDate).toLocaleDateString()}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">{t.currentAssignee?.name || '—'}</td>
                        <td className="px-4 py-3 text-xs">
                          {t.linkedAppointments?.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600"><LinkIcon className="w-3 h-3" /> {t.linkedAppointments.length}</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={(e) => { e.stopPropagation(); setSelected(t); }} className="text-indigo-600 hover:underline text-xs font-medium">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {view === 'types' && <IssueTypesAdmin types={issueTypes} reload={() => issueTypeAPI.getAll().then((r) => setIssueTypes(r.data.data || []))} />}

      {/* Side drawer */}
      {selected && (
        <DetailDrawer
          issue={selected}
          onClose={() => setSelected(null)}
          onAction={(a) => setAction(a)}
        />
      )}

      {/* Action modals */}
      {selected && action === 'status' && (
        <StatusModal issue={selected} onClose={closeModal} onDone={() => { closeModal(); refreshSelected(selected._id); }} />
      )}
      {selected && action === 'forward' && (
        <ForwardModal issue={selected} branches={branches} staff={staff} onClose={closeModal} onDone={() => { closeModal(); refreshSelected(selected._id); }} />
      )}
      {selected && action === 'assign' && (
        <AssignModal issue={selected} staff={staff} onClose={closeModal} onDone={() => { closeModal(); refreshSelected(selected._id); }} />
      )}
      {selected && action === 'comment' && (
        <CommentModal issue={selected} onClose={closeModal} onDone={() => { closeModal(); refreshSelected(selected._id); }} />
      )}
    </div>
  );
}

function StatCard({ label, value, color, emphasis }: { label: string; value: number; color: string; emphasis?: boolean }) {
  return (
    <div className={`card p-4 border-l-4 ${color}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${emphasis ? 'text-amber-600' : ''}`}>{value}</p>
    </div>
  );
}

function DetailDrawer({ issue, onClose, onAction }: { issue: any; onClose: () => void; onAction: (a: IssueAction) => void }) {
  const isTerminal = ['resolved', 'closed'].includes(issue.status);
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button className="flex-1 bg-black/40" onClick={onClose} aria-label="Close drawer" />
      <aside className="w-full max-w-xl bg-white dark:bg-slate-900 h-full overflow-y-auto shadow-2xl">
        <header className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Ticket</p>
            <h2 className="font-mono text-lg font-bold">{issue.refCode}</h2>
            <p className="text-sm text-slate-600 mt-1">{issue.subject || issue.issueType?.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </header>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded font-semibold uppercase ${STATUS_COLORS[issue.status] || 'bg-slate-100 text-slate-700'}`}>
              {(issue.status || '').replace('_', ' ')}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">Priority: {issue.priority}</span>
            {issue.slaDueDate && (
              <span className={`px-2 py-0.5 rounded ${new Date(issue.slaDueDate).getTime() < Date.now() ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                <Clock className="w-3 h-3 inline mr-1" />SLA {new Date(issue.slaDueDate).toLocaleString()}
              </span>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/40 rounded p-3">
            <p className="text-xs text-slate-500 mb-1">Description</p>
            <p className="text-sm whitespace-pre-wrap">{issue.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Reporter" value={issue.guestName || issue.citizen?.name || '—'} />
            <Field label="Email" value={issue.guestEmail || issue.citizen?.email || '—'} />
            <Field label="Phone" value={issue.guestPhone || issue.citizen?.phone || '—'} />
            <Field label="Branch" value={issue.branch?.name || '—'} />
            <Field label="Assignee" value={issue.currentAssignee?.name || '—'} />
            <Field label="Source" value={issue.sourceSystem || issue.sourceChannel || '—'} />
            {issue.externalSubmissionNo && <Field label="External Ref" value={issue.externalSubmissionNo} mono />}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => onAction('status')} className="btn-primary btn-sm" disabled={isTerminal && issue.status !== 'reopened'}>
              <Edit3 className="w-4 h-4" /> Change status
            </button>
            <button onClick={() => onAction('forward')} className="btn-secondary btn-sm">
              <Send className="w-4 h-4" /> Forward
            </button>
            <button onClick={() => onAction('assign')} className="btn-secondary btn-sm">
              <UserPlus className="w-4 h-4" /> Assign
            </button>
            <button onClick={() => onAction('comment')} className="btn-secondary btn-sm">
              <MessageSquare className="w-4 h-4" /> Add comment
            </button>
            <Link to={`/issue/track/${issue.refCode}`} target="_blank" className="btn-ghost btn-sm">Open public page</Link>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 mb-2">Conversation</h3>
            {(issue.comments?.length ?? 0) === 0 ? (
              <p className="text-xs text-slate-500">No comments yet.</p>
            ) : (
              <ul className="space-y-2">
                {issue.comments.map((c: any, idx: number) => (
                  <li key={c._id || idx} className={`p-3 rounded border ${c.isInternal ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white dark:bg-slate-800/50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium">{c.author?.name || c.authorName || 'User'}{c.isInternal && <span className="ml-2 text-[10px] uppercase bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">Internal</span>}</p>
                      <p className="text-[10px] text-slate-400">{new Date(c.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-200 mb-2">Activity</h3>
            <ul className="border-l-2 border-slate-200 dark:border-slate-700 ml-2 pl-4 space-y-2 text-sm">
              {(issue.history || []).map((h: any, i: number) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[22px] top-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white" />
                  <p className="text-[11px] text-slate-400">{new Date(h.timestamp).toLocaleString()}</p>
                  <p className="text-xs font-medium">{h.action}{h.toStatus ? ` → ${h.toStatus}` : ''}</p>
                  {h.reason && <p className="text-xs text-slate-500">{h.reason}</p>}
                  {(h.actor?.name || h.actorName) && <p className="text-[10px] text-slate-400">by {h.actor?.name || h.actorName}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm ${mono ? 'font-mono text-emerald-700' : ''}`}>{value}</p>
    </div>
  );
}

function StatusModal({ issue, onClose, onDone }: { issue: any; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState(issue.status);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (status === issue.status) return onClose();
    setBusy(true);
    try {
      await issueAPI.updateStatus(issue._id, { status, reason });
      toast.success('Status updated');
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };
  return (
    <Modal title="Change status" onClose={onClose}>
      <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
      <textarea rows={3} className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason / resolution note (optional)" />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary btn-sm">{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function ForwardModal({ issue, branches, staff, onClose, onDone }: { issue: any; branches: any[]; staff: any[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ toAssignee: '', toBranch: '', toUnit: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!form.reason.trim()) return toast.error('Reason is required to forward');
    setBusy(true);
    try {
      await issueAPI.forward(issue._id, form);
      toast.success('Forwarded');
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };
  return (
    <Modal title="Forward ticket" onClose={onClose}>
      <select className="input-field" value={form.toBranch} onChange={(e) => setForm({ ...form, toBranch: e.target.value })}>
        <option value="">Keep current branch</option>
        {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
      </select>
      <select className="input-field" value={form.toAssignee} onChange={(e) => setForm({ ...form, toAssignee: e.target.value })}>
        <option value="">Keep current assignee</option>
        {staff.map((s) => <option key={s._id} value={s._id}>{s.name} — {s.email}</option>)}
      </select>
      <input className="input-field" value={form.toUnit} onChange={(e) => setForm({ ...form, toUnit: e.target.value })} placeholder="Unit / desk code (optional)" />
      <textarea rows={3} className="input-field" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why are you forwarding? *" required />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary btn-sm">{busy ? 'Saving…' : 'Forward'}</button>
      </div>
    </Modal>
  );
}

function AssignModal({ issue, staff, onClose, onDone }: { issue: any; staff: any[]; onClose: () => void; onDone: () => void }) {
  const [assignee, setAssignee] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!assignee) return toast.error('Pick an assignee');
    setBusy(true);
    try {
      await issueAPI.assign(issue._id, { assignee, reason });
      toast.success('Assigned');
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };
  return (
    <Modal title="Assign ticket" onClose={onClose}>
      <select className="input-field" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
        <option value="">Select staff…</option>
        {staff.map((s) => <option key={s._id} value={s._id}>{s.name} — {s.email}</option>)}
      </select>
      <textarea rows={2} className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Note (optional)" />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary btn-sm">{busy ? 'Saving…' : 'Assign'}</button>
      </div>
    </Modal>
  );
}

function CommentModal({ issue, onClose, onDone }: { issue: any; onClose: () => void; onDone: () => void }) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('body', body);
      if (internal) fd.append('isInternal', 'true');
      await issueAPI.addComment(issue._id, fd);
      toast.success('Comment added');
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };
  return (
    <Modal title="Add comment" onClose={onClose}>
      <textarea rows={4} className="input-field" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply or note…" />
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
        Internal note (only visible to staff)
      </label>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary btn-sm">{busy ? 'Posting…' : 'Post'}</button>
      </div>
    </Modal>
  );
}

function Sparkline({ data, color }: { data: Array<{ _id: string; n: number }>; color: string }) {
  if (!data?.length) return <div className="text-xs text-slate-400">No data</div>;
  const w = 280, h = 60, max = Math.max(...data.map((d) => d.n), 1);
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => `${i * step},${h - (d.n / max) * h}`).join(' ');
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">Tickets per day</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2" />
        {data.map((d, i) => <circle key={d._id} cx={i * step} cy={h - (d.n / max) * h} r="2" fill={color} />)}
      </svg>
    </div>
  );
}

function CategoryBar({ data, color }: { data: Array<{ name: string; count: number }>; color: string }) {
  if (!data?.length) return <div className="text-xs text-slate-400">No data</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">Top categories</p>
      <ul className="space-y-1 text-xs">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="truncate w-24 text-slate-700 dark:text-slate-200">{d.name}</span>
            <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded h-2 overflow-hidden">
              <div className="h-2 rounded" style={{ width: `${(d.count / max) * 100}%`, background: color }} />
            </div>
            <span className="font-medium w-6 text-right">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriorityBar({ data }: { data: Record<string, number> }) {
  const order = ['critical', 'high', 'medium', 'low'];
  const colors: Record<string, string> = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#10b981' };
  const total = order.reduce((a, k) => a + (data?.[k] || 0), 0) || 1;
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">Priority mix</p>
      <div className="flex h-3 rounded overflow-hidden bg-slate-100 dark:bg-slate-700">
        {order.map((k) => (
          <div key={k} title={`${k}: ${data?.[k] || 0}`} style={{ width: `${((data?.[k] || 0) / total) * 100}%`, background: colors[k] }} />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[11px]">
        {order.map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: colors[k] }} />
            <span className="capitalize text-slate-600 dark:text-slate-300">{k}</span>
            <span className="ml-auto font-medium">{data?.[k] || 0}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function IssueTypesAdmin({ types, reload }: { types: any[]; reload: () => Promise<any> }) {
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Define the categories that citizens can pick when raising tickets.</p>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm">
          <SettingsIcon className="w-4 h-4" /> New category
        </button>
      </div>
      <div className="card overflow-hidden">
        {types.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No categories defined yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Slug</th>
                <th className="px-4 py-2 text-left font-medium">SLA</th>
                <th className="px-4 py-2 text-left font-medium">Priority</th>
                <th className="px-4 py-2 text-left font-medium">Requires Apt</th>
                <th className="px-4 py-2 text-left font-medium">Active</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {types.map((t) => (
                <tr key={t._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2">{t.name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-2 text-xs">{t.slaHours}h</td>
                  <td className="px-4 py-2 text-xs capitalize">{t.priority}</td>
                  <td className="px-4 py-2 text-xs">{t.requiresAppointment ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-xs">{t.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => { setEditing(t); setShowForm(true); }} className="text-indigo-600 hover:underline text-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {showForm && <IssueTypeForm initial={editing} onClose={() => setShowForm(false)} onDone={async () => { setShowForm(false); await reload(); }} />}
    </div>
  );
}

function IssueTypeForm({ initial, onClose, onDone }: { initial: any; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    nameNp: initial?.nameNp || '',
    slug: initial?.slug || '',
    description: initial?.description || '',
    slaHours: initial?.slaHours || 48,
    priority: initial?.priority || 'medium',
    requiresAppointment: !!initial?.requiresAppointment,
    isActive: initial?.isActive !== false,
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setBusy(true);
    try {
      if (initial?._id) await issueTypeAPI.update(initial._id, form);
      else await issueTypeAPI.create(form);
      toast.success('Saved');
      onDone();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setBusy(false); }
  };

  return (
    <Modal title={initial ? 'Edit category' : 'New category'} onClose={onClose}>
      <input className="input-field" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <input className="input-field" placeholder="Name (Nepali)" value={form.nameNp} onChange={(e) => setForm({ ...form, nameNp: e.target.value })} />
      <input className="input-field" placeholder="Slug (URL-safe)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      <textarea rows={2} className="input-field" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min={1} className="input-field" placeholder="SLA hours" value={form.slaHours} onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })} />
        <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.requiresAppointment} onChange={(e) => setForm({ ...form, requiresAppointment: e.target.checked })} />
        Requires a follow-up appointment
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        Active
      </label>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost btn-sm">Cancel</button>
        <button onClick={submit} disabled={busy} className="btn-primary btn-sm">{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}
