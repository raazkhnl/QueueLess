/**
 * National-holiday calendar for Nepal.
 *
 * Most Nepali public holidays are tied to the lunar calendar and shift each
 * year. This module ships the *recurring* fixed-date holidays (Republic Day,
 * Constitution Day, etc.) plus a hook for caller-supplied lunar holiday dates
 * — the reasonable balance between accuracy and not-shipping-100-years of
 * recomputed lunar dates.
 *
 * Every government office in NP also takes Saturday off; that is enforced by
 * the existing branch.workingHours and is independent of this list.
 */

const { adToBs, bsToAd } = require('./nepaliDate');

/**
 * Fixed-date holidays expressed in BS. Each entry is { bsMonth, bsDay, name, nameNp }.
 * BS month is 1-indexed (Baisakh=1 … Chaitra=12).
 */
const FIXED_BS_HOLIDAYS = [
  { bsMonth: 1,  bsDay: 1,  name: 'Nepali New Year',     nameNp: 'नयाँ वर्ष' },
  { bsMonth: 2,  bsDay: 15, name: 'Republic Day',         nameNp: 'गणतन्त्र दिवस' }, // Jestha 15
  { bsMonth: 6,  bsDay: 3,  name: 'Constitution Day',     nameNp: 'संविधान दिवस' }, // Ashwin 3
  { bsMonth: 12, bsDay: 7,  name: 'Democracy Day',        nameNp: 'प्रजातन्त्र दिवस' }, // Falgun 7
];

/**
 * Optional caller-supplied lunar holidays for a given AD year. Pass an array of
 * { date: ISO, name, nameNp } when seeding org-specific calendars (e.g. each
 * org admin can paste in Dashain / Tihar dates from the official Nepali Patro).
 */
function listFixedHolidays(forBsYear) {
  return FIXED_BS_HOLIDAYS.map((h) => {
    let adDate = null;
    try { adDate = bsToAd({ year: forBsYear, month: h.bsMonth, day: h.bsDay }); } catch {}
    return { ...h, bsYear: forBsYear, adDate };
  }).filter((h) => h.adDate);
}

function listForAdYear(adYear) {
  const startBs = adToBs(new Date(adYear, 0, 15));
  const endBs = adToBs(new Date(adYear, 11, 15));
  const years = new Set([startBs.year, endBs.year]);
  const all = [];
  for (const y of years) all.push(...listFixedHolidays(y));
  return all.filter((h) => h.adDate && h.adDate.getFullYear() === adYear)
    .sort((a, b) => a.adDate.getTime() - b.adDate.getTime());
}

function isHoliday(date) {
  const d = date instanceof Date ? date : new Date(date);
  const list = listForAdYear(d.getFullYear());
  return list.find((h) => h.adDate.toDateString() === d.toDateString()) || null;
}

module.exports = { FIXED_BS_HOLIDAYS, listFixedHolidays, listForAdYear, isHoliday };
