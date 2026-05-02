import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Info, AlertTriangle, Send, Paperclip, RotateCcw, RefreshCw, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { issueAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useI18n } from '../../lib/i18n';
import { formatBs } from '../../lib/nepaliDate';

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

export default function TicketTracking() {
  const { refCode } = useParams();
  const { isAuthenticated } = useAuthStore();
  const { t, lang } = useI18n();
  const tStatus = (s?: string) => s ? t(`status.${s}`) : '';
  const tHistory = (a?: string) => a ? (t(`history.${a}`) || a.replace('_', ' ')) : '';
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopen, setShowReopen] = useState(false);

  const load = useCallback(() => {
    if (!refCode) return;
    setLoading(true);
    issueAPI.getTracking(refCode).then((res) => {
      setTicket(res.data.data); setError(null);
    }).catch((err) => {
      setError(err.response?.data?.message || t('issue.tracking.notFound'));
    }).finally(() => setLoading(false));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [refCode]);

  useEffect(() => { load(); }, [load]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return toast.error(t('issue.toast.loginRequired'));
    if (!commentBody.trim()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('body', commentBody.trim());
      commentFiles.forEach((f) => fd.append('attachments', f));
      await issueAPI.addComment(ticket._id, fd);
      setCommentBody(''); setCommentFiles([]);
      toast.success(t('issue.toast.replyPosted'));
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('issue.toast.replyFailed'));
    } finally { setSubmitting(false); }
  };

  const handleReopen = async () => {
    if (!reopenReason.trim()) return toast.error(t('issue.toast.reopenReasonRequired'));
    try {
      await issueAPI.reopen(ticket._id, { reason: reopenReason.trim() });
      toast.success(t('issue.toast.reopened'));
      setShowReopen(false); setReopenReason('');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('issue.toast.reopenFailed'));
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-48"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;
  }
  if (error || !ticket) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold font-display">{error || t('issue.tracking.error')}</h2>
        <Link to="/" className="text-indigo-600 hover:underline mt-4 inline-block">{t('issue.tracking.returnHome')}</Link>
      </div>
    );
  }

  const isTerminal = ['resolved', 'closed'].includes(ticket.status);
  const orgId = ticket.organization?._id || ticket.organization;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="btn-ghost"><ArrowLeft className="w-4 h-4 mr-2" /> {t('booking.back')}</Link>
        <button onClick={load} className="btn-ghost btn-sm" title={t('issue.action.refresh')} aria-label={t('issue.action.refresh')}><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="card p-6 border-t-4 border-indigo-600">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">{t('issue.tracking.id')}</p>
            <h1 className="text-2xl md:text-3xl font-mono font-bold">{ticket.refCode}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {(lang === 'ne' && ticket.organization?.nameNp) ? ticket.organization.nameNp : ticket.organization?.name}
              {ticket.branch?.name ? ` · ${(lang === 'ne' && ticket.branch?.nameNp) ? ticket.branch.nameNp : ticket.branch.name}` : ''}
            </p>
            {ticket.externalSubmissionNo && (
              <p className="text-[11px] mt-1">
                {t('issue.externalRef')}: <span className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{ticket.externalSubmissionNo}</span>
                {ticket.sourceSystem ? <span className="text-slate-500"> {t('issue.via')} {ticket.sourceSystem}</span> : null}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[ticket.status] || 'bg-slate-100 text-slate-700'}`}>
              {tStatus(ticket.status)}
            </span>
            {ticket.priority && (
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{t('issue.field.priority')}: <strong className="text-slate-700">{t(`priority.${ticket.priority}`)}</strong></p>
            )}
            {ticket.slaDueDate && !isTerminal && (
              <p className="text-[11px] text-slate-500 mt-1">{t('issue.tracking.sla')}: {new Date(ticket.slaDueDate).toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-GB')}</p>
            )}
            {ticket.slaDueDate && (
              <p className="text-[10px] text-slate-400 mt-0.5">वि.सं. {formatBs(ticket.slaDueDate, { mode: 'short', lang })}</p>
            )}
          </div>
        </div>

        {ticket.subject && (
          <h2 className="text-lg font-semibold text-slate-900 mb-1">{ticket.subject}</h2>
        )}
        <div className="bg-slate-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-slate-700 mb-1">
            {(lang === 'ne' && ticket.issueType?.nameNp) ? ticket.issueType.nameNp : (ticket.issueType?.name || t('common.all'))}
          </h3>
          <p className="text-slate-600 text-sm whitespace-pre-wrap">{ticket.description}</p>
          {ticket.resolutionNote && isTerminal && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold mb-1">{t('issue.tracking.resolution')}</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.resolutionNote}</p>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            to={`/book?org=${orgId}&linkIssue=${ticket._id}&issueRef=${ticket.refCode}`}
            className="btn-secondary btn-sm bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Calendar className="w-4 h-4 mr-1" /> {t('issue.cta.bookFollowup')}
          </Link>
          {isTerminal && (
            <button onClick={() => setShowReopen((v) => !v)} className="btn-secondary btn-sm bg-white border-rose-200 text-rose-700 hover:bg-rose-50">
              <RotateCcw className="w-4 h-4 mr-1" /> {t('issue.action.reopen')}
            </button>
          )}
        </div>

        {showReopen && (
          <div className="mb-6 p-4 border border-rose-200 bg-rose-50/50 rounded-lg">
            <label className="block text-sm font-medium mb-1">{t('issue.reopen.title')}</label>
            <textarea
              rows={2} className="input-field" value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder={t('issue.reopen.placeholder')}
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button onClick={() => setShowReopen(false)} className="btn-ghost btn-sm">{t('common.cancel')}</button>
              <button onClick={handleReopen} className="btn-primary btn-sm">{t('issue.reopen.button')}</button>
            </div>
          </div>
        )}

        {/* Conversation thread */}
        <div className="space-y-4 mb-8">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" /> {t('issue.thread.title')}
          </h3>
          {(ticket.comments?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">{t('issue.thread.empty')}</p>
          ) : (
            <div className="space-y-3">
              {ticket.comments.map((c: any, idx: number) => (
                <div key={c._id || idx} className={`p-3 rounded-lg border ${c.isInternal ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-800">
                      {c.author?.name || c.authorName || t('issue.role.you')}
                      {c.author?.role && c.author.role !== 'citizen' && (
                        <span className="ml-2 text-[10px] uppercase bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{t('issue.role.staff')}</span>
                      )}
                      {c.isInternal && (
                        <span className="ml-2 text-[10px] uppercase bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">{t('issue.role.internal')}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-GB')}</p>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.body}</p>
                  {c.attachments?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.attachments.map((a: any, i: number) => (
                        <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 inline-flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded">
                          <Paperclip className="w-3 h-3" />{a.originalName || a.filename}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isAuthenticated ? (
            <form onSubmit={handleAddComment} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/30">
              <textarea
                rows={3} className="input-field"
                value={commentBody} onChange={(e) => setCommentBody(e.target.value)}
                placeholder={t('issue.thread.placeholder')}
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="inline-flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                  <Paperclip className="w-3.5 h-3.5" />
                  <input type="file" multiple className="hidden"
                    onChange={(e) => setCommentFiles(Array.from(e.target.files || []).slice(0, 3))} />
                  {t('issue.action.attach')}
                  {commentFiles.length > 0 && <span className="text-indigo-600">({commentFiles.length})</span>}
                </label>
                <button type="submit" disabled={submitting || !commentBody.trim()} className="btn-primary btn-sm">
                  {submitting ? t('issue.action.posting') : t('issue.action.reply')}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-slate-500">
              <Link to={`/login?redirect=/issue/track/${ticket.refCode}`} className="text-indigo-600 hover:underline">{t('login.signIn')}</Link> · {t('issue.thread.loginToReply')}
            </p>
          )}
        </div>

        {/* Attachments */}
        {ticket.attachments?.length > 0 && (
          <div className="mb-8">
            <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2 mb-2">
              <Paperclip className="w-4 h-4" /> {t('issue.attachments.title')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((a: any, i: number) => (
                <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-indigo-600 inline-flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100">
                  <Paperclip className="w-3 h-3" />{a.originalName || a.filename}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" /> {t('issue.history.title')}
          </h3>
          <div className="border-l-2 border-slate-200 ml-3 pl-4 space-y-3">
            {(ticket.history || []).map((h: any, idx: number) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[23px] top-1 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white"></div>
                <p className="text-xs text-slate-500">{new Date(h.timestamp).toLocaleString(lang === 'ne' ? 'ne-NP' : 'en-GB')}</p>
                <p className="font-medium text-slate-800 text-sm">{tHistory(h.action)}{h.toStatus ? ` → ${tStatus(h.toStatus)}` : ''}</p>
                {h.reason && <p className="text-xs text-slate-600">{h.reason}</p>}
                {(h.actor?.name || h.actorName) && <p className="text-[11px] text-slate-400">— {h.actor?.name || h.actorName}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Linked appointments — fully detailed cards */}
        {ticket.linkedAppointments?.length > 0 && (
          <div className="mt-8 border-t border-slate-100 pt-6">
            <h4 className="font-medium text-slate-700 flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-slate-400" /> {t('hybrid.linkedAppointmentTitle')} ({ticket.linkedAppointments.length})
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {ticket.linkedAppointments.map((apt: any) => {
                const aptD = apt.date ? new Date(apt.date) : null;
                return (
                  <Link key={apt._id} to={`/appointments/${apt.refCode}`}
                    className="bg-white border border-slate-200 p-3 rounded shadow-sm hover:border-indigo-300 transition-colors block">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-mono font-bold text-slate-800 text-sm">{apt.refCode}</p>
                      {apt.status && (
                        <span className="text-[10px] uppercase font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{tStatus(apt.status)}</span>
                      )}
                    </div>
                    {aptD && (
                      <p className="text-xs text-slate-600">
                        {aptD.toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {apt.startTime && ` · ${apt.startTime}`}
                      </p>
                    )}
                    {aptD && (
                      <p className="text-[10px] text-slate-400 mt-0.5">वि.सं. {formatBs(aptD, { mode: 'short', lang })}</p>
                    )}
                    <p className="text-[11px] text-indigo-600 font-medium mt-1">{t('hybrid.viewAppointment')} →</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
