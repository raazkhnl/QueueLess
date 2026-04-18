import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Phone, Mail, Download, FileDown, ArrowLeft, CheckCircle2, XCircle, AlertCircle, ExternalLink, Star, Navigation } from 'lucide-react';
import { appointmentAPI, feedbackAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useI18n } from '../../lib/i18n';
import { formatDate, formatTime, statusColors, downloadBlob } from '../../lib/utils';
import toast from 'react-hot-toast';

export default function AppointmentDetail() {
  const { refCode } = useParams();
  const { user } = useAuthStore();
  const { t, lang } = useI18n();
  const [apt, setApt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbForm, setFbForm] = useState({ rating: 0, comment: '', staffRating: 0, waitTimeRating: 0, serviceRating: 0 });
  const [fbLoading, setFbLoading] = useState(false);

  useEffect(() => {
    if (!refCode) return;
    setLoading(true);
    appointmentAPI.getByRefCode(refCode)
      .then(r => {
        setApt(r.data.appointment);
        feedbackAPI.getByAppointment(r.data.appointment._id).then(f => setFeedback(f.data.feedback)).catch(() => {});
      })
      .catch(e => setError(e.response?.data?.message || 'Appointment not found'))
      .finally(() => setLoading(false));
  }, [refCode]);

  const handleDownloadPDF = async () => {
    try { const { data } = await appointmentAPI.downloadPDFByRef(refCode!); downloadBlob(data, `appointment-${refCode}.pdf`); }
    catch { toast.error('Download failed'); }
  };
  const handleExportICal = async () => {
    try { const { data } = await appointmentAPI.exportICal(apt._id); downloadBlob(data, `appointment-${refCode}.ics`); }
    catch { toast.error('Export failed'); }
  };
  const handleSubmitFeedback = async () => {
    if (fbForm.rating === 0) return toast.error('Please select a rating');
    setFbLoading(true);
    try {
      await feedbackAPI.create({ appointment: apt._id, ...fbForm });
      toast.success('Thank you for your feedback!');
      setShowFeedback(false);
      feedbackAPI.getByAppointment(apt._id).then(f => setFeedback(f.data.feedback)).catch(() => {});
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setFbLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (error) return (
    <div className="max-w-lg mx-auto py-20 px-4 text-center">
      <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
      <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">Not Found</h1>
      <p className="text-slate-500 mb-6">{error}</p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </div>
  );

  const org = apt.organization as any;
  const branch = apt.branch as any;
  const type = apt.appointmentType as any;
  const mapUrl = branch?.location?.coordinates ? `https://www.google.com/maps?q=${branch.location.coordinates[1]},${branch.location.coordinates[0]}` : '#';

  const StarRating = ({ value, onChange, size = 'w-8 h-8' }: any) => (
    <div className="flex gap-1">{[1,2,3,4,5].map(s => (
      <button key={s} type="button" onClick={() => onChange(s)} className="focus:outline-none">
        <Star className={`${size} transition-colors ${s <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-amber-200'}`} />
      </button>
    ))}</div>
  );

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      <Link to="/" className="btn-ghost btn-sm mb-6"><ArrowLeft className="w-4 h-4" />Home</Link>

      <div className="card overflow-hidden">
        <div className="p-6 text-center" style={{ background: `linear-gradient(135deg, ${org?.branding?.primaryColor || '#2563eb'}, ${org?.branding?.secondaryColor || '#1e40af'})` }}>
          <p className="text-white/70 text-sm font-medium mb-1">{lang === 'ne' && org?.nameNp ? org.nameNp : org?.name}</p>
          <h1 className="font-display text-2xl font-bold text-white mb-3">{t('booking.confirmed') || 'Appointment Details'}</h1>
          <span className={`inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white font-semibold text-sm capitalize`}>
            {apt.status === 'confirmed' ? <CheckCircle2 className="w-5 h-5" /> : apt.status === 'cancelled' ? <XCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {apt.status.replace('_', ' ')}
          </span>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Reference</p>
              <p className="text-2xl font-bold text-slate-900 font-mono">{apt.refCode}</p>
              {apt.externalSubmissionNo && (
                <div className="mt-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">External Submission No.</p>
                  <p className="text-sm font-semibold text-emerald-600 font-mono bg-emerald-50 inline-block px-2 py-0.5 rounded">{apt.externalSubmissionNo}</p>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Token #</p>
              <p className="text-3xl font-extrabold" style={{ color: org?.branding?.accentColor || '#f59e0b' }}>#{apt.tokenNumber}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0"><Calendar className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-xs text-slate-500">Date & Time</p>
                <p className="font-semibold">{formatDate(apt.date, { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
                <p className="text-sm text-slate-600">{formatTime(apt.startTime)} – {formatTime(apt.endTime)} ({apt.duration} min)</p></div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: (type?.color || '#2563eb') + '15' }}>
                <Clock className="w-5 h-5" style={{ color: type?.color }} /></div>
              <div><p className="text-xs text-slate-500">Service</p><p className="font-semibold">{lang === 'ne' && type?.nameNp ? type.nameNp : type?.name}</p>
                {apt.roomNo && <p className="text-sm font-medium text-emerald-600 mt-1">{lang === 'ne' && apt.roomNoNp ? apt.roomNoNp : apt.roomNo}</p>}
                {type?.description && <p className="text-sm text-slate-500 mt-0.5">{type.description}</p>}
                {apt.price > 0 && <p className="text-sm font-medium text-primary-600 mt-1">NPR {apt.price}</p>}</div>
            </div>

            {/* Branch with clickable map, phone, email */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0"><MapPin className="w-5 h-5 text-slate-500" /></div>
              <div className="flex-1">
                <p className="text-xs text-slate-500">Location</p>
                <p className="font-semibold">{lang === 'ne' && branch?.nameNp ? branch.nameNp : branch?.name}</p>
                <p className="text-sm text-slate-500">{lang === 'ne' && branch?.addressNp ? branch.addressNp : branch?.address}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors">
                    <Navigation className="w-3.5 h-3.5" />Open in Maps
                  </a>
                  {branch?.phone && (
                    <a href={`tel:${branch.phone}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors">
                      <Phone className="w-3.5 h-3.5" />Call {branch.phone}
                    </a>
                  )}
                  {branch?.email && (
                    <a href={`mailto:${branch.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                      <Mail className="w-3.5 h-3.5" />Email
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Organization contact */}
            {(org?.phone || org?.email) && (
              <div className="card p-4 bg-slate-50 border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Organization Contact</h4>
                <p className="font-semibold text-sm">{lang === 'ne' && org?.nameNp ? org.nameNp : org?.name}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {org.phone && <a href={`tel:${org.phone}`} className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:underline"><Phone className="w-3 h-3" />{org.phone}</a>}
                  {org.email && <a href={`mailto:${org.email}`} className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:underline"><Mail className="w-3 h-3" />{org.email}</a>}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button onClick={handleDownloadPDF} className="btn-primary flex-1"><Download className="w-4 h-4" />Download PDF</button>
            <button onClick={handleExportICal} className="btn-secondary flex-1"><FileDown className="w-4 h-4" />Add to Calendar</button>
          </div>

          {/* Feedback section */}
          {apt.status === 'completed' && !feedback && !showFeedback && (
            <button onClick={() => setShowFeedback(true)} className="btn-ghost w-full mt-4 text-amber-600 hover:bg-amber-50">
              <Star className="w-4 h-4" />Rate Your Experience
            </button>
          )}
          {showFeedback && (
            <div className="card p-5 mt-4 border-amber-200 bg-amber-50/30 space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">Rate Your Experience</h3>
              <div><label className="text-sm text-slate-600 mb-1 block">Overall Rating *</label><StarRating value={fbForm.rating} onChange={(v: number) => setFbForm({...fbForm, rating: v})} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-slate-500 block mb-1">Staff</label><StarRating value={fbForm.staffRating} onChange={(v: number) => setFbForm({...fbForm, staffRating: v})} size="w-5 h-5" /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Wait Time</label><StarRating value={fbForm.waitTimeRating} onChange={(v: number) => setFbForm({...fbForm, waitTimeRating: v})} size="w-5 h-5" /></div>
                <div><label className="text-xs text-slate-500 block mb-1">Service</label><StarRating value={fbForm.serviceRating} onChange={(v: number) => setFbForm({...fbForm, serviceRating: v})} size="w-5 h-5" /></div>
              </div>
              <div><label className="text-sm text-slate-600 mb-1 block">Comments</label>
              <textarea value={fbForm.comment} onChange={e => setFbForm({...fbForm, comment: e.target.value})} className="input-field" rows={3} placeholder="Tell us about your experience..." /></div>
              <div className="flex gap-3">
                <button onClick={() => setShowFeedback(false)} className="btn-secondary btn-sm">Cancel</button>
                <button onClick={handleSubmitFeedback} disabled={fbLoading} className="btn-primary btn-sm">{fbLoading ? 'Submitting...' : 'Submit'}</button>
              </div>
            </div>
          )}
          {feedback && (
            <div className="card p-4 mt-4 bg-emerald-50/50 border-emerald-200">
              <h4 className="text-xs font-semibold text-emerald-700 uppercase mb-2">Your Feedback</h4>
              <div className="flex items-center gap-1 mb-1">
                {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${s <= feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />)}
              </div>
              {feedback.comment && <p className="text-sm text-slate-700 mt-1">{feedback.comment}</p>}
              {feedback.adminReply && <div className="mt-2 pt-2 border-t border-emerald-200"><p className="text-xs text-emerald-600 font-medium">Admin Reply:</p><p className="text-sm">{feedback.adminReply}</p></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
