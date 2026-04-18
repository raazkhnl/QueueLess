/**
 * BookingWizard - Multi-step public booking flow
 * Org → Branch → Service → Date/Slot → Details → Confirmation
 * Features: search, nearest branch, custom field validation, i18n, contact links
 */
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Building2, GitBranch, CalendarClock, Calendar, Clock, User, Mail, Phone, MapPin, ArrowLeft, ArrowRight, CheckCircle2, Download, FileText, Search, AlertCircle, Navigation } from 'lucide-react';
import { orgAPI, branchAPI, apptTypeAPI, appointmentAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useI18n } from '../../lib/i18n';
import { formatDate, formatTime, downloadBlob } from '../../lib/utils';
import toast from 'react-hot-toast';

const steps = ['Organization', 'Branch', 'Service', 'Date & Time', 'Details', 'Confirmed'];

export default function BookingWizard() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { t, lang } = useI18n();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [orgs, setOrgs] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);

  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '', notes: '' });
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [booking, setBooking] = useState<any>(null);
  const [searchBranch, setSearchBranch] = useState('');
  const [searchService, setSearchService] = useState('');
  const [userLocation, setUserLocation] = useState<{lat:number;lng:number}|null>(null);

  // Search state
  const [orgSearch, setOrgSearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');

  useEffect(() => {
    orgAPI.getPublic().then(r => {
      setOrgs(r.data.organizations);
      const preOrg = params.get('org');
      const orgCode = params.get('orgCode');
      
      let targetOrg = null;
      if (preOrg) targetOrg = r.data.organizations.find((o: any) => o._id === preOrg);
      if (orgCode) targetOrg = r.data.organizations.find((o: any) => o.slug === orgCode || o._id === orgCode);

      if (targetOrg) { 
        setSelectedOrg(targetOrg); 
        const hasService = params.get('serviceCode') || params.get('serviceTypeCode');
        if (!hasService) setStep(1); 
      }
    });

    const fullname = params.get('fullname');
    const username = params.get('username');
    const detail = params.get('detail');
    if (fullname || username || detail) {
      setGuestInfo(prev => ({
        ...prev,
        name: fullname || prev.name,
        email: username && username.includes('@') ? username : prev.email,
        phone: username && !username.includes('@') ? username : prev.phone,
        notes: detail || prev.notes
      }));
    }

    navigator.geolocation?.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }), 
      () => setUserLocation({ lat: 27.7172, lng: 85.3240 }) // fallback to KTM
    );
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      branchAPI.getPublicByOrg(selectedOrg._id).then(r => {
        let brs = r.data.branches;
        if (userLocation) {
          brs = brs.map((b: any) => {
            const R = 6371;
            const dLat = (b.location.coordinates[1] - userLocation.lat) * Math.PI / 180;
            const dLon = (b.location.coordinates[0] - userLocation.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(userLocation.lat*Math.PI/180)*Math.cos(b.location.coordinates[1]*Math.PI/180)*Math.sin(dLon/2)**2;
            return { ...b, distance: R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) };
          }).sort((a: any, b: any) => (a.distance||999) - (b.distance||999));
        }
        setBranches(brs);

        // Auto-booking handling
        const serviceCode = params.get('serviceCode') || params.get('serviceTypeCode');
        const offcode = params.get('offcode') || params.get('offCode');
        const nearestOffc = params.get('nearestOffc') === 'true';

        if (!selectedBranch && brs.length > 0) {
          if (offcode) {
            const targetBranch = brs.find((b: any) => b.code === offcode || b.slug === offcode || b._id === offcode);
            if (targetBranch) {
              setSelectedBranch(targetBranch);
            } else if (nearestOffc) {
              setSelectedBranch(brs[0]);
            } else if (serviceCode) {
              setSelectedBranch(brs[0]);
            }
          } else if (nearestOffc || serviceCode) {
            setSelectedBranch(brs[0]);
          }
        }
      });
    }
  }, [selectedOrg, userLocation]);

  useEffect(() => {
    if (selectedOrg && selectedBranch && !selectedType) {
      apptTypeAPI.getPublicByOrg(selectedOrg._id, { branch: selectedBranch._id }).then(r => {
        setTypes(r.data.appointmentTypes);
        const serviceCode = params.get('serviceCode') || params.get('serviceTypeCode');
        if (serviceCode) {
          const targetType = r.data.appointmentTypes.find((t: any) => t.slug === serviceCode || t._id === serviceCode);
          if (targetType) {
            setSelectedType(targetType);
            setStep(3);
          } else {
            setStep(2);
          }
        } else {
          // Move to step 2 if branch was auto-selected via params and no service provided
          const offcode = params.get('offcode') || params.get('offCode');
          const nearestOffc = params.get('nearestOffc') === 'true';
          const preOrg = params.get('org') || params.get('orgCode');
          if (preOrg && (offcode || nearestOffc)) {
            setStep(2);
          }
        }
      });
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranch && selectedType && selectedDate) {
      setLoading(true);
      appointmentAPI.getSlots({ branchId: selectedBranch._id, appointmentTypeId: selectedType._id, date: selectedDate })
        .then(r => setSlots(r.data.slots)).catch(() => setSlots([])).finally(() => setLoading(false));
    }
  }, [selectedDate]);

  // Filtered lists with search
  const filteredOrgs = useMemo(() => {
    if (!orgSearch.trim()) return orgs;
    const q = orgSearch.toLowerCase();
    return orgs.filter(o => o.name.toLowerCase().includes(q) || o.nameNp?.includes(q) || o.description?.toLowerCase().includes(q) || o.category?.toLowerCase().includes(q));
  }, [orgs, orgSearch]);

  const filteredBranches = useMemo(() => {
    if (!branchSearch.trim()) return branches;
    const q = branchSearch.toLowerCase();
    return branches.filter(b => b.name.toLowerCase().includes(q) || b.nameNp?.includes(q) || b.address?.toLowerCase().includes(q) || b.addressNp?.includes(q) || b.city?.toLowerCase().includes(q) || b.code?.toLowerCase().includes(q));
  }, [branches, branchSearch]);

  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Validate required custom fields before booking
  const validateRequiredFields = (): boolean => {
    const errors: string[] = [];
    if (!isAuthenticated) {
      if (!guestInfo.name.trim()) errors.push(`${t('common.fullName')} ${t('common.required')}`);
      if (!guestInfo.email.trim() && !guestInfo.phone.trim()) errors.push(`${t('common.email')} or ${t('common.phone')} ${t('common.required')}`);
    }
    if (selectedType?.customFields?.length > 0) {
      for (const f of selectedType.customFields) {
        if (f.required && !customFields[f.name]?.trim()) {
          errors.push(`${f.label} ${t('common.required')}`);
        }
      }
    }
    setValidationErrors(errors);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return false;
    }
    return true;
  };

  const handleBook = async () => {
    if (!validateRequiredFields()) return;
    setLoading(true);
    try {
      const payload: any = {
        organization: selectedOrg._id, branch: selectedBranch._id,
        appointmentType: selectedType._id, date: selectedDate,
        startTime: selectedSlot.startTime, endTime: selectedSlot.endTime, notes: guestInfo.notes,
      };
      
      const extSubNo = params.get('submissionNo');
      const srcSys = params.get('sourceSystem') || params.get('source');
      if (extSubNo) payload.externalSubmissionNo = extSubNo;
      if (srcSys) payload.sourceSystem = srcSys;

      if (Object.keys(customFields).length > 0) payload.customFieldValues = customFields;
      if (!isAuthenticated) {
        payload.guestName = guestInfo.name;
        payload.guestEmail = guestInfo.email;
        payload.guestPhone = guestInfo.phone;
      } else {
        payload.guestName = user?.name || 'User';
        payload.guestEmail = user?.email || undefined;
        payload.guestPhone = user?.phone || undefined;
      }
      const { data } = await appointmentAPI.book(payload);
      setBooking(data.appointment);
      setStep(5);
      toast.success(t('booking.confirmed'));
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 429) toast.error(t('error.rateLimited'));
      else toast.error(msg || t('error.generic'));
    } finally { setLoading(false); }
  };

  const handleDownloadPDF = async () => {
    try { const { data } = await appointmentAPI.downloadPDFByRef(booking.refCode); downloadBlob(data, `appointment-${booking.refCode}.pdf`); }
    catch { toast.error('PDF download failed'); }
  };

  const categoryIcons: Record<string,string> = { government:'🏛️', healthcare:'🏥', education:'🎓', finance:'🏦', salon:'💇', legal:'⚖️', other:'🏢' };

  return (
    <div className="min-h-[80vh] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8" role="navigation" aria-label="Booking progress">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i < step ? 'bg-primary-600 text-white' : i === step ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`hidden sm:block w-8 md:w-16 h-0.5 mx-1 ${i < step ? 'bg-primary-600' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center font-medium">{steps[step]}</p>
        </div>

        {/* Step 0: Organization with search */}
        {step === 0 && (
          <div className="animate-fade-in space-y-3">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-2">{t('booking.selectOrg')}</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={orgSearch} onChange={e => setOrgSearch(e.target.value)}
                className="input-field pl-10" placeholder={t('booking.searchOrg')} />
            </div>
            {filteredOrgs.length === 0 ? <p className="text-slate-400 text-center py-8">{t('common.noData')}</p> :
            filteredOrgs.map(org => (
              <button key={org._id} onClick={() => { setSelectedOrg(org); setStep(1); setOrgSearch(''); }}
                className="w-full card p-5 text-left hover:border-primary-300 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: org.branding?.primaryColor+'15' }}>
                    {categoryIcons[org.category] || '🏢'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600">
                      {lang === 'ne' && org.nameNp ? org.nameNp : org.name}
                    </h3>
                    <p className="text-sm text-slate-500 truncate">{org.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Branch with search */}
        {step === 1 && (
          <div className="animate-fade-in space-y-3">
            <button onClick={() => { setStep(0); setBranchSearch(''); }} className="btn-ghost btn-sm mb-2"><ArrowLeft className="w-4 h-4" />{t('booking.back')}</button>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t('booking.selectBranch')} — {lang === 'ne' && selectedOrg?.nameNp ? selectedOrg.nameNp : selectedOrg?.name}
            </h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={branchSearch} onChange={e => setBranchSearch(e.target.value)}
                className="input-field pl-10" placeholder={t('booking.searchBranch')} />
            </div>
            {filteredBranches.length === 0 ? <p className="text-slate-400 text-center py-8">{t('common.noData')}</p> :
            filteredBranches.map(b => (
              <button key={b._id} onClick={() => { setSelectedBranch(b); setStep(2); setBranchSearch(''); }}
                className="w-full card p-5 text-left hover:border-primary-300 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0"><GitBranch className="w-5 h-5 text-slate-500" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600">
                      {lang === 'ne' && b.nameNp ? b.nameNp : b.name} <span className="text-xs text-slate-400 font-normal">({b.code})</span>
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{lang === 'ne' && b.addressNp ? b.addressNp : b.address}</p>
                    {b.distance != null && <span className="text-xs text-primary-600 font-medium mt-1 inline-block">{b.distance.toFixed(1)} {t('booking.kmAway')}</span>}
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Service */}
        {step === 2 && (
          <div className="animate-fade-in space-y-3">
            <button onClick={() => setStep(1)} className="btn-ghost btn-sm mb-2"><ArrowLeft className="w-4 h-4" />{t('booking.back')}</button>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">{t('booking.selectService')}</h2>
            {types.map(tt => (
              <button key={tt._id} onClick={() => { if (!tt.isSuspended) { setSelectedType(tt); setStep(3); }}}
                disabled={tt.isSuspended}
                className={`w-full card p-5 text-left transition-all group ${tt.isSuspended ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-300 hover:shadow-md'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tt.color+'20' }}>
                    <CalendarClock className="w-5 h-5" style={{ color: tt.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600">
                      {lang === 'ne' && tt.nameNp ? tt.nameNp : tt.name}
                      {tt.isSuspended && <span className="ml-2 badge-danger text-[10px]">{t('booking.suspended')}</span>}
                    </h3>
                    {tt.roomNo && <p className="text-xs font-medium text-emerald-600 mt-0.5">{lang === 'ne' && tt.roomNoNp ? tt.roomNoNp : tt.roomNo}</p>}
                    {tt.description && <p className="text-sm text-slate-500 mt-0.5">{tt.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{tt.duration} {t('common.min')}</span>
                      {tt.price > 0 && <span className="font-medium text-slate-700 dark:text-slate-300">NPR {tt.price}</span>}
                      <span className="badge-info text-[10px]">{tt.mode === 'both' ? 'In-person / Virtual' : tt.mode.replace('_','-')}</span>
                    </div>
                  </div>
                  {!tt.isSuspended && <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary-500" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 3 && (
          <div className="animate-fade-in">
            <button onClick={() => setStep(2)} className="btn-ghost btn-sm mb-4"><ArrowLeft className="w-4 h-4" />{t('booking.back')}</button>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">{t('booking.pickDateTime')}</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('booking.selectDate')}</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {generateDates().map(d => {
                  const dt = new Date(d+'T00:00:00');
                  return (
                    <button key={d} onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                      className={`flex-shrink-0 w-20 py-3 rounded-xl text-center transition-all border-2 ${selectedDate === d ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">{dt.toLocaleDateString('en-US',{weekday:'short'})}</div>
                      <div className="text-xl font-bold">{dt.getDate()}</div>
                      <div className="text-[10px] text-slate-500">{dt.toLocaleDateString('en-US',{month:'short'})}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            {selectedDate && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('booking.availableSlots')}</label>
                {loading ? <div className="text-center py-8 text-slate-400">{t('booking.loading')}</div> :
                slots.length === 0 ? <div className="text-center py-8 text-slate-400">{t('booking.noSlots')}</div> : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {slots.map(s => (
                      <button key={s.startTime} disabled={!s.available} onClick={() => setSelectedSlot(s)}
                        className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all ${!s.available ? 'slot-unavailable' : selectedSlot?.startTime === s.startTime ? 'slot-selected' : 'slot-available'}`}>
                        {formatTime(s.startTime)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedSlot && <button onClick={() => setStep(4)} className="btn-primary w-full mt-6">{t('booking.continue')} <ArrowRight className="w-4 h-4" /></button>}
          </div>
        )}

        {/* Step 4: Details with validated custom fields */}
        {step === 4 && (
          <div className="animate-fade-in">
            <button onClick={() => setStep(3)} className="btn-ghost btn-sm mb-4"><ArrowLeft className="w-4 h-4" />{t('booking.back')}</button>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">{t('booking.confirmDetails')}</h2>

            {/* Summary card */}
            <div className="card p-5 mb-6 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">{t('common.organization')}</span><p className="font-medium">{lang === 'ne' && selectedOrg?.nameNp ? selectedOrg.nameNp : selectedOrg?.name}</p></div>
                <div><span className="text-slate-500">{t('common.branch')}</span><p className="font-medium">{lang === 'ne' && selectedBranch?.nameNp ? selectedBranch.nameNp : selectedBranch?.name}</p></div>
                <div><span className="text-slate-500">{t('common.service')}</span><p className="font-medium">{lang === 'ne' && selectedType?.nameNp ? selectedType.nameNp : selectedType?.name}</p></div>
                <div><span className="text-slate-500">{t('common.duration')}</span><p className="font-medium">{selectedType?.duration} {t('common.minutes')}</p></div>
                <div><span className="text-slate-500">{t('common.date')}</span><p className="font-medium">{formatDate(selectedDate, {weekday:'long',year:'numeric',month:'long',day:'numeric'}, lang)}</p></div>
                <div><span className="text-slate-500">{t('common.time')}</span><p className="font-medium">{formatTime(selectedSlot.startTime, lang)} – {formatTime(selectedSlot.endTime, lang)}</p></div>
                {selectedType?.price > 0 && <div><span className="text-slate-500">{t('common.price')}</span><p className="font-medium text-primary-600">NPR {selectedType.price}</p></div>}
              </div>
            </div>

            {/* Guest info */}
            {!isAuthenticated && (
              <div className="card p-5 mb-6 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t('booking.yourInfo')}</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('common.fullName')} <span className="text-red-500">*</span></label>
                  <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={guestInfo.name} onChange={e => setGuestInfo({...guestInfo, name: e.target.value})}
                    className={`input-field pl-10 ${validationErrors.some(e => e.includes(t('common.fullName'))) ? 'border-red-400 ring-red-100' : ''}`}
                    placeholder="Enter your full name" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('common.email')} <span className="text-red-500">*</span></label>
                  <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" value={guestInfo.email} onChange={e => setGuestInfo({...guestInfo, email: e.target.value})}
                    className="input-field pl-10" placeholder="your@email.com" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('common.phone')} ({t('common.optional')})</label>
                  <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={guestInfo.phone} onChange={e => setGuestInfo({...guestInfo, phone: e.target.value})}
                    className="input-field pl-10" placeholder="+977 98XXXXXXXX" /></div>
                </div>
              </div>
            )}

            {/* Custom fields with proper required validation */}
            {selectedType?.customFields?.length > 0 && (
              <div className="card p-5 mb-6 space-y-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">{t('booking.additionalInfo')}</h3>
                {selectedType.customFields.map((f: any) => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      {f.label} {f.required && <span className="text-red-500">*</span>}
                    </label>
                    {f.type === 'select' ? (
                      <select value={customFields[f.name] || ''} onChange={e => setCustomFields({...customFields, [f.name]: e.target.value})}
                        className={`input-field ${f.required && validationErrors.some(e => e.includes(f.label)) ? 'border-red-400 ring-red-100' : ''}`}>
                        <option value="">{t('common.select')}</option>
                        {f.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea value={customFields[f.name] || ''} onChange={e => setCustomFields({...customFields, [f.name]: e.target.value})}
                        className={`input-field ${f.required && validationErrors.some(e => e.includes(f.label)) ? 'border-red-400 ring-red-100' : ''}`}
                        rows={3} placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`} />
                    ) : (
                      <input type={f.type} value={customFields[f.name] || ''} onChange={e => setCustomFields({...customFields, [f.name]: e.target.value})}
                        className={`input-field ${f.required && validationErrors.some(e => e.includes(f.label)) ? 'border-red-400 ring-red-100' : ''}`}
                        placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}...`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Validation errors display */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-red-700">
                    {validationErrors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                </div>
              </div>
            )}

            <div className="card p-5 mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('common.notes')} ({t('common.optional')})</label>
              <textarea value={guestInfo.notes} onChange={e => setGuestInfo({...guestInfo, notes: e.target.value})}
                className="input-field" rows={2} placeholder={t('common.notesPlaceholder')} />
            </div>

            <button onClick={handleBook} disabled={loading} className="btn-primary w-full btn-lg">
              {loading ? t('common.loading') : t('booking.confirmBooking')} {!loading && <CheckCircle2 className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Step 5: Confirmation with contact links */}
        {step === 5 && booking && (
          <div className="animate-slide-up text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('booking.confirmed')}</h2>
            <p className="text-slate-500 mb-6">{t('booking.confirmedDesc')}</p>

            <div className="card p-6 text-left mb-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">{t('common.reference')}</p>
                  <p className="text-2xl font-bold text-primary-600 font-mono">{booking.refCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">{t('common.token')}</p>
                  <p className="text-3xl font-extrabold text-amber-600">#{booking.tokenNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">{t('common.service')}</span><p className="font-medium">{lang === 'ne' && (booking.appointmentType as any)?.nameNp ? (booking.appointmentType as any).nameNp : (booking.appointmentType as any)?.name}</p></div>
                {booking.roomNo && <div><span className="text-slate-500">{t('booking.roomSection')}</span><p className="font-medium text-emerald-600">{lang === 'ne' && booking.roomNoNp ? booking.roomNoNp : booking.roomNo}</p></div>}
                <div><span className="text-slate-500">{t('common.branch')}</span><p className="font-medium">{lang === 'ne' && (booking.branch as any)?.nameNp ? (booking.branch as any).nameNp : (booking.branch as any)?.name}</p></div>
                <div><span className="text-slate-500">{t('common.date')}</span><p className="font-medium">{formatDate(booking.date,{weekday:'long',month:'long',day:'numeric'}, lang)}</p></div>
                <div><span className="text-slate-500">{t('common.time')}</span><p className="font-medium">{formatTime(booking.startTime, lang)} – {formatTime(booking.endTime, lang)}</p></div>
                <div><span className="text-slate-500">{t('common.status')}</span><p className="badge-success inline-block mt-1 capitalize">{booking.status}</p></div>
              </div>

              {/* Contact & Location section */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">{t('booking.contactLocation')}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedBranch?.location?.coordinates && (
                    <a href={`https://www.google.com/maps?q=${selectedBranch.location.coordinates[1]},${selectedBranch.location.coordinates[0]}`}
                      target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 bg-primary-50 px-3 py-2 rounded-full hover:bg-primary-100">
                      <Navigation className="w-3.5 h-3.5" />{t('booking.openMap')}
                    </a>
                  )}
                  {(selectedBranch?.phone || selectedOrg?.phone) && (
                    <a href={`tel:${selectedBranch?.phone||selectedOrg?.phone}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-2 rounded-full hover:bg-emerald-100">
                      <Phone className="w-3.5 h-3.5" />{t('common.callNow')} {selectedBranch?.phone||selectedOrg?.phone}
                    </a>
                  )}
                  {(selectedBranch?.email || selectedOrg?.email) && (
                    <a href={`mailto:${selectedBranch?.email||selectedOrg?.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-full hover:bg-blue-100">
                      <Mail className="w-3.5 h-3.5" />{t('common.sendEmail')}
                    </a>
                  )}
                </div>
                {selectedBranch?.address && <p className="text-xs text-slate-500 mt-2">{selectedBranch.address}</p>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleDownloadPDF} className="btn-primary flex-1"><Download className="w-4 h-4" />{t('booking.downloadPDF')}</button>
              <button onClick={() => nav(`/appointments/${booking.refCode}`)} className="btn-secondary flex-1"><FileText className="w-4 h-4" />{t('booking.viewDetails')}</button>
            </div>
            <button onClick={() => nav('/')} className="btn-ghost w-full mt-3">{t('booking.backToHome')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
