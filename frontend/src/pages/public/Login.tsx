import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Mail, Lock, Phone, ArrowRight } from 'lucide-react';
import { authAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { useI18n } from '../../lib/i18n';

export default function Login() {
  const [mode, setMode] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const nav = useNavigate();
  const { t } = useI18n();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      setAuth(data.user, data.token);
      toast.success('Welcome back!');
      const role = data.user.role;
      if (['super_admin','org_admin','branch_manager','staff'].includes(role)) nav('/admin');
      else nav('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRequestOTP = async () => {
    setLoading(true);
    try {
      const payload = email ? { email } : { phone };
      const { data } = await authAPI.requestOTP(payload);
      setOtpSent(true);
      toast.success('OTP sent!');
      if (data.otp) toast(`Dev OTP: ${data.otp}`, { icon: '🔑', duration: 10000 });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = email ? { email, otp } : { phone, otp };
      const { data } = await authAPI.verifyOTP(payload);
      setAuth(data.user, data.token);
      toast.success('Welcome!');
      nav('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-600/25">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-1">{t('login.title')}</h1>
          <p className="text-slate-500 text-sm">{t('login.subtitle')}</p>
        </div>

        <div className="card p-6">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-6">
            <button onClick={() => { setMode('email'); setOtpSent(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'email' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>
              Email & Password
            </button>
            <button onClick={() => { setMode('otp'); setOtpSent(false); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'otp' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}>
              OTP Login
            </button>
          </div>

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="input-field pl-10" placeholder="you@example.com" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="input-field pl-10" placeholder="••••••••" required />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Signing in...' : 'Sign In'} {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email or Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={email || phone} onChange={e => {
                    const v = e.target.value;
                    if (v.includes('@')) { setEmail(v); setPhone(''); } else { setPhone(v); setEmail(''); }
                  }} className="input-field pl-10" placeholder="email or phone number" required />
                </div>
              </div>
              {otpSent ? (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Enter OTP</label>
                    <input value={otp} onChange={e => setOtp(e.target.value)}
                      className="input-field text-center text-2xl tracking-[0.5em] font-mono" maxLength={6} placeholder="000000" required />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </form>
              ) : (
                <button onClick={handleRequestOTP} disabled={loading} className="btn-primary w-full">
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account? <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">Sign up</Link>
        </p>
        <p className="text-center text-sm text-slate-400 mt-2">
          Or <Link to="/book" className="text-primary-600 font-medium hover:text-primary-700">book as guest</Link>
        </p>
      </div>
    </div>
  );
}
