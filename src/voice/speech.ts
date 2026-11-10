// The phone's speech-to-text (Web Speech API). No React here: screens use it through listen().
// Chrome sends the voice to Google to turn it into text, so it needs internet.

// The browser's types for this are not in TypeScript's standard list, so we describe what we use.
type RecognitionAlternative = { transcript: string; confidence: number };
type RecognitionResult = { isFinal: boolean; length: number; [index: number]: RecognitionAlternative };
type RecognitionEvent = { resultIndex: number; results: { length: number; [index: number]: RecognitionResult } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

// Urdu (Pakistan) first, then English (India), then English (US)
export const VOICE_LANGS = ['ur-PK', 'en-IN', 'en-US'] as const;
export type VoiceLang = (typeof VOICE_LANGS)[number];

const LANG_KEY = 'hv_voice_lang';

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const speechSupported = (): boolean => typeof window !== 'undefined' && ctor() !== undefined;

// The language that worked last time goes first
export function preferredLangs(): VoiceLang[] {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(LANG_KEY);
  } catch {
    // storage blocked: fine
  }
  const first = VOICE_LANGS.find((l) => l === saved);
  return first ? [first, ...VOICE_LANGS.filter((l) => l !== first)] : [...VOICE_LANGS];
}

export function rememberLang(lang: VoiceLang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // storage blocked: fine
  }
}

// What went wrong, in words the screen can turn into a friendly message
export type ListenProblem = 'unsupported' | 'offline' | 'denied' | 'no_speech' | 'bad_language' | 'other';

export type ListenOptions = {
  lang: string;
  alternatives?: number; // how many guesses to keep (only the /dev/voice page wants more than 1)
  silenceMs?: number; // stop this long after the last word (default 1600)
  waitMs?: number; // give up if nothing is said for this long (default 8000)
  onText: (info: { text: string; final: boolean; confidence: number | null; alternatives: string[] }) => void;
  onEnd: (finalText: string) => void; // finished normally; the text can be empty
  onProblem: (problem: ListenProblem, raw: string) => void;
};

export type Listener = { stop: () => void; abort: () => void };

export function listen(opts: ListenOptions): Listener {
  const Ctor = ctor();
  if (!Ctor) {
    queueMicrotask(() => opts.onProblem('unsupported', 'no SpeechRecognition'));
    return { stop: () => undefined, abort: () => undefined };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    queueMicrotask(() => opts.onProblem('offline', 'navigator.onLine is false'));
    return { stop: () => undefined, abort: () => undefined };
  }

  const rec = new Ctor();
  rec.lang = opts.lang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = opts.alternatives ?? 1;

  let latest = '';
  let finished = false;
  let silenceTimer: number | undefined;
  let waitTimer: number | undefined;
  let forceTimer: number | undefined;
  const clear = () => {
    window.clearTimeout(silenceTimer);
    window.clearTimeout(waitTimer);
    window.clearTimeout(forceTimer);
  };
  const stop = () => {
    try {
      rec.stop();
    } catch {
      // already stopped
    }
    // Some phones never say "ended" after stop(). Do not wait for ever: finish with what we heard.
    window.clearTimeout(forceTimer);
    forceTimer = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      clear();
      try {
        rec.abort();
      } catch {
        // already stopped
      }
      if (latest.trim()) opts.onEnd(latest.trim());
      else opts.onProblem('no_speech', 'no end event after stop');
    }, 2500);
  };

  const wait = opts.waitMs ?? 8000;
  waitTimer = window.setTimeout(stop, wait);

  rec.onresult = (e) => {
    window.clearTimeout(waitTimer);
    let text = '';
    let final = true;
    let best: RecognitionResult | null = null;
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      text += `${text ? ' ' : ''}${r[0].transcript.trim()}`;
      if (!r.isFinal) final = false;
      best = r;
    }
    latest = text;
    const alts: string[] = [];
    if (best) for (let i = 0; i < best.length; i++) alts.push(best[i].transcript.trim());
    opts.onText({ text, final, confidence: best ? (best[0].confidence ?? null) : null, alternatives: alts });
    // A pause after the last word means "done"
    window.clearTimeout(silenceTimer);
    // A finished result means the phone is already sure: do not make the person wait
    silenceTimer = window.setTimeout(stop, final ? 300 : (opts.silenceMs ?? 1600));
  };

  rec.onerror = (e) => {
    if (finished) return;
    finished = true;
    clear();
    const raw = e.error;
    if (raw === 'no-speech' || raw === 'aborted') {
      if (raw === 'no-speech') opts.onProblem('no_speech', raw);
      return;
    }
    if (raw === 'not-allowed' || raw === 'service-not-allowed') opts.onProblem('denied', raw);
    else if (raw === 'network') opts.onProblem('offline', raw);
    else if (raw === 'language-not-supported') opts.onProblem('bad_language', raw);
    else opts.onProblem('other', raw);
  };

  rec.onend = () => {
    clear();
    if (finished) return;
    finished = true;
    if (latest.trim()) opts.onEnd(latest.trim());
    else opts.onProblem('no_speech', 'ended with no text');
  };

  try {
    rec.start();
  } catch (err) {
    finished = true;
    clear();
    queueMicrotask(() => opts.onProblem('other', String(err)));
  }

  return {
    stop,
    abort: () => {
      finished = true;
      clear();
      try {
        rec.abort();
      } catch {
        // already stopped
      }
    },
  };
}
