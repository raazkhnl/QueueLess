/**
 * Frontend Bikram Sambat helpers — thin wrapper around `nepali-date-converter`.
 * Keeps the dependency abstracted behind a small surface so it can be swapped.
 */
import NepaliDateModule from 'nepali-date-converter';

const NepaliDate: any = (NepaliDateModule as any).default || NepaliDateModule;

export const NP_MONTHS_NE = ['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुष','माघ','फाल्गुन','चैत'];
export const NP_MONTHS_EN = ['Baishakh','Jestha','Ashadh','Shrawan','Bhadra','Ashwin','Kartik','Mangsir','Poush','Magh','Falgun','Chaitra'];
export const NP_DAYS_NE = ['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
const NP_DIGITS = ['०','१','२','३','४','५','६','७','८','९'];

export const toNepaliDigits = (s: string | number) => String(s).replace(/[0-9]/g, (d) => NP_DIGITS[Number(d)]);

export interface BsParts { year: number; month: number; day: number; }

export function adToBs(date: string | Date): BsParts {
  const d = date instanceof Date ? date : new Date(date);
  const np = new NepaliDate(d);
  return { year: np.getYear(), month: np.getMonth() + 1, day: np.getDate() };
}

export function bsToAd({ year, month, day }: BsParts): Date {
  return new NepaliDate(year, month - 1, day).toJsDate();
}

export type BsFormatMode = 'short' | 'long' | 'full';
export type Lang = 'en' | 'ne';

export function formatBs(date: string | Date, opts: { mode?: BsFormatMode; lang?: Lang } = {}): string {
  const { mode = 'long', lang = 'en' } = opts;
  const bs = adToBs(date);
  const months = lang === 'ne' ? NP_MONTHS_NE : NP_MONTHS_EN;

  if (mode === 'short') {
    const out = `${bs.year}-${String(bs.month).padStart(2, '0')}-${String(bs.day).padStart(2, '0')}`;
    return lang === 'ne' ? toNepaliDigits(out) : out;
  }

  const dayStr = lang === 'ne' ? toNepaliDigits(bs.day) : String(bs.day);
  const yearStr = lang === 'ne' ? toNepaliDigits(bs.year) : String(bs.year);
  const core = `${dayStr} ${months[bs.month - 1]} ${yearStr}`;
  if (mode === 'full') {
    const dow = (date instanceof Date ? date : new Date(date)).getDay();
    const dayName = lang === 'ne' ? NP_DAYS_NE[dow] : ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow];
    return `${dayName}, ${core}`;
  }
  return core;
}

/** Convenience: render BOTH calendars side by side, e.g. "1 May 2026 (BS 18 Baisakh 2083)". */
export function formatDual(date: string | Date, lang: Lang = 'en'): string {
  const d = date instanceof Date ? date : new Date(date);
  const ad = d.toLocaleDateString(lang === 'ne' ? 'ne-NP' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const bs = formatBs(d, { mode: 'long', lang });
  return `${ad} (${lang === 'ne' ? 'वि.सं. ' : 'BS '}${bs})`;
}
