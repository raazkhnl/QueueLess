import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import toast from 'react-hot-toast';
import { ArrowLeft, UploadCloud, X, AlertCircle, Building2 } from 'lucide-react';
import { issueTypeAPI, issueAPI, orgAPI, branchAPI, appointmentAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const PRIORITIES: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];

export default function IssueWizard() {
  const [params] = useSearchParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const linkApt = params.get('linkApt') || '';
  const orgParam = params.get('org') || params.get('orgCode') || '';
  const issueTypeIdParam = params.get('issueType') || '';
  const issueTypeSlugParam = params.get('issueTypeSlug') || params.get('typeSlug') || '';
  const externalSubmissionNo = params.get('externalSubmissionNo') || params.get('submissionNo') || '';
  const sourceSystem = params.get('sourceSystem') || params.get('source') || '';
  const fullnameParam = params.get('fullname') || params.get('name') || '';
  const usernameParam = params.get('username') || params.get('email') || '';
  const phoneParam = params.get('phone') || '';
  const detailParam = params.get('detail') || params.get('description') || '';
  const subjectParam = params.get('subject') || '';
  const priorityParam = (params.get('priority') || '') as 'low' | 'medium' | 'high' | 'critical' | '';

  const [renderedAt] = useState(() => Date.now());
  const [hp, setHp] = useState('');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any[]>([]);
  const [linkedApt, setLinkedApt] = useState<any>(null);
  const [typesLoading, setTypesLoading] = useState(true);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    organization: '',
    branch: '',
    issueTypeId: '',
    subject: subjectParam,
    description: detailParam,
    priority: priorityParam || 'medium',
    guestName: fullnameParam,
    guestEmail: usernameParam.includes('@') ? usernameParam : '',
    guestPhone: phoneParam || (usernameParam && !usernameParam.includes('@') ? usernameParam : ''),
  });

  // Auth pre-fill
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData((p) => ({
        ...p,
        guestName: p.guestName || user.name || '',
        guestEmail: p.guestEmail || user.email || '',
        guestPhone: p.guestPhone || user.phone || '',
      }));
    }
  }, [isAuthenticated, user]);

  // Load organizations
  useEffect(() => {
    orgAPI.getPublic().then((r) => {
      const list = r.data.organizations || [];
      setOrgs(list);
      if (orgParam) {
        const target = list.find((o: any) => o._id === orgParam || o.slug === orgParam);
        if (target) setFormData((p) => ({ ...p, organization: target._id }));
      }
    }).catch(() => {}).finally(() => setOrgsLoading(false));
  }, [orgParam]);

  // Load issue types when org chosen (or globally if not)
  useEffect(() => {
    setTypesLoading(true);
    const promise = formData.organization
      ? issueTypeAPI.getPublic({ organization: formData.organization })
      : issueTypeAPI.getPublic();
    promise.then((r) => setIssueTypes(r.data.data || []))
      .catch(() => toast.error(t('issue.toast.failed')))
      .finally(() => setTypesLoading(false));
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [formData.organization]);

  // Resolve type from slug
  useEffect(() => {
    if (!issueTypeSlugParam) return;
    issueTypeAPI.getBySlug(issueTypeSlugParam).then((r) => {
      const tp = r.data.data;
      if (tp) {
        setFormData((p) => ({
          ...p,
          issueTypeId: tp._id,
          organization: p.organization || (tp.organization?._id || tp.organization),
          priority: p.priority || tp.priority || 'medium',
        }));
      }
    }).catch(() => {});
  }, [issueTypeSlugParam]);

  // Resolve type from explicit id
  useEffect(() => {
    if (issueTypeIdParam) setFormData((p) => ({ ...p, issueTypeId: p.issueTypeId || issueTypeIdParam }));
  }, [issueTypeIdParam]);

  // Load branches when org chosen
  useEffect(() => {
    if (!formData.organization) { setBranches([]); return; }
    branchAPI.getPublicByOrg(formData.organization).then((r) => setBranches(r.data.branches || r.data.data || [])).catch(() => {});
  }, [formData.organization]);

  // Resolve linked appointment
  useEffect(() => {
    if (!linkApt) return;
    appointmentAPI.getByRefCode(linkApt).then((r) => {
      const a = r.data.appointment;
      if (a) {
        setLinkedApt(a);
        setFormData((p) => ({
          ...p,
          organization: p.organization || (a.organization?._id || a.organization),
          branch: p.branch || (a.branch?._id || a.branch),
          guestName: p.guestName || a.guestName || '',
          guestEmail: p.guestEmail || a.guestEmail || '',
          guestPhone: p.guestPhone || a.guestPhone || '',
        }));
      }
    }).catch(() => {
      // refCode lookup failed — keep raw value to send to backend (it can resolve by id too)
    });
  }, [linkApt]);

  const selectedType = useMemo(() => issueTypes.find((t) => t._id === formData.issueTypeId), [issueTypes, formData.issueTypeId]);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    setSelectedFiles(arr);
  };
  const removeFile = (idx: number) => setSelectedFiles((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.issueTypeId) return toast.error(t('issue.toast.categoryRequired'));
    if (!formData.description.trim()) return toast.error(t('issue.toast.descriptionRequired'));
    if (!isAuthenticated && (!formData.guestName.trim() || !formData.guestEmail.trim())) {
      return toast.error(t('issue.toast.contactRequired'));
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('issueType', formData.issueTypeId);
      if (formData.organization) fd.append('organization', formData.organization);
      if (formData.branch) fd.append('branch', formData.branch);
      if (formData.subject) fd.append('subject', formData.subject);
      fd.append('description', formData.description);
      fd.append('priority', formData.priority);
      if (formData.guestName) fd.append('guestName', formData.guestName);
      if (formData.guestEmail) fd.append('guestEmail', formData.guestEmail);
      if (formData.guestPhone) fd.append('guestPhone', formData.guestPhone);
      if (linkApt) fd.append('linkedAppointments', linkApt);
      if (externalSubmissionNo) fd.append('externalSubmissionNo', externalSubmissionNo);
      if (sourceSystem) fd.append('sourceSystem', sourceSystem);
      // Anti-spam honeypot fields — must be present even if empty
      fd.append('_hp', hp);
      fd.append('_t', String(renderedAt));
      selectedFiles.forEach((f) => fd.append('attachments', f));

      const res = await issueAPI.submit(fd);
      const ticket = res.data.data;
      toast.success(t('issue.toast.success'));

      if (selectedType?.requiresAppointment) {
        const orgId = ticket.organization?._id || ticket.organization || formData.organization;
        navigate(`/book?org=${orgId}&linkIssue=${ticket._id}&issueRef=${ticket.refCode}`);
        return;
      }
      navigate(`/issue/track/${ticket.refCode}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('issue.toast.failed'));
    } finally {
      setLoading(false);
    }
  };

  const aptDate = linkedApt?.date ? new Date(linkedApt.date) : null;
  const aptStatus = linkedApt?.status as string | undefined;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Link to="/" className="btn-ghost mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> {t('booking.back')}</Link>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold font-display">{t('issue.title')}</h1>
          {sourceSystem && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {t('issue.via')} {sourceSystem}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mb-5">{t('issue.subtitle')}</p>

        {linkedApt && (
          <div className="mb-4 text-sm bg-indigo-50 text-indigo-700 p-3 rounded-md border border-indigo-100 flex items-start gap-2">
            <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div>{t('issue.linkedTo')} <strong className="font-mono">{linkedApt.refCode}</strong></div>
              <div className="text-xs text-indigo-600/80 mt-0.5">
                {linkedApt.appointmentType?.[lang === 'ne' ? 'nameNp' : 'name'] || linkedApt.appointmentType?.name}
                {aptDate && ` · ${aptDate.toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                {linkedApt.startTime && ` · ${linkedApt.startTime}`}
                {linkedApt.branch?.name && ` · ${linkedApt.branch.name}`}
              </div>
              {aptStatus && (
                <span className="inline-block mt-1 text-[10px] uppercase tracking-wider bg-white text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                  {t(`status.${aptStatus}`)}
                </span>
              )}
            </div>
          </div>
        )}
        {externalSubmissionNo && (
          <div className="mb-4 text-xs bg-emerald-50 text-emerald-700 p-2 rounded border border-emerald-100">
            {t('issue.externalRef')}: <span className="font-mono font-semibold">{externalSubmissionNo}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
            <label>Leave this field empty</label>
            <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('issue.field.org')}</label>
              <select className="input-field" value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value, branch: '', issueTypeId: '' })}
                disabled={orgsLoading}>
                <option value="">{t('issue.placeholder.org')}</option>
                {orgs.map((o) => <option key={o._id} value={o._id}>{lang === 'ne' && o.nameNp ? o.nameNp : o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('issue.field.branch')}</label>
              <select className="input-field" value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                disabled={!formData.organization || branches.length === 0}>
                <option value="">{t('issue.placeholder.branch')}</option>
                {branches.map((b) => <option key={b._id} value={b._id}>{lang === 'ne' && b.nameNp ? b.nameNp : b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('issue.field.category')} *</label>
            <select required className="input-field" value={formData.issueTypeId}
              onChange={(e) => setFormData({ ...formData, issueTypeId: e.target.value })} disabled={typesLoading}>
              <option value="">{typesLoading ? t('common.loading') : t('issue.placeholder.category')}</option>
              {issueTypes.map((tp) => (
                <option key={tp._id} value={tp._id}>
                  {lang === 'ne' && tp.nameNp ? tp.nameNp : tp.name}{tp.slaHours ? ` — ${tp.slaHours}h SLA` : ''}
                </option>
              ))}
            </select>
            {selectedType?.requiresAppointment && (
              <p className="mt-1 text-xs text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {t('issue.requiresAppointment')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('issue.field.subject')}</label>
            <input type="text" className="input-field" value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder={t('issue.placeholder.subject')} maxLength={140} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('issue.field.description')} *</label>
            <textarea required rows={5} className="input-field" value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('issue.placeholder.description')} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('issue.field.priority')}</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => (
                <button type="button" key={p}
                  onClick={() => setFormData({ ...formData, priority: p })}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    formData.priority === p
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}>{t(`priority.${p}`)}</button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              {isAuthenticated ? t('issue.guest.contactSubtitleAuth') : `${t('issue.guest.contactSubtitle')} *`}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">{t('issue.guest.nameLabel')} {!isAuthenticated && '*'}</label>
                <input required={!isAuthenticated} type="text" className="input-field"
                  value={formData.guestName} onChange={(e) => setFormData({ ...formData, guestName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('issue.guest.emailLabel')} {!isAuthenticated && '*'}</label>
                <input required={!isAuthenticated} type="email" className="input-field"
                  value={formData.guestEmail} onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('issue.guest.phoneLabel')}</label>
                <input type="tel" className="input-field"
                  value={formData.guestPhone} onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('issue.section.attachments')}</label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
              <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 mb-2">{t('issue.field.attachmentsHelp')}</p>
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx"
                className="mx-auto block text-sm" onChange={(e) => handleFileChange(e.target.files)} />
            </div>
            {selectedFiles.length > 0 && (
              <ul className="mt-3 space-y-1">
                {selectedFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" className="btn-primary w-full mt-4" disabled={loading}>
            {loading ? t('issue.action.submitting') : selectedType?.requiresAppointment ? t('issue.action.submitAndBook') : t('issue.action.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
