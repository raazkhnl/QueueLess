import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ql_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((res) => res, (err) => {
  if (err.response?.status === 401) {
    localStorage.removeItem('ql_token'); localStorage.removeItem('ql_user');
    if (!window.location.pathname.includes('/login')) window.location.href = '/login';
  }
  return Promise.reject(err);
});

export const authAPI = {
  register: (d: any) => api.post('/auth/register', d), login: (d: any) => api.post('/auth/login', d),
  requestOTP: (d: any) => api.post('/auth/otp/request', d), verifyOTP: (d: any) => api.post('/auth/otp/verify', d),
  getMe: () => api.get('/auth/me'), updateProfile: (d: any) => api.put('/auth/profile', d),
  changePassword: (d: any) => api.put('/auth/change-password', d),
};
export const orgAPI = {
  getPublic: () => api.get('/organizations/public'), getBySlug: (s: string) => api.get(`/organizations/slug/${s}`),
  getAll: (p?: any) => api.get('/organizations', { params: p }), getById: (id: string) => api.get(`/organizations/${id}`),
  create: (d: any) => api.post('/organizations', d), update: (id: string, d: any) => api.put(`/organizations/${id}`, d),
  remove: (id: string) => api.delete(`/organizations/${id}`),
};
export const branchAPI = {
  getPublicByOrg: (orgId: string) => api.get(`/branches/public/org/${orgId}`),
  findNearest: (p: any) => api.get('/branches/nearest', { params: p }),
  getAll: (p?: any) => api.get('/branches', { params: p }), getById: (id: string) => api.get(`/branches/${id}`),
  create: (d: any) => api.post('/branches', d), update: (id: string, d: any) => api.put(`/branches/${id}`, d),
  remove: (id: string) => api.delete(`/branches/${id}`),
  addHoliday: (id: string, d: any) => api.post(`/branches/${id}/holidays`, d),
  removeHoliday: (id: string, date: string) => api.delete(`/branches/${id}/holidays/${date}`),
  updateWorkingHours: (id: string, d: any) => api.put(`/branches/${id}/working-hours`, d),
};
export const apptTypeAPI = {
  getPublicByOrg: (orgId: string, p?: any) => api.get(`/appointment-types/public/org/${orgId}`, { params: p }),
  getAll: (p?: any) => api.get('/appointment-types', { params: p }), getById: (id: string) => api.get(`/appointment-types/${id}`),
  create: (d: any) => api.post('/appointment-types', d), update: (id: string, d: any) => api.put(`/appointment-types/${id}`, d),
  remove: (id: string) => api.delete(`/appointment-types/${id}`),
};
export const appointmentAPI = {
  getSlots: (p: any) => api.get('/appointments/slots', { params: p }),
  book: (d: any) => api.post('/appointments/book', d),
  getAll: (p?: any) => api.get('/appointments', { params: p }),
  getById: (id: string) => api.get(`/appointments/${id}`),
  getByRefCode: (ref: string) => api.get(`/appointments/ref/${ref}`),
  getMyByContact: (p: any) => api.get('/appointments/my-contact', { params: p }),
  updateStatus: (id: string, d: any) => api.put(`/appointments/${id}/status`, d),
  cancel: (id: string, d?: any) => api.put(`/appointments/${id}/cancel`, d),
  reschedule: (id: string, d: any) => api.put(`/appointments/${id}/reschedule`, d),
  shiftAppointment: (id: string, d: any) => api.put(`/appointments/${id}/shift`, d),
  bulkShift: (d: any) => api.post('/appointments/bulk-shift', d),
  getCalendarEvents: (p?: any) => api.get('/appointments/calendar', { params: p }),
  getAnalytics: () => api.get('/appointments/analytics'),
  downloadPDF: (id: string) => api.get(`/appointments/${id}/pdf`, { responseType: 'blob' }),
  downloadPDFByRef: (ref: string) => api.get(`/appointments/ref/${ref}/pdf`, { responseType: 'blob' }),
  exportICal: (id: string) => api.get(`/appointments/${id}/ical`, { responseType: 'blob' }),
};
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (p?: any) => api.get('/admin/users', { params: p }),
  createUser: (d: any) => api.post('/admin/users', d),
  updateUser: (id: string, d: any) => api.put(`/admin/users/${id}`, d),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  uploadExcel: (fd: FormData) => api.post('/admin/upload-excel', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadSampleExcel: (t: string) => api.get(`/admin/sample-excel/${t}`, { responseType: 'blob' }),
  exportCSV: (p?: any) => api.get('/admin/export-csv', { params: p, responseType: 'blob' }),
};
export const feedbackAPI = {
  create: (d: any) => api.post('/feedback', d),
  getByAppointment: (id: string) => api.get(`/feedback/appointment/${id}`),
  getByOrg: (orgId: string, p?: any) => api.get(`/feedback/org/${orgId}`, { params: p }),
  adminReply: (id: string, d: any) => api.put(`/feedback/${id}/reply`, d),
  remove: (id: string) => api.delete(`/feedback/${id}`),
};
export const appConfigAPI = { get: () => api.get('/app-config'), update: (d: any) => api.put('/app-config', d) };
export const notificationAPI = {
  getAll: (p?: any) => api.get('/notifications', { params: p }),
  getStats: () => api.get('/notifications/stats'),
  sendCustom: (d: any) => api.post('/notifications/send', d),
};
export const notificationTemplateAPI = {
  getAll: (p?: any) => api.get('/notification-templates', { params: p }),
  getDefaults: () => api.get('/notification-templates/defaults'),
  create: (d: any) => api.post('/notification-templates', d),
  update: (id: string, d: any) => api.put(`/notification-templates/${id}`, d),
  remove: (id: string) => api.delete(`/notification-templates/${id}`),
};
export const webhookAPI = {
  getAll: () => api.get('/webhooks'), create: (d: any) => api.post('/webhooks', d),
  update: (id: string, d: any) => api.put(`/webhooks/${id}`, d),
  remove: (id: string) => api.delete(`/webhooks/${id}`),
  test: (id: string) => api.post(`/webhooks/${id}/test`),
};
export const reportsAPI = {
  getAnalytics: (p?: any) => api.get('/reports/analytics', { params: p }),
  exportExcel: (p?: any) => api.get('/reports/export-excel', { params: p, responseType: 'blob' }),
};
export const auditLogAPI = { getAll: (p?: any) => api.get('/audit-logs', { params: p }) };

export const staffAvailabilityAPI = {
  getByStaff: (userId: string) => api.get(`/staff-availability/staff/${userId}`),
  upsert: (userId: string, data: any) => api.put(`/staff-availability/staff/${userId}`, data),
  addOverride: (userId: string, data: any) => api.post(`/staff-availability/staff/${userId}/override`, data),
  removeOverride: (userId: string, date: string) => api.delete(`/staff-availability/staff/${userId}/override/${date}`),
  getByBranch: (branchId: string) => api.get(`/staff-availability/branch/${branchId}`),
};

export const messageAPI = {
  getByAppointment: (aptId: string) => api.get(`/messages/appointment/${aptId}`),
  create: (data: any) => api.post('/messages', data),
  markRead: (aptId: string, data?: any) => api.put(`/messages/read/${aptId}`, data),
};

export default api;
