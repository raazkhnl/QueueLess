import { describe, it, expect, beforeEach } from 'vitest';
import { useI18n } from './i18n';

describe('i18n.t — issue/status/history coverage', () => {
  beforeEach(() => { useI18n.setState({ lang: 'en' }); localStorage.removeItem('ql_lang'); });

  const STATUSES = ['open','in_progress','forwarded','escalated','awaiting_user','resolved','closed','reopened'];
  const PRIORITIES = ['low','medium','high','critical'];
  const HISTORY = ['created','status_changed','forwarded','assigned','reopened','comment_added','internal_note','attachments_added','linked_to_appointment','escalated'];
  const ISSUE_KEYS = [
    'issue.title','issue.subtitle','issue.cta.raise','issue.cta.viewMine','issue.cta.bookFollowup',
    'issue.field.org','issue.field.branch','issue.field.category','issue.field.subject','issue.field.description','issue.field.priority',
    'issue.action.submit','issue.action.submitAndBook','issue.action.reply','issue.action.reopen',
    'issue.thread.title','issue.thread.empty','issue.history.title','issue.tracking.id',
    'issue.list.title','issue.list.empty','issue.list.filter.all','issue.list.filter.open','issue.list.filter.closed',
    'hybrid.bookingForTicket','hybrid.linkedAppointmentTitle','hybrid.linkedTicketTitle','hybrid.viewAppointment','hybrid.viewTicket',
  ];

  it('every issue status has both EN and NE translations', () => {
    const t = useI18n.getState().t;
    for (const s of STATUSES) {
      const en = t(`status.${s}`);
      expect(en).not.toBe(`status.${s}`);            // not the raw key
      expect(en.length).toBeGreaterThan(0);
    }
    useI18n.setState({ lang: 'ne' });
    const tn = useI18n.getState().t;
    for (const s of STATUSES) {
      const ne = tn(`status.${s}`);
      expect(ne).not.toBe(`status.${s}`);
      // NE should differ from EN for at least one CJK or Devanagari character
      // (we don't assert per-key but at least one of them must contain a Devanagari letter).
    }
    useI18n.setState({ lang: 'ne' });
    const containsDevanagari = STATUSES.some((s) => /[ऀ-ॿ]/.test(useI18n.getState().t(`status.${s}`)));
    expect(containsDevanagari).toBe(true);
  });

  it('every priority has translations', () => {
    const t = useI18n.getState().t;
    for (const p of PRIORITIES) {
      expect(t(`priority.${p}`)).not.toBe(`priority.${p}`);
    }
  });

  it('every history action has translations', () => {
    const t = useI18n.getState().t;
    for (const h of HISTORY) {
      expect(t(`history.${h}`)).not.toBe(`history.${h}`);
    }
  });

  it('issue.* and hybrid.* keys all resolve in EN', () => {
    const t = useI18n.getState().t;
    for (const k of ISSUE_KEYS) {
      expect(t(k)).not.toBe(k);
    }
  });

  it('issue.* and hybrid.* keys all resolve in NE (with EN fallback if missing)', () => {
    useI18n.setState({ lang: 'ne' });
    const t = useI18n.getState().t;
    for (const k of ISSUE_KEYS) {
      expect(t(k)).not.toBe(k);
    }
  });

  it('NE translations actually contain Devanagari (not just EN fallbacks)', () => {
    useI18n.setState({ lang: 'ne' });
    const t = useI18n.getState().t;
    const samples = ['issue.title', 'issue.action.submit', 'issue.cta.raise', 'hybrid.bookingForTicket'];
    for (const k of samples) {
      expect(/[ऀ-ॿ]/.test(t(k))).toBe(true);
    }
  });
});
