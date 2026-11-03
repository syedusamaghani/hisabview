import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

// "Hide amounts" switch. When on, every AmountText shows "Rs ***".
// Remembered on the phone, so a shopkeeper who hides amounts keeps them hidden.

const STORAGE_KEY = 'hv_hide_amounts';

function readSaved(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

type PrivacyContext = { hidden: boolean; toggle: () => void };

const Ctx = createContext<PrivacyContext | null>(null);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState<boolean>(readSaved);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Not saving is fine.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ hidden, toggle }), [hidden, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrivacy(): PrivacyContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrivacy must be used inside <PrivacyProvider>');
  return ctx;
}
