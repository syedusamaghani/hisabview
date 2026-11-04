// Hidden test page at /dev/voice (not linked anywhere). Say a sentence in each language setting
// and see the raw text the phone returns, so we can tell which setting works best on THIS phone.
// Developer page: its words are English on purpose and live in the one object below.
import { useEffect, useRef, useState } from 'react';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { parseEntry } from '../voice';
import { speakSupported } from '../voice/speak';
import { VOICE_LANGS, listen, speechSupported, type Listener } from '../voice/speech';

const WORDS = {
  title: 'Voice test',
  help: 'Tap a language, then say: "Aslam ko 500 udhaar diya". Compare the text you get.',
  supported: 'Speech to text',
  speaks: 'Text to speech',
  online: 'Internet',
  yes: 'yes',
  no: 'no',
  say: 'Speak in',
  stop: 'Stop',
  log: 'Results',
  none: 'Nothing yet',
  voices: 'Voices on this phone (text to speech)',
  noVoices: 'none listed',
  parsed: 'Parser says',
};

// A small sample shop so the parser has names to match
const SAMPLE = [
  { id: 'aslam', name: 'Aslam', identifier: null },
  { id: 'bilal', name: 'Bilal', identifier: 'gali 3' },
  { id: 'ali1', name: 'Ali', identifier: 'chai wala' },
  { id: 'ali2', name: 'Ali', identifier: 'gali 4' },
];

type Row = { id: number; lang: string; text: string; confidence: number | null; alternatives: string[]; problem?: string; ms: number; parsed?: string };

export default function VoiceTest() {
  const [active, setActive] = useState<string | null>(null);
  const [live, setLive] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [voices, setVoices] = useState<string[]>([]);
  const listener = useRef<Listener | null>(null);
  const started = useRef(0);
  const counter = useRef(0);

  useEffect(() => {
    if (!speakSupported()) return;
    const read = () => setVoices(window.speechSynthesis.getVoices().map((v) => `${v.lang} · ${v.name}`));
    read();
    window.speechSynthesis.addEventListener('voiceschanged', read);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', read);
  }, []);

  const add = (row: Omit<Row, 'id' | 'ms'>) =>
    setRows((r) => [{ ...row, id: ++counter.current, ms: Date.now() - started.current }, ...r]);

  const start = (lang: string) => {
    listener.current?.abort();
    setActive(lang);
    setLive('');
    started.current = Date.now();
    let last: { confidence: number | null; alternatives: string[] } = { confidence: null, alternatives: [] };
    listener.current = listen({
      lang,
      alternatives: 3,
      onText: (info) => {
        setLive(info.text);
        last = { confidence: info.confidence, alternatives: info.alternatives };
      },
      onEnd: (text) => {
        setActive(null);
        const parsed = parseEntry(text, SAMPLE);
        add({ lang, text, ...last, parsed: JSON.stringify(parsed.type === 'entry' ? { kind: parsed.kind, amount: parsed.amount, party: parsed.party?.name ?? null, date: parsed.promise_date } : { question: parsed.question, partial: parsed.partial }) });
      },
      onProblem: (problem, raw) => {
        setActive(null);
        add({ lang, text: '', confidence: null, alternatives: [], problem: `${problem} (${raw})` });
      },
    });
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-10">
      <ScreenHeader title={WORDS.title} subtitle={WORDS.help} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <Card className="text-body">
          <p>{WORDS.supported}: <b>{speechSupported() ? WORDS.yes : WORDS.no}</b></p>
          <p>{WORDS.speaks}: <b>{speakSupported() ? WORDS.yes : WORDS.no}</b></p>
          <p>{WORDS.online}: <b>{navigator.onLine ? WORDS.yes : WORDS.no}</b></p>
        </Card>

        <div className="flex flex-col gap-3">
          {VOICE_LANGS.map((lang) => (
            <BigButton key={lang} full variant={active === lang ? 'accent' : 'primary'} icon={active === lang ? 'stop' : 'mic'} onClick={() => (active === lang ? listener.current?.stop() : start(lang))}>
              {active === lang ? `${WORDS.stop} (${lang})` : `${WORDS.say} ${lang}`}
            </BigButton>
          ))}
        </div>

        {active && (
          <Card pattern aria-live="polite">
            <p dir="auto" className="min-h-[2lh] text-title font-extrabold">{live || '...'}</p>
          </Card>
        )}

        <h2 className="text-title font-extrabold">{WORDS.log}</h2>
        {rows.length === 0 && <p className="text-body text-inkSoft">{WORDS.none}</p>}
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col gap-1 text-body">
                <p className="font-extrabold">{r.lang} · {r.ms} ms</p>
                {r.problem ? <p className="text-moneyOut">{r.problem}</p> : <p dir="auto" className="text-title font-bold">{r.text}</p>}
                {r.confidence !== null && <p className="text-label text-inkSoft">confidence {r.confidence.toFixed(2)}</p>}
                {r.alternatives.length > 1 && <p dir="auto" className="text-label text-inkSoft">{r.alternatives.join(' | ')}</p>}
                {r.parsed && <p className="break-words text-label text-inkSoft">{WORDS.parsed}: {r.parsed}</p>}
              </Card>
            </li>
          ))}
        </ul>

        <h2 className="text-title font-extrabold">{WORDS.voices}</h2>
        <ul className="text-label text-inkSoft">
          {voices.length === 0 ? <li>{WORDS.noVoices}</li> : voices.map((v) => <li key={v}>{v}</li>)}
        </ul>
      </div>
    </main>
  );
}
