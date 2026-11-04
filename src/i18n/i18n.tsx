import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { text, isRtl, type Lang, type TextKey } from './translations';

// A tiny translation helper (no i18n library).
// Usage inside a component:  const { t } = useT();  ...  <p>{t('saved')}</p>

const STORAGE_KEY = 'hv_lang';

// null = the person has never chosen a language (first launch)
function readSavedLang(): Lang | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ro' || saved === 'ur') return saved;
  } catch {
    // Storage can be blocked. Roman Urdu is the default.
  }
  return null;
}

type LangContext = {
  lang: Lang;
  langChosen: boolean; // false on the very first launch, so the app asks for a language
  setLang: (lang: Lang) => void;
  t: (key: TextKey) => string;
};

const Ctx = createContext<LangContext | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Lang | null>(readSavedLang);
  const lang: Lang = saved ?? 'ro';

  // Urdu is right-to-left. This flips the whole page (the layout mirrors by itself).
  useLayoutEffect(() => {
    document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
    document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not saving is fine. The choice still works until the app closes.
    }
  }, []);

  const t = useCallback((key: TextKey) => text[key][lang], [lang]);
  const value = useMemo(() => ({ lang, langChosen: saved !== null, setLang, t }), [lang, saved, setLang, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useT(): LangContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useT must be used inside <LangProvider>');
  return ctx;
}
