export interface User {
  _id: string; name: string; email?: string; phone?: string;
  role: 'super_admin' | 'org_admin' | 'branch_manager' | 'staff' | 'citizen';
  organization?: Organization | string; branch?: Branch | string;
  isActive: boolean; isEmailVerified: boolean; isPhoneVerified: boolean;
  avatar?: string; lastLogin?: string; createdAt: string; updatedAt: string;
}

export interface Organization {
  _id: string; name: string; slug: string; description?: string; logo?: string;
  website?: string; email?: string; phone?: string; address?: string;
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

export interface Branch {
  _id: string; organization: Organization | string; name: string; code: string;
  description?: string; address: string; province?: string; district?: string; city?: string;
  location: { type: string; coordinates: [number, number]; };
  phone?: string; email?: string; workingHours: WorkingHours[];
  holidays: Holiday[]; maxConcurrentBookings: number;
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
  name: string; slug?: string; description?: string;
  duration: number; bufferTime: number; price: number;
  mode: 'in_person' | 'virtual' | 'both'; color: string; icon: string;
  customFields: CustomField[]; maxBookingsPerSlot: number;
  requiresApproval: boolean; isActive: boolean; sortOrder: number;
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
  isGuest: boolean; reminderSent: boolean;
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
