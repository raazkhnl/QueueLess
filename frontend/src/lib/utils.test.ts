import { describe, it, expect } from 'vitest';
import { cn, formatTime, statusColors, roleLabels } from './utils';

describe('cn', () => {
  it('merges tailwind classes deterministically', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', 'text-base', false && 'hidden')).toBe('text-base');
  });
});

describe('formatTime', () => {
  it('renders 12-hour time in en locale', () => {
    expect(formatTime('09:30')).toBe('9:30 AM');
    expect(formatTime('15:00')).toBe('3:00 PM');
  });
  it('renders 24-hour time in ne locale', () => {
    expect(formatTime('15:00', 'ne')).toBe('15:00');
  });
});

describe('lookup tables', () => {
  it('roleLabels covers all known roles', () => {
    expect(roleLabels.super_admin).toBeDefined();
    expect(roleLabels.citizen).toBeDefined();
  });
  it('statusColors maps every appointment lifecycle state', () => {
    for (const k of ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']) {
      expect(statusColors[k]).toBeTruthy();
    }
  });
});
