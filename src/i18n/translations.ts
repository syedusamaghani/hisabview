// ALL text shown in the app lives in this one file. No text inside components.
// 'ro' = Roman Urdu (default), 'ur' = Urdu (right-to-left).

export type Lang = 'ro' | 'ur';

const text = {
  appName: { ro: 'HisabView', ur: 'حساب ویو' },
  tagline: {
    ro: 'Aap ki dukaan ka udhaar khata',
    ur: 'آپ کی دکان کا ادھار کھاتا',
  },
} as const;

export type TextKey = keyof typeof text;

let currentLang: Lang = 'ro';

export function setLang(lang: Lang) {
  currentLang = lang;
}

export function t(key: TextKey): string {
  return text[key][currentLang];
}
