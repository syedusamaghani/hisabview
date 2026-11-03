// ALL text shown in the app lives in this one file. No text inside components.
// 'ro' = Roman Urdu (default), 'ur' = Urdu (right-to-left).
// To add text: add one line below with both languages, then use t('yourKey').

export type Lang = 'ro' | 'ur';

export const text = {
  appName: { ro: 'HisabView', ur: 'حساب ویو' },
  tagline: { ro: 'Aap ki dukaan ka udhaar khata', ur: 'آپ کی دکان کا ادھار کھاتا' },

  // Money words (never use accounting jargon)
  diye: { ro: 'Diye', ur: 'دیے' },
  mile: { ro: 'Mile', ur: 'ملے' },
  leneHain: { ro: 'Lene hain', ur: 'لینے ہیں' },
  deneHain: { ro: 'Dene hain', ur: 'دینے ہیں' },

  // Buttons
  theekHai: { ro: 'Theek hai', ur: 'ٹھیک ہے' },
  badlo: { ro: 'Badlo', ur: 'بدلیں' },
  wapasLo: { ro: 'Wapas lo', ur: 'واپس لو' },
  back: { ro: 'Wapas', ur: 'واپس' },
  close: { ro: 'Band karein', ur: 'بند کریں' },
  mic: { ro: 'Bolein', ur: 'بولیں' },
  listening: { ro: 'Sun rahe hain...', ur: 'سن رہے ہیں...' },

  // Messages
  saved: { ro: 'Save ho gaya', ur: 'محفوظ ہو گیا' },
  entryAdded: { ro: 'Entry likh di gayi', ur: 'اندراج لکھ دیا گیا' },

  // Hide amounts
  hideAmounts: { ro: 'Raqam chhupayein', ur: 'رقم چھپائیں' },
  showAmounts: { ro: 'Raqam dikhayein', ur: 'رقم دکھائیں' },
  amountHidden: { ro: 'Raqam chhupi hui hai', ur: 'رقم چھپی ہوئی ہے' },

  // Number keypad
  amountKeypad: { ro: 'Raqam likhein', ur: 'رقم لکھیں' },
  backspace: { ro: 'Aakhri number mitayein', ur: 'آخری نمبر مٹائیں' },

  // Empty state
  emptyTitle: { ro: 'Abhi koi entry nahi', ur: 'ابھی کوئی اندراج نہیں' },
  emptyBody: {
    ro: 'Pehli entry bolkar ya likh kar shuru karein',
    ur: 'پہلا اندراج بول کر یا لکھ کر شروع کریں',
  },
  emptyButton: { ro: 'Pehli entry likhein', ur: 'پہلا اندراج لکھیں' },

  // Language names (always shown in their own language)
  langRo: { ro: 'Roman Urdu', ur: 'Roman Urdu' },
  langUr: { ro: 'اردو', ur: 'اردو' },
} as const;

export type TextKey = keyof typeof text;

export const isRtl = (lang: Lang) => lang === 'ur';
