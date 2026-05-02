import { describe, it, expect } from 'vitest';
import { adToBs, bsToAd, formatBs, formatDual, toNepaliDigits } from './nepaliDate';

describe('frontend nepaliDate', () => {
  it('converts AD → BS for the canonical reference date', () => {
    expect(adToBs(new Date('2023-04-14T00:00:00Z'))).toEqual({ year: 2080, month: 1, day: 1 });
  });

  it('round-trips BS → AD → BS', () => {
    const ad = bsToAd({ year: 2083, month: 1, day: 18 });
    expect(adToBs(ad)).toEqual({ year: 2083, month: 1, day: 18 });
  });

  it('formats short and long', () => {
    const d = new Date('2026-05-02T00:00:00Z');
    expect(formatBs(d, { mode: 'short' })).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatBs(d, { mode: 'long' })).toMatch(/Baishakh|Jestha|Ashadh|Shrawan|Bhadra|Ashwin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra/);
  });

  it('renders Nepali digits and combined dual format', () => {
    expect(toNepaliDigits(2083)).toBe('२०८३');
    const dual = formatDual(new Date('2026-05-02T00:00:00Z'));
    expect(dual).toMatch(/BS /);
  });
});
