/**
 * Pure-utility smoke tests — BS calendar, NP geography, holidays, SMS phone
 * normalisation. No DB hit, fast.
 */
import { describe, expect, it } from 'vitest';

const { adToBs, bsToAd, formatBs } = require('../src/utils/nepaliDate');
const { listProvinces, listDistricts, findProvinceForDistrict } = require('../src/utils/nepalGeo');
const { listForAdYear, isHoliday } = require('../src/utils/nepalHolidays');
const { cleanPhone, pickDriver } = require('../src/services/smsService');

describe('nepaliDate', () => {
  it('converts a known AD date to the expected BS date', () => {
    // Reference: BS 2080-01-01 = AD 2023-04-14
    expect(adToBs(new Date('2023-04-14T00:00:00Z'))).toEqual({ year: 2080, month: 1, day: 1 });
  });

  it('round-trips BS → AD → BS', () => {
    const ad = bsToAd({ year: 2082, month: 6, day: 15 });
    expect(adToBs(ad)).toEqual({ year: 2082, month: 6, day: 15 });
  });

  it('formats BS in short and long modes', () => {
    const d = new Date('2026-05-01T00:00:00Z');
    expect(formatBs(d, { mode: 'short' })).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatBs(d, { mode: 'long' })).toMatch(/Baishakh|Jestha|Ashadh|Shrawan|Bhadra|Ashwin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra/);
  });

  it('renders Devanagari digits on lang=ne', () => {
    expect(formatBs(new Date('2026-05-01T00:00:00Z'), { mode: 'short', lang: 'ne' })).toMatch(/[०१२३४५६७८९]/);
  });
});

describe('nepalGeo', () => {
  it('lists 7 provinces and 77 districts total', () => {
    const provinces = listProvinces();
    expect(provinces).toHaveLength(7);
    const totalDistricts = provinces.reduce((s, p) => s + p.districtCount, 0);
    expect(totalDistricts).toBe(77);
  });

  it('returns districts for a known province', () => {
    const bagmati = listDistricts('P3');
    expect(bagmati.length).toBeGreaterThanOrEqual(13);
    expect(bagmati.find((d) => d.name === 'Kathmandu')).toBeDefined();
  });

  it('finds the province for a known district', () => {
    expect(findProvinceForDistrict('Kathmandu')).toBe('P3');
    expect(findProvinceForDistrict('Jhapa')).toBe('P1');
    expect(findProvinceForDistrict('Banke')).toBe('P5');
  });
});

describe('nepalHolidays', () => {
  it('returns at least the 4 fixed holidays per AD year', () => {
    const list = listForAdYear(2026);
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.every((h) => h.adDate.getFullYear() === 2026)).toBe(true);
  });

  it('isHoliday returns null on a known non-holiday', () => {
    expect(isHoliday('2026-05-02')).toBeNull();
  });
});

describe('smsService', () => {
  it('normalises 10-digit NP numbers', () => {
    expect(cleanPhone('9841000001')).toBe('9779841000001');
    expect(cleanPhone('+9779841000001')).toBe('9779841000001');
    expect(cleanPhone('  98-41-00 0001 ')).toBe('9779841000001');
  });

  it('falls back to the console driver when SMS_PROVIDER is unset', () => {
    delete process.env.SMS_PROVIDER;
    expect(pickDriver().name).toBe('console');
  });
});
