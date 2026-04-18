export interface User {
  _id: string; name: string; email?: string; phone?: string;
  role: 'super_admin' | 'org_admin' | 'branch_manager' | 'staff' | 'citizen';
  organization?: Organization | string; branch?: Branch | string;
  specializations?: string[]; expertise?: string; bio?: string;
  maxDailyAppointments?: number;
  isActive: boolean; isEmailVerified: boolean; isPhoneVerified: boolean;
  avatar?: string; lastLogin?: string; createdAt: string; updatedAt: string;
}

export interface Organization {
  _id: string; name: string; nameNp?: string; slug: string; description?: string; logo?: string;
  website?: string; email?: string; phone?: string; address?: string; addressNp?: string;
  category: string; branding: { primaryColor: string; secondaryColor: string; accentColor: string; fontFamily: string; };
  settings: {
    allowGuestBooking: boolean; requireApproval: boolean;
    maxAdvanceBookingDays: number; minAdvanceBookingHours: number;
    cancellationPolicyHours: number; timezone: string; currency: string;
    smsEnabled: boolean; emailEnabled: boolean; reminderHoursBefore: number;
  };
  isActive: boolean; createdAt: string; updatedAt: string;
}

export interface WorkingHours {
  day: number; isOpen: boolean; openTime: string; closeTime: string;
  breakStart?: string; breakEnd?: string;
}

export interface Holiday { date: string; name: string; isRecurring: boolean; }

export interface DateOverride {
  date: string; isOpen: boolean; openTime?: string; closeTime?: string; reason?: string;
}

export interface Branch {
  _id: string; organization: Organization | string; name: string; nameNp?: string;
  code: string; description?: string; address: string; addressNp?: string;
  province?: string; district?: string; city?: string;
  location: { type: string; coordinates: [number, number]; };
  phone?: string; email?: string; workingHours: WorkingHours[];
  holidays: Holiday[]; dateOverrides?: DateOverride[];
  maxConcurrentBookings: number;
  isActive: boolean; managers: string[]; distance?: number;
  createdAt: string; updatedAt: string;
}

export interface CustomField {
  _id?: string; name: string; label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'select' | 'textarea' | 'date' | 'file';
  required: boolean; options?: string[]; placeholder?: string;
}

export interface AppointmentType {
  _id: string; organization: string; branches: Branch[] | string[];
  name: string; nameNp?: string; slug?: string; description?: string;
  duration: number; bufferTime: number; price: number;
  mode: 'in_person' | 'virtual' | 'both'; color: string; icon: string;
  customFields: CustomField[]; maxBookingsPerSlot: number;
  requiresApproval: boolean; isActive: boolean; isSuspended?: boolean;
  suspendReason?: string; sortOrder: number;
  roomNo?: string; roomNoNp?: string;
  useCustomHours?: boolean; customHours?: WorkingHours[];
  createdAt: string; updatedAt: string;
}

export interface Appointment {
  _id: string; refCode: string;
  organization: Organization | string; branch: Branch | string;
  appointmentType: AppointmentType | string;
  citizen?: User | string; guestName?: string; guestEmail?: string; guestPhone?: string;
  date: string; startTime: string; endTime: string; duration: number;
  assignedStaff?: User | string;
  status: 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  mode: 'in_person' | 'virtual'; meetingLink?: string;
  customFieldValues?: Record<string, any>;
  price: number; isPaid: boolean; tokenNumber: number; queuePosition?: number;
  notes?: string; internalNotes?: string; cancellationReason?: string;
  bookedBy?: User | string;
  isGuest: boolean; reminderSent: boolean;
  roomNoNp?: string;
  externalSubmissionNo?: string; sourceSystem?: string;
  checkedInAt?: string; completedAt?: string; cancelledAt?: string;
  createdAt: string; updatedAt: string;
}

export interface Slot {
  startTime: string; endTime: string; available: boolean;
  bookedCount: number; maxBookings: number; isPast: boolean;
}

export interface DashboardStats {
  totalBookings: number; todayBookings: number; monthBookings: number; pendingBookings: number;
  totalOrgs: number; totalBranches: number; totalUsers: number;
  statusBreakdown: Record<string, number>;
  dailyTrend: { _id: string; count: number; }[];
  branchStats: { branchName: string; count: number; }[];
}

export interface Feedback {
  _id: string;
  appointment: Appointment | string;
  organization: Organization | string;
  branch: Branch | string;
  citizen?: User | string;
  guestEmail?: string;
  rating: number;
  comment?: string;
  staffRating?: number;
  waitTimeRating?: number;
  serviceRating?: number;
  isPublic: boolean;
  adminReply?: string;
  adminRepliedAt?: string;
  adminRepliedBy?: User | string;
  createdAt: string; updatedAt: string;
}

export interface Webhook {
  _id: string;
  organization: Organization | string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  lastTriggered?: string;
  lastStatus?: number;
  failCount: number;
  maxRetries: number;
  headers?: Record<string, string>;
  createdAt: string; updatedAt: string;
}

export interface WebhookLog {
  _id: string;
  webhook: Webhook | string;
  event: string;
  url: string;
  requestBody?: string;
  responseStatus?: number;
  responseBody?: string;
  error?: string;
  duration?: number;
  success: boolean;
  deliveredAt: string;
  createdAt: string;
}

export interface NotificationTemplate {
  _id: string;
  organization: Organization | string;
  type: string;
  channel: 'email' | 'sms';
  subject: string;
  bodyTemplate: string;
  isActive: boolean;
  language: 'en' | 'ne';
  createdAt: string; updatedAt: string;
}

export interface Notification {
  _id: string;
  user?: User | string;
  email?: string;
  phone?: string;
  type: string;
  channel: 'email' | 'sms' | 'push';
  subject?: string;
  message: string;
  data?: any;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
  createdAt: string; updatedAt: string;
}

export interface AuditLog {
  _id: string;
  user: User | string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface StaffAvailability {
  _id: string;
  user: User | string;
  branch: Branch | string;
  weeklySchedule: {
    day: number; isAvailable: boolean;
    startTime: string; endTime: string;
    breakStart?: string; breakEnd?: string;
    maxAppointments: number;
  }[];
  dateOverrides: {
    date: string; isAvailable: boolean;
    startTime?: string; endTime?: string; reason?: string;
  }[];
  recurringBlockouts: {
    day: number; startTime: string; endTime: string; reason?: string;
  }[];
  createdAt: string; updatedAt: string;
}

export interface Message {
  _id: string;
  appointment: Appointment | string;
  sender?: User | string;
  senderType: 'citizen' | 'staff' | 'admin' | 'system';
  senderName?: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string; updatedAt: string;
}

export interface AppConfig {
  _id: string;
  key: string;
  appName: string;
  tagline: string;
  logo?: string;
  favicon?: string;
  defaultLanguage: 'en' | 'ne';
  supportedLanguages: string[];
  theme: {
    primaryColor: string; secondaryColor: string;
    accentColor: string; darkMode: boolean;
  };
  contact: {
    email?: string; phone?: string; address?: string; website?: string;
  };
  features: {
    guestBooking: boolean; feedbackEnabled: boolean;
    smsEnabled: boolean; multiLanguage: boolean;
  };
  updatedBy?: User | string;
  createdAt: string; updatedAt: string;
}
