import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Navbar from './components/layout/Navbar';
import AdminLayout from './components/layout/AdminLayout';

// Lazy-loaded pages for code splitting
const Home = lazy(() => import('./pages/public/Home'));
const Login = lazy(() => import('./pages/public/Login'));
const Register = lazy(() => import('./pages/public/Register'));
const BookingWizard = lazy(() => import('./pages/public/BookingWizard'));
const AppointmentDetail = lazy(() => import('./pages/public/AppointmentDetail'));
const MyAppointments = lazy(() => import('./pages/public/MyAppointments'));
const Profile = lazy(() => import('./pages/public/Profile'));

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Bookings = lazy(() => import('./pages/admin/Bookings'));
const Organizations = lazy(() => import('./pages/admin/Organizations'));
const Branches = lazy(() => import('./pages/admin/Branches'));
const AppointmentTypes = lazy(() => import('./pages/admin/AppointmentTypes'));
const Users = lazy(() => import('./pages/admin/Users'));
const BulkUpload = lazy(() => import('./pages/admin/BulkUpload'));
const CalendarView = lazy(() => import('./pages/admin/CalendarView'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const FeedbackPage = lazy(() => import('./pages/admin/Feedback'));
const Webhooks = lazy(() => import('./pages/admin/Webhooks'));
const NotificationTemplates = lazy(() => import('./pages/admin/NotificationTemplates'));
const AppConfigPage = lazy(() => import('./pages/admin/AppConfigPage'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const StaffScheduling = lazy(() => import('./pages/admin/StaffScheduling'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" role="status" aria-label="Loading page">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    </div>
  );
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" role="main">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </main>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
          <Route path="/login" element={<PublicLayout><Login /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><Register /></PublicLayout>} />
          <Route path="/book" element={<PublicLayout><BookingWizard /></PublicLayout>} />
          <Route path="/appointments/:refCode" element={<PublicLayout><AppointmentDetail /></PublicLayout>} />
          <Route path="/my-appointments" element={<PublicLayout><MyAppointments /></PublicLayout>} />
          <Route path="/profile" element={<PublicLayout><Profile /></PublicLayout>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="organizations" element={<Suspense fallback={<PageLoader />}><Organizations /></Suspense>} />
            <Route path="branches" element={<Suspense fallback={<PageLoader />}><Branches /></Suspense>} />
            <Route path="appointment-types" element={<Suspense fallback={<PageLoader />}><AppointmentTypes /></Suspense>} />
            <Route path="bookings" element={<Suspense fallback={<PageLoader />}><Bookings /></Suspense>} />
            <Route path="calendar" element={<Suspense fallback={<PageLoader />}><CalendarView /></Suspense>} />
            <Route path="reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<PageLoader />}><Users /></Suspense>} />
            <Route path="staff-scheduling" element={<Suspense fallback={<PageLoader />}><StaffScheduling /></Suspense>} />
            <Route path="feedback" element={<Suspense fallback={<PageLoader />}><FeedbackPage /></Suspense>} />
            <Route path="bulk-upload" element={<Suspense fallback={<PageLoader />}><BulkUpload /></Suspense>} />
            <Route path="webhooks" element={<Suspense fallback={<PageLoader />}><Webhooks /></Suspense>} />
            <Route path="notification-templates" element={<Suspense fallback={<PageLoader />}><NotificationTemplates /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            <Route path="app-config" element={<Suspense fallback={<PageLoader />}><AppConfigPage /></Suspense>} />
            <Route path="audit-logs" element={<Suspense fallback={<PageLoader />}><AuditLogs /></Suspense>} />
          </Route>

          {/* 404 */}
          <Route path="*" element={
            <PublicLayout>
              <div className="text-center py-20" role="alert">
                <h1 className="font-display text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
                <p className="text-slate-500">Page not found</p>
              </div>
            </PublicLayout>
          } />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
