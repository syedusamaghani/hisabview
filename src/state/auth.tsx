import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setDataContext } from '../data/context';

// Who is logged in. Google sign-in only, handled by Supabase.
//  loading = still checking     signedOut = show the login screen
//  signedIn = ready             unavailable = the app was built without Supabase settings

type Status = 'loading' | 'signedOut' | 'signedIn' | 'unavailable';

type Auth = {
  status: Status;
  email: string | null;
  failed: boolean; // the last login or logout attempt did not work
  signInWithGoogle: () => Promise<void>;
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
        setStatus('unavailable');
        return;
      }
      // Fires once at start with the saved login (if any), and again on every login or logout
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setDataContext({ userId: session.user.id, shopId: null });
          setEmail(session.user.email ?? null);
          setStatus('signedIn');
        } else {
          setDataContext(null);
          setEmail(null);
          setStatus('signedOut');
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

  const signOut = useCallback(async () => {
    setFailed(false);
    try {
      const { supabase } = await import('../lib/supabase');
      await supabase?.auth.signOut();
    } catch {
      setFailed(true);
    }
  }, []);

  const value = useMemo(() => ({ status, email, failed, signInWithGoogle, signOut }), [status, email, failed, signInWithGoogle, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
