import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatDate(date: string | Date, opts?: Intl.DateTimeFormatOptions, locale = 'en-US') {
  return new Date(date).toLocaleDateString(locale === 'ne' ? 'ne-NP' : 'en-US', opts || { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatTime(time: string, locale = 'en-US') {
  const [h, m] = time.split(':').map(Number);
  if (locale === 'ne') {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; // Keep 24h for Nepali as AM/PM in Nepali is complex
  }
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  window.URL.revokeObjectURL(url); document.body.removeChild(a);
}

export const statusColors: Record<string, string> = {
  pending: 'badge-warning', confirmed: 'badge-info', checked_in: 'badge-info',
  in_progress: 'badge-info', completed: 'badge-success',
  cancelled: 'badge-danger', no_show: 'badge-danger', rescheduled: 'badge-neutral',
};

export const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin', org_admin: 'Org Admin',
  branch_manager: 'Branch Manager', staff: 'Staff', citizen: 'Citizen',
};
