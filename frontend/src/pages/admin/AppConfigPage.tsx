import { useState, useEffect } from 'react';
import { Globe, Save, Palette, ToggleLeft, CreditCard, Bell, Shield } from 'lucide-react';
import { appConfigAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const FEATURE_FLAGS: Array<{ key: string; label: string; help: string }> = [
  { key: 'guestBooking',                label: 'Guest booking',                  help: 'Allow citizens to book without an account' },
  { key: 'feedbackEnabled',             label: 'Feedback system',                help: 'Show post-appointment rating + comment form' },
  { key: 'smsEnabled',                  label: 'SMS notifications',              help: 'Send transactional SMS via configured provider' },
  { key: 'emailEnabled',                label: 'Email notifications',            help: 'Send confirmations and reminders by email' },
  { key: 'multiLanguage',               label: 'Multi-language UI',              help: 'Expose the EN ↔ नेपाली language toggle' },
  { key: 'ticketingEnabled',            label: 'Ticketing / DITMS',              help: 'Enable issue / grievance flow on the public site' },
  { key: 'hybridLinkingEnabled',        label: 'Hybrid linking',                 help: 'Allow tickets to be linked with appointments' },
  { key: 'paymentsEnabled',             label: 'Payments',                       help: 'Show payment options on bookings (eSewa/Khalti/cash)' },
  { key: 'onBehalfBookingEnabled',      label: 'Staff on-behalf booking',        help: 'Counter staff can book on behalf of walk-in citizens' },
  { key: 'nagarikOAuthEnabled',         label: 'Nagarik App login',              help: 'Show "Sign in with Nagarik App" on the login page' },
  { key: 'selfServiceTenantOnboarding', label: 'Self-service org onboarding',    help: 'Allow new orgs to register themselves (super-admin reviews)' },
  { key: 'qrCheckInEnabled',            label: 'QR check-in',                    help: 'Enable the staff QR-scan check-in page' },
  { key: 'rtiPublicDashboard',          label: 'RTI transparency dashboard',     help: 'Expose /transparency to the public' },
  { key: 'bsCalendar',                  label: 'Bikram Sambat (BS) calendar',    help: 'Render BS dates everywhere alongside AD' },
  { key: 'captchaEnabled',              label: 'Anti-spam (honeypot)',           help: 'Run honeypot on public POSTs (recommended)' },
  { key: 'tokenDisplayBoardEnabled',    label: 'Token display board',            help: 'Allow waiting-room screens to load /display/:branch' },
];

export default function AppConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { appConfigAPI.get().then(r => setConfig(r.data.config)).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await appConfigAPI.update(config); toast.success('App config saved'); }
    catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const setFeature = (key: string, val: boolean) =>
    setConfig({ ...config, features: { ...config.features, [key]: val } });

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>;
  if (!config) return <p className="text-slate-400">Failed to load config</p>;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">App Configuration</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save all changes'}</button>
      </div>

      {/* General */}
      <Section icon={Globe} title="General">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="App Name"><input value={config.appName || ''} onChange={e => setConfig({ ...config, appName: e.target.value })} className="input-field" /></Field>
          <Field label="Tagline"><input value={config.tagline || ''} onChange={e => setConfig({ ...config, tagline: e.target.value })} className="input-field" /></Field>
          <Field label="Default Language">
            <select value={config.defaultLanguage} onChange={e => setConfig({ ...config, defaultLanguage: e.target.value })} className="input-field">
              <option value="en">English</option><option value="ne">नेपाली (Nepali)</option>
            </select>
          </Field>
          <Field label="Logo URL"><input value={config.logo || ''} onChange={e => setConfig({ ...config, logo: e.target.value })} className="input-field" placeholder="/uploads/logos/…" /></Field>
        </div>
      </Section>

      {/* Theme */}
      <Section icon={Palette} title="Theme">
        <div className="grid grid-cols-3 gap-4">
          {(['primaryColor','secondaryColor','accentColor'] as const).map((k) => (
            <Field key={k} label={k.replace('Color',' ').replace(/^[a-z]/, c => c.toUpperCase())}>
              <input type="color" value={config.theme?.[k] || '#000000'}
                onChange={e => setConfig({ ...config, theme: { ...config.theme, [k]: e.target.value } })}
                className="w-full h-10 rounded cursor-pointer" />
            </Field>
          ))}
        </div>
      </Section>

      {/* Feature flags */}
      <Section icon={ToggleLeft} title="Feature flags">
        <p className="text-xs text-slate-500 mb-3">Platform-wide toggles. Each tenant can additionally override a subset of these on their own org settings.</p>
        <div className="grid md:grid-cols-2 gap-2">
          {FEATURE_FLAGS.map((f) => (
            <label key={f.key} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
              <input type="checkbox" className="mt-1" checked={!!config.features?.[f.key]} onChange={e => setFeature(f.key, e.target.checked)} />
              <span className="flex-1">
                <span className="block font-medium text-sm text-slate-900 dark:text-white">{f.label}</span>
                <span className="block text-xs text-slate-500">{f.help}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="SMS provider">
            <select value={config.notifications?.smsProvider || 'console'}
              onChange={e => setConfig({ ...config, notifications: { ...config.notifications, smsProvider: e.target.value } })}
              className="input-field">
              <option value="console">Console (dev)</option>
              <option value="sparrow">Sparrow SMS (NP)</option>
              <option value="twilio">Twilio</option>
            </select>
          </Field>
          <Field label="Email From name">
            <input value={config.notifications?.emailFromName || ''}
              onChange={e => setConfig({ ...config, notifications: { ...config.notifications, emailFromName: e.target.value } })}
              className="input-field" />
          </Field>
          <Field label="Reminder hours before">
            <input type="number" min={1} max={72} value={config.notifications?.reminderHoursBefore || 24}
              onChange={e => setConfig({ ...config, notifications: { ...config.notifications, reminderHoursBefore: Number(e.target.value) } })}
              className="input-field" />
          </Field>
        </div>
      </Section>

      {/* Payments */}
      <Section icon={CreditCard} title="Payments">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Default provider">
            <select value={config.payments?.defaultProvider || 'cash'}
              onChange={e => setConfig({ ...config, payments: { ...config.payments, defaultProvider: e.target.value } })}
              className="input-field">
              {['esewa','khalti','imepay','connectips','cash','manual'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Enabled providers (comma-separated)">
            <input value={(config.payments?.enabledProviders || []).join(',')}
              onChange={e => setConfig({ ...config, payments: { ...config.payments, enabledProviders: e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean) } })}
              className="input-field" placeholder="esewa,khalti,cash" />
          </Field>
        </div>
      </Section>

      {/* Data retention */}
      <Section icon={Shield} title="Data retention">
        <div className="grid sm:grid-cols-3 gap-4">
          {(['appointmentDays','issueDays','auditLogDays'] as const).map((k) => (
            <Field key={k} label={k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())}>
              <input type="number" min={30} value={config.dataRetention?.[k] || 0}
                onChange={e => setConfig({ ...config, dataRetention: { ...config.dataRetention, [k]: Number(e.target.value) } })}
                className="input-field" />
            </Field>
          ))}
        </div>
      </Section>

      <div className="sticky bottom-3 pt-3">
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full"><Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save all changes'}</button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: any) {
  return (
    <div className="card p-6 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-white"><Icon className="w-5 h-5 text-slate-400" />{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
    </div>
  );
}
