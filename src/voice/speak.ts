// The phone reads a balance aloud ("Sunao"). Uses the phone's own voice, no internet, no cost.
import { text, type Lang } from '../i18n/translations';
import { romanNumberWords } from '../lib/numberWords';

export const speakSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

// An Urdu voice reads Urdu script best. Without one, an English (India) voice reads Roman Urdu.
function pickVoice(): { voice: SpeechSynthesisVoice | null; script: 'urdu' | 'roman' } {
  const voices = window.speechSynthesis.getVoices();
  const urdu = voices.find((v) => /^ur\b/i.test(v.lang));
  if (urdu) return { voice: urdu, script: 'urdu' };
  const english = voices.find((v) => /^en[-_]IN/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang)) ?? null;
  return { voice: english, script: 'roman' };
}

// The sentence for one customer. balance above 0 = they owe me, below 0 = I owe them.
export function balanceSentence(name: string, balance: number, lang: Lang, amountWords: boolean): string {
  const amount = Math.abs(balance);
  const say = (key: 'sayLene' | 'sayDene' | 'saySettled') =>
    text[key][lang].replace('{name}', name).replace('{amount}', amountWords ? romanNumberWords(amount) : String(amount));
  if (balance > 0) return say('sayLene');
  if (balance < 0) return say('sayDene');
  return say('saySettled');
}

export function stopSpeaking() {
  if (speakSupported()) window.speechSynthesis.cancel();
}

// Says the balance. onEnd is called when it finishes or is stopped.
export function speakBalance(name: string, balance: number, onEnd: () => void) {
  if (!speakSupported()) {
    onEnd();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  let started = false;
  const speakNow = () => {
    if (started) return;
    started = true;
    const { voice, script } = pickVoice();
    const lang: Lang = script === 'urdu' ? 'ur' : 'ro';
    const utterance = new SpeechSynthesisUtterance(balanceSentence(name, balance, lang, script === 'roman'));
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = script === 'urdu' ? 'ur-PK' : 'en-IN';
    }
    utterance.rate = 0.9; // a little slower is easier to follow in a noisy shop
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    synth.speak(utterance);
  };
  // On many phones the list of voices arrives a moment after the page opens
  if (synth.getVoices().length > 0) speakNow();
  else {
    const timer = window.setTimeout(speakNow, 500);
    synth.addEventListener('voiceschanged', () => {
      window.clearTimeout(timer);
      speakNow();
    }, { once: true });
  }
}
