import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { entriesRepo, partiesRepo, statsRepo, useLive } from '../data';
import { finishFlow, goBack, navigate, setFlash } from '../lib/router';
import { splitByLastContact } from '../lib/recent';
import { ruleParser, type Forced, type ParseQuestion, type ParsedEntry } from '../voice';
import { listen, preferredLangs, rememberLang, type Listener } from '../voice/speech';
import { ConfirmView } from './voice/ConfirmView';
import { ListeningView } from './voice/ListeningView';
import { ProblemView, type Problem } from './voice/ProblemView';
import { QuestionView } from './voice/QuestionView';
import { TypeView } from './voice/TypeView';

type View =
  | { name: 'listening' }
  | { name: 'working' }
  | { name: 'typing' }
  | { name: 'confirm'; entry: ParsedEntry }
  | { name: 'question'; question: ParseQuestion }
  | { name: 'problem'; problem: Problem };

// Speak an entry: listen -> understand -> check card -> Theek hai.
// If the sentence is not clear the app asks ONE question with big answers to tap.
export default function VoiceScreen() {
  const data = useLive(async () => ({ parties: await partiesRepo.listActive(), stats: await statsRepo.all() }), []);
  const dataRef = useRef(data);
  dataRef.current = data;

  const [view, setView] = useState<View>({ name: 'listening' });
  const [heard, setHeard] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const transcript = useRef('');
  const forced = useRef<Forced>({});
  const pending = useRef<string | null>(null);
  const listener = useRef<Listener | null>(null);

  // Read the sentence (with any answers already given) and show the next screen
  const run = useCallback(async (text: string) => {
    const d = dataRef.current;
    if (!d) {
      pending.current = text; // the customer list is still loading: read it as soon as it is here
      setView({ name: 'working' });
      return;
    }
    const result = await ruleParser.parse(text, d.parties, new Date(), forced.current);
    if (result.type === 'question') setView({ name: 'question', question: result });
    else setView({ name: 'confirm', entry: result });
  }, []);

  useEffect(() => {
    if (data && pending.current !== null) {
      const text = pending.current;
      pending.current = null;
      void run(text);
    }
  }, [data, run]);

  const start = useCallback(() => {
    listener.current?.abort();
    forced.current = {};
    transcript.current = '';
    setHeard('');
    setFailed(false);
    setView({ name: 'listening' });
    const langs = preferredLangs();
    const attempt = (i: number) => {
      const lang = langs[i];
      listener.current = listen({
        lang,
        onText: (info) => setHeard(info.text),
        onEnd: (text) => {
          rememberLang(lang);
          transcript.current = text;
          setHeard(text);
          setView({ name: 'working' });
          void run(text);
        },
        onProblem: (problem) => {
          // This phone does not know Urdu (Pakistan): try the next language
          if (problem === 'bad_language' && i + 1 < langs.length) attempt(i + 1);
          else setView({ name: 'problem', problem });
        },
      });
    };
    attempt(0);
  }, [run]);

  useEffect(() => {
    start();
    return () => listener.current?.abort();
  }, [start]);

  const parties = data?.parties ?? [];
  const balances = useMemo(() => Object.fromEntries(Object.values(data?.stats ?? {}).map((s) => [s.party_id, s.balance])), [data]);
  // For "Kis ka hisaab?": people dealt with lately first, then the rest A to Z (so a new customer is never missing)
  const recent = useMemo(() => {
    if (!data) return [];
    const { recent: lately, others } = splitByLastContact(data.parties, Object.fromEntries(Object.values(data.stats).map((s) => [s.party_id, s.last_at])), 5);
    return [...lately, ...others].slice(0, 8);
  }, [data]);

  const answer = (next: Forced) => {
    forced.current = { ...forced.current, ...next };
    setView({ name: 'working' });
    void run(transcript.current);
  };

  const manual = (kind: 'diye' | 'mile') => navigate(`/entry/${kind}`, { replace: true });

  // Typing instead of speaking: stop the microphone, then read the typed sentence the same way
  const openTyping = () => {
    listener.current?.abort();
    setView({ name: 'typing' });
  };
  const typed = (text: string) => {
    forced.current = {};
    transcript.current = text;
    setHeard(text);
    setView({ name: 'working' });
    void run(text);
  };

  if (view.name === 'problem') {
    return <ProblemView problem={view.problem} onRetry={start} onType={openTyping} onManual={manual} onBack={() => goBack('/')} />;
  }

  if (view.name === 'typing') {
    return <TypeView onDone={typed} onBack={start} />;
  }

  if (view.name === 'confirm' && data) {
    const entry = view.entry;
    // Diye and Mile belong to a customer. A sale or a kharcha belongs to nobody.
    const withParty = entry.kind === 'diye' || entry.kind === 'mile';
    const party = entry.party ? (data.parties.find((p) => p.id === entry.party?.id) ?? null) : null;
    if (!withParty || party) {
      const balance = party ? (data.stats[party.id]?.balance ?? 0) + (entry.kind === 'diye' ? entry.amount : entry.kind === 'mile' ? -entry.amount : 0) : 0;
      const save = async () => {
        if (saving) return;
        setSaving(true);
        setFailed(false);
        try {
          const created = await entriesRepo.create({
            kind: entry.kind,
            party_id: party?.id ?? null,
            amount: entry.amount,
            transcript: transcript.current,
            source: 'voice',
            promise_date: entry.promise_date ?? null,
          });
          setFlash({ kind: 'undoEntry', entryId: created.id });
          setSaved(true);
        } catch {
          setFailed(true);
          setSaving(false);
        }
      };
      // "Badlo": the normal screen with the spoken amount already typed
      const changePath = party
        ? `/party/${party.id}/${entry.kind}?amount=${entry.amount}`
        : `/today/${entry.kind === 'cash_sale' ? 'sale' : 'kharcha'}?amount=${entry.amount}`;
      return (
        <ConfirmView
          entry={entry}
          party={party}
          transcript={transcript.current}
          balance={balance}
          saving={saving}
          failed={failed}
          saved={saved}
          onSave={save}
          onEditParty={() => {
            // Wrong person heard: pick again (the amount and Diye/Mile are kept)
            forced.current = { ...forced.current, kind: entry.kind, amount: entry.amount };
            setView({ name: 'question', question: { type: 'question', question: 'who', partial: { kind: entry.kind, amount: entry.amount } } });
          }}
          onToggleKind={() => {
            // Diye <-> Mile in one tap. The person said it, so the "look carefully" note goes away.
            const kind = entry.kind === 'diye' ? 'mile' : 'diye';
            forced.current = { ...forced.current, kind };
            setView({ name: 'confirm', entry: { ...entry, kind, confidence: 1 } });
          }}
          onEditAmount={() => {
            // Wrong amount heard: the big number keys, starting from the heard amount
            forced.current = { ...forced.current, kind: entry.kind, ...(entry.party ? { party: entry.party } : {}) };
            setView({ name: 'question', question: { type: 'question', question: 'amount', partial: { kind: entry.kind, amount: entry.amount, party: entry.party } } });
          }}
          onChange={() => navigate(changePath, { replace: true })}
          onBack={() => goBack('/')}
          onSavedDone={() => finishFlow('/')}
        />
      );
    }
  }

  if (view.name === 'question') {
    const q = view.question;
    return (
      <QuestionView
        question={q}
        parties={parties}
        balances={balances}
        recent={recent}
        onKind={(kind) => answer({ kind })}
        onAmount={(amount) => answer({ amount })}
        onParty={(party) => answer({ party })}
        onAddParty={async (name) => {
          try {
            const { party } = await partiesRepo.create({ name });
            answer({ party });
          } catch {
            setView({ name: 'problem', problem: 'other' });
          }
        }}
        onNoParty={() => (q.partial.kind ? manual(q.partial.kind as 'diye' | 'mile') : goBack('/'))}
        onOtherParty={() => manual((q.partial.kind as 'diye' | 'mile' | undefined) ?? 'diye')}
        onRetry={start}
        onBack={() => goBack('/')}
      />
    );
  }

  return (
    <ListeningView
      heard={heard}
      working={view.name === 'working' || view.name === 'confirm'}
      onStop={() => listener.current?.stop()}
      onType={openTyping}
      onBack={() => goBack('/')}
    />
  );
}
