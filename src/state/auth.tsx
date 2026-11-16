import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setDataContext } from '../data/context';
import { getGuestId, makeGuestId } from '../lib/guest';

// Who is logged in. Google sign-in only, handled by Supabase.
//  loading = still checking     signedOut = show the login screen
//  signedIn = ready             unavailable = the app was built without Supabase settings

//  guest = using the app without a login (the khata is only on this phone until the person logs in)
type Status = 'loading' | 'signedOut' | 'signedIn' | 'unavailable' | 'guest';

type Auth = {
  status: Status;
  email: string | null;
  failed: boolean; // the last login or logout attempt did not work
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;

    import('../lib/supabase').then(({ supabase }) => {
      if (stopped) return;
      if (!supabase) {
        // No server settings in this build: a person who started as a guest can still use the khata
        const guest = getGuestId();
        if (guest) {
          setDataContext({ userId: guest, shopId: null });
          setStatus('guest');
        } else setStatus('unavailable');
        return;
      }
      // Fires once at start with the saved login (if any), and again on every login or logout
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setDataContext({ userId: session.user.id, shopId: null });
          setEmail(session.user.email ?? null);
          setStatus('signedIn');
        } else {
          const guest = getGuestId();
          setEmail(null);
          if (guest) {
            setDataContext({ userId: guest, shopId: null });
            setStatus('guest');
          } else {
            setDataContext(null);
            setStatus('signedOut');
          }
        }
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });

    return () => {
      stopped = true;
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setFailed(false);
    try {
      const { supabase } = await import('../lib/supabase');
      if (!supabase) throw new Error('Supabase is not set up');
      // Sends the person to Google, then back to this same address
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch {
      setFailed(true);
    }
  }, []);

  // Start without a login: the khata is written on this phone under a private guest id
  const continueAsGuest = useCallback(() => {
    setDataContext({ userId: makeGuestId(), shopId: null });
    setStatus('guest');
  }, []);

  const signOut = useCallback(async () => {
    setFailed(false);
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase?.auth.signOut();
    } catch {
      setFailed(true);
    }
  }, []);

  const value = useMemo(() => ({ status, email, failed, signInWithGoogle, continueAsGuest, signOut }), [status, email, failed, signInWithGoogle, continueAsGuest, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
