import type { Lang } from '../i18n/translations';

// Pakistan time. Digits stay 0-9 in both languages.
const locale = (lang: Lang) => (lang === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB');

// "4 Nov"
export function formatDay(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short' }).format(new Date(iso));
}

// "2:30 pm"
export function formatTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
