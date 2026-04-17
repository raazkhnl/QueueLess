import { useState, useEffect } from 'react';
import { X, ArrowRight, Building2, GitBranch, CalendarClock, Users, CheckCircle2, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const steps = [
  { icon: Building2, title: 'Create Organization', desc: 'Set up your organization with branding and settings', link: '/admin/organizations', key: 'org' },
  { icon: GitBranch, title: 'Add Branches', desc: 'Configure branch locations, working hours, and holidays', link: '/admin/branches', key: 'branch' },
  { icon: CalendarClock, title: 'Define Services', desc: 'Create appointment types with duration, pricing, and custom fields', link: '/admin/appointment-types', key: 'service' },
  { icon: Users, title: 'Invite Staff', desc: 'Add branch managers and staff members', link: '/admin/users', key: 'staff' },
];

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuthStore();
  const nav = useNavigate();

  useEffect(() => {
    if (!user || !['super_admin', 'org_admin'].includes(user.role)) return;
    const seen = localStorage.getItem('ql_onboarding_done');
    if (!seen) setShow(true);
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem('ql_onboarding_done', 'true');
    setDismissed(true);
    setTimeout(() => setShow(false), 300);
  };

  if (!show) return null;

  return (
    <div className={`card p-6 mb-6 border-primary-200 dark:border-primary-800 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 transition-all ${dismissed ? 'opacity-0 scale-95' : 'animate-fade-in'}`}
      role="region" aria-label="Getting started guide">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900 dark:text-white">Welcome to QueueLess!</h3>
            <p className="text-sm text-slate-500">Complete these steps to get started</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1.5 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800" aria-label="Dismiss onboarding">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step, i) => (
          <button key={step.key} onClick={() => nav(step.link)}
            className="text-left p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 flex items-center justify-center text-xs font-bold">{i+1}</div>
              <step.icon className="w-4 h-4 text-slate-400 group-hover:text-primary-600" />
            </div>
            <p className="font-medium text-sm text-slate-900 dark:text-white">{step.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
