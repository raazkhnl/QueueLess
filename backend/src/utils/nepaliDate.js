/**
 * Bikram Sambat (BS) ↔ Gregorian (AD) helpers.
 *
 * Wraps the battle-tested `nepali-date-converter` package and exposes a small,
 * stable surface used across the codebase (PDF receipts, notifications, API
 * responses, and BS-aware UIs). Centralising it here keeps the package
 * substitutable later if needed.
 */
const NepaliDateModule = require('nepali-date-converter');
const NepaliDate = NepaliDateModule.default || NepaliDateModule;

const NP_MONTHS_NE = ['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुष','माघ','फाल्गुन','चैत'];
const NP_MONTHS_EN = ['Baishakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
const NP_DAYS_NE = ['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
const NP_DIGITS = ['०','१','२','३','४','५','६','७','८','९'];

const toNepaliDigits = (s) => String(s).replace(/[0-9]/g, (d) => NP_DIGITS[Number(d)]);

/** Convert AD Date → { year, month, day } in BS (1-indexed month). */
function adToBs(date) {
  const d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) throw new TypeError('Invalid date');
  const np = new NepaliDate(d);
  return { year: np.getYear(), month: np.getMonth() + 1, day: np.getDate() };
}

/** Convert BS { year, month, day } (1-indexed month) → AD Date. */
function bsToAd({ year, month, day }) {
  return new NepaliDate(year, month - 1, day).toJsDate();
}

/**
 * Format a date as a BS string.
 * mode: 'short' → 'YYYY-MM-DD'; 'long' → 'D Month YYYY'; 'full' → 'Day, D Month YYYY'.
 * lang: 'en' (Roman digits + Romanised month) or 'ne' (Devanagari digits + Nepali month).
 */
function formatBs(date, { mode = 'long', lang = 'en' } = {}) {
  const bs = adToBs(date);
  const months = lang === 'ne' ? NP_MONTHS_NE : NP_MONTHS_EN;
  const dow = (date instanceof Date ? date : new Date(date)).getDay();

  if (mode === 'short') {
    const out = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
    return lang === 'ne' ? toNepaliDigits(out) : out;
  }

  const dayStr = lang === 'ne' ? toNepaliDigits(bs.day) : bs.day;
  const yearStr = lang === 'ne' ? toNepaliDigits(bs.year) : bs.year;
  const core = `${dayStr} ${months[bs.month - 1]} ${yearStr}`;

  if (mode === 'full') {
    const dayName = lang === 'ne' ? NP_DAYS_NE[dow] : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow];
    return `${dayName}, ${core}`;
  }
  return core;
}

module.exports = {
  adToBs,
  bsToAd,
  formatBs,
  toNepaliDigits,
  NP_MONTHS_EN,
  NP_MONTHS_NE,
  NP_DAYS_NE,
};
