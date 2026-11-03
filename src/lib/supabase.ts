// The Supabase connection. Only the login code (src/state/auth.tsx) imports this file,
// and it does so lazily, so the first screen does not wait for it.
// The screens and the rest of the app never talk to Supabase directly.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// null when the two settings are missing (for example a build without a .env file)
export const supabase = url && key ? createClient(url, key) : null;
