import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { entriesRepo, partiesRepo, statsRepo, useLive } from '../data';
import { goBack, navigate, setFlash } from '../lib/router';
import { finishEntryFlow } from '../lib/phoneAsk';
import { splitByLastContact } from '../lib/recent';
import { loadBook, notYetCustomers } from '../lib/contactBook';
import { reportError } from '../lib/report';
import { learnAlias, ruleParser, withAliases, type Forced, type ParseQuestion, type ParsedEntry } from '../voice';
import { listen, preferredLangs, rememberLang, type Listener } from '../voice/speech';
import { similarContacts } from '../voice/contactMatch';
import { ConfirmView } from './voice/ConfirmView';
import { ListeningView } from './voice/ListeningView';
import { ProblemView, type Problem } from './voice/ProblemView';
import { QuestionView } from './voice/QuestionView';
import { TypeView } from './voice/TypeView';

type View =
  | { name: 'listening' }
  | { name: 'working' }
  | { name: 'typing' }
  | { name: 'confirm'; entry: ParsedEntry; kindPending: boolean }
  | { name: 'question'; question: ParseQuestion }
  | { name: 'problem'; problem: Problem };

const capitalize = (text: string) => text.replace(/(^|\s)(\S)/g, (_, space: string, ch: string) => space + ch.toUpperCase());

// A number (with maybe "rupay") at the very end of what was heard
const AMOUNT_LAST = /d[d,]*s*(?:rs.?|rupay[ae]?|rupees?|روپے|روپیہ)?s*$/i;

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
  const heardName = useRef(''); // the name words as the phone first wrote them
  const forced = useRef<Forced>({});
  const pending = useRef<string | null>(null);
  const listener = useRef<Listener | null>(null);
  const amountTimer = useRef<number | undefined>(undefined);

  // Read the sentence (with any answers already given) and show the next screen
  const run = useCallback(async (text: string) => {
    const d = dataRef.current;
    if (!d) {
      pending.current = text; // the customer list is still loading: read it as soon as it is here
      setView({ name: 'working' });
      return;
    }
    // The balance goes along so "hisaab clear karo" knows how much to settle
    // and the spellings the phone got wrong before (corrected by the shopkeeper), so it can find the person
    const people = withAliases(d.parties.map((p) => ({ id: p.id, name: p.name, identifier: p.identifier, balance: d.stats[p.id]?.balance ?? 0 })));
    let result: Awaited<ReturnType<typeof ruleParser.parse>>;
    try {
      result = await ruleParser.parse(text, people, new Date(), forced.current);
    } catch (e) {
      // Never leave the person staring at a stuck screen: say so and offer typing or the manual buttons
      reportError(e, 'voice parse');
      setView({ name: 'problem', problem: 'other' });
      return;
    }
    // Only a name and an amount were said ("Aslam 500"): find the person first. The Diye / Mile choice is
    // then made with the same tap that saves (two big buttons on the check card), so there is one step less.
    let kindPending = false;
    if (result.type === 'question' && result.question === 'kind' && result.partial.amount && !forced.current.kind) {
      kindPending = true;
      try {
        result = await ruleParser.parse(text, people, new Date(), { ...forced.current, kind: 'diye' });
      } catch (e) {
        reportError(e, 'voice parse');
        setView({ name: 'problem', problem: 'other' });
        return;
      }
    }
    // The phonebook is searched with the customers: every matching person is shown, the shopkeeper taps the right one
    if (!forced.current.party) {
      const fresh = notYetCustomers(loadBook(), d.parties);
      const heard = result.type === 'entry' ? (result.heard_name ?? '') : result.question === 'new_party' || result.question === 'which_party' ? (result.name ?? '') : '';
      const hits = fresh.length > 0 && heard ? similarContacts(heard, fresh, 5) : [];
      if (hits.length > 0) {
        const contactOptions = hits.map((c) => ({ value: `contact:${c.phone}`, label: c.name, hint: c.phone }));
        if (result.type === 'entry' && result.party) {
          result = {
            type: 'question',
            question: 'which_party',
            name: capitalize(heard),
            options: [{ value: result.party.id, label: result.party.name, hint: result.party.identifier ?? undefined }, ...contactOptions],
            partial: { amount: result.amount, ...(kindPending ? {} : { kind: result.kind }) },
          };
        } else if (result.type === 'question' && result.question === 'which_party') {
          result = { ...result, options: [...(result.options ?? []), ...contactOptions] };
        } else if (result.type === 'question' && result.question === 'new_party') {
          result = { type: 'question', question: 'which_party', name: capitalize(heard), options: contactOptions, partial: result.partial };
        }
      }
    }
    // Remember the name as the phone heard it. If the shopkeeper then corrects the person and saves, we learn from it.
    if (!heardName.current) {
      if (result.type === 'entry') heardName.current = result.heard_name ?? '';
      else if (result.question === 'new_party' || result.question === 'which_party') heardName.current = result.name ?? '';
    }
    if (result.type === 'question') setView({ name: 'question', question: result });
    else setView({ name: 'confirm', entry: result, kindPending });
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
    heardName.current = '';
    setHeard('');
    setFailed(false);
    setView({ name: 'listening' });
    const langs = preferredLangs();
    const attempt = (i: number) => {
      const lang = langs[i];
      listener.current = listen({
        lang,
        silenceMs: 1300,
        onText: (info) => {
          setHeard(info.text);
          // The amount was the last thing said ("Usama 500"): stop right there, the app asks the rest
          window.clearTimeout(amountTimer.current);
          if (AMOUNT_LAST.test(info.text)) amountTimer.current = window.setTimeout(() => listener.current?.stop(), 700);
        },
        onEnd: (text) => {
          window.clearTimeout(amountTimer.current);
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
    return () => {
      listener.current?.abort();
      window.clearTimeout(amountTimer.current);
    };
  }, [start]);

  // Safety net: if reading the sentence takes too long for any reason, show the way out instead of waiting forever
  useEffect(() => {
    if (view.name !== 'working') return;
    const id = window.setTimeout(() => setView({ name: 'problem', problem: 'other' }), 8000);
    return () => window.clearTimeout(id);
  }, [view]);

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
    heardName.current = '';
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
    const kindPending = view.kindPending;
    // Diye and Mile belong to a customer. A sale or a kharcha belongs to nobody.
    const withParty = entry.kind === 'diye' || entry.kind === 'mile';
    const party = entry.party ? (data.parties.find((p) => p.id === entry.party?.id) ?? null) : null;
    if (!withParty || party) {
      const balance = party ? (data.stats[party.id]?.balance ?? 0) + (entry.kind === 'diye' ? entry.amount : entry.kind === 'mile' ? -entry.amount : 0) : 0;
      const save = async (chosen?: 'diye' | 'mile') => {
        if (saving) return;
        const kind = chosen ?? entry.kind;
        setSaving(true);
        setFailed(false);
        try {
          const created = await entriesRepo.create({
            kind,
            party_id: party?.id ?? null,
            amount: entry.amount,
            transcript: transcript.current,
            source: 'voice',
            promise_date: kind === 'diye' ? (entry.promise_date ?? null) : null,
          });
          setFlash({ kind: 'undoEntry', entryId: created.id });
          // The phone heard one name and a different customer was saved: remember it for next time
          if (party) learnAlias(heardName.current, party, data.parties);
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
          kindPending={kindPending}
          onSave={save}
          onEditParty={() => {
            // Wrong person heard: pick again (the amount and Diye/Mile are kept)
            forced.current = { ...forced.current, ...(kindPending ? {} : { kind: entry.kind }), amount: entry.amount };
            setView({ name: 'question', question: { type: 'question', question: 'who', partial: { ...(kindPending ? {} : { kind: entry.kind }), amount: entry.amount } } });
          }}
          onToggleKind={() => {
            // Diye <-> Mile in one tap. The person said it, so the "look carefully" note goes away.
            const kind = entry.kind === 'diye' ? 'mile' : 'diye';
            forced.current = { ...forced.current, kind };
            setView({ name: 'confirm', entry: { ...entry, kind, confidence: 1 }, kindPending: false });
          }}
          onEditAmount={() => {
            // Wrong amount heard: the big number keys, starting from the heard amount
            forced.current = { ...forced.current, ...(kindPending ? {} : { kind: entry.kind }), ...(entry.party ? { party: entry.party } : {}) };
            setView({ name: 'question', question: { type: 'question', question: 'amount', partial: { ...(kindPending ? {} : { kind: entry.kind }), amount: entry.amount, party: entry.party } } });
          }}
          onChange={() => navigate(changePath, { replace: true })}
          onBack={() => goBack('/')}
          onSavedDone={() => finishEntryFlow(party, '/')}
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
        onSettleAll={(amount, kind) => answer({ amount, kind })}
        onParty={(party) => answer({ party })}
        onAddParty={async (name) => {
          try {
            const { party } = await partiesRepo.create({ name });
            answer({ party });
          } catch {
            setView({ name: 'problem', problem: 'other' });
          }
        }}
        onAddContact={async (name, phone) => {
          try {
            const { party } = await partiesRepo.create({ name, phone });
            answer({ party });
          } catch {
            setView({ name: 'problem', problem: 'other' });
          }
        }}
        onPickExisting={() => setView({ name: 'question', question: { type: 'question', question: 'who', partial: q.partial } })}
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
