// Hidden developer page at /dev/components. It shows every shared component in every state.
// Not linked from anywhere in the app. The section titles below are developer labels in
// English; everything a shopkeeper would read inside the components comes from translations.
import { useEffect, useState, type ReactNode } from 'react';
import { AmountText } from '../components/AmountText';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { NavTabs, type Tab } from '../components/BottomNav';
import { ChoiceCard } from '../components/ChoiceCard';
import { HideBanner } from '../components/HideBanner';
import { Sheet } from '../components/Sheet';
import { SwitchRow } from '../components/SwitchRow';
import { Chip } from '../components/Chip';
import { PartyRow } from '../components/PartyRow';
import { SearchBar } from '../components/SearchBar';
import { TextField } from '../components/TextField';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { HideAmountsButton } from '../components/IconButton';
import { ICON_NAMES, Icon } from '../components/Icon';
import { ListeningMic } from '../components/ListeningMic';
import { MicButton } from '../components/MicButton';
import { OptionButton } from '../components/OptionButton';
import { NumberKeypad } from '../components/NumberKeypad';
import { SaveSuccess, TickBadge } from '../components/SaveSuccess';
import { ScreenHeader } from '../components/ScreenHeader';
import { Snackbar } from '../components/Snackbar';
import { useT } from '../i18n/i18n';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section data-section={title} className="mb-8">
      <h2 className="latin mb-3 text-label font-bold uppercase tracking-wide text-inkSoft" dir="ltr">
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default function ComponentGallery() {
  const { t, lang, setLang } = useT();
  const [amount, setAmount] = useState(2500);
  const [snack, setSnack] = useState(false);
  const [saved, setSaved] = useState(false);
  const [listening, setListening] = useState(false);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [choice, setChoice] = useState<'a' | 'b'>('a');
  const [tab, setTab] = useState<Tab>('home');
  const [sheet, setSheet] = useState(false);
  const [on, setOn] = useState(false);

  // Keep search engines away from this page
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <div className="mx-auto max-w-app px-gutter pb-[calc(var(--bar-h)+32px)] pt-2">
      <div className="sticky top-0 z-20 -mx-gutter mb-4 flex items-center gap-2 bg-page px-gutter py-2 shadow-card">
        <BigButton variant={lang === 'ro' ? 'primary' : 'ghost'} onClick={() => setLang('ro')} className="flex-1 whitespace-nowrap px-2 !text-label" aria-pressed={lang === 'ro'}>
          {t('langRo')}
        </BigButton>
        <BigButton variant={lang === 'ur' ? 'primary' : 'ghost'} onClick={() => setLang('ur')} className="flex-1 whitespace-nowrap px-2 !text-label" aria-pressed={lang === 'ur'}>
          {t('langUr')}
        </BigButton>
        <HideAmountsButton />
      </div>

      <Section title="BigButton: variants">
        <BigButton full>{t('theekHai')}</BigButton>
        <BigButton full variant="diye" icon="up">{t('diye')}</BigButton>
        <BigButton full variant="mile" icon="down">{t('mile')}</BigButton>
        <BigButton full variant="ghost" icon="edit">{t('badlo')}</BigButton>
        <div className="rounded-card bg-primary p-3">
          <BigButton full variant="accent" icon="stop">{t('ruko')}</BigButton>
        </div>
      </Section>

      <Section title="BigButton: large, pressed, disabled">
        <div className="grid grid-cols-2 gap-3">
          <BigButton size="lg" variant="diye" icon="note">{t('diye')}</BigButton>
          <BigButton size="lg" variant="mile" icon="note">{t('mile')}</BigButton>
        </div>
        <BigButton full className="translate-y-0.5 !shadow-btnPressed">{t('theekHai')} (pressed)</BigButton>
        <BigButton full disabled>{t('theekHai')} (disabled)</BigButton>
      </Section>

      <Section title="AmountText: sizes">
        <Card className="flex flex-col gap-1">
          <AmountText amount={500} size="s" tone="out" />
          <AmountText amount={2500} size="m" tone="in" />
          <AmountText amount={15000} size="l" tone="out" />
          <AmountText amount={84500} size="xl" tone="neutral" />
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('leneHain')}</p>
            <AmountText amount={84500} tone="out" />
          </Card>
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('deneHain')}</p>
            <AmountText amount={32000} />
          </Card>
        </div>
        <p className="latin text-label text-inkSoft" dir="ltr">Very big amounts shrink to fit:</p>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('leneHain')}</p>
            <AmountText amount={1245000} tone="out" />
          </Card>
          <Card>
            <p className="text-label font-semibold text-inkSoft">{t('deneHain')}</p>
            <AmountText amount={250000000} />
          </Card>
        </div>
        <Card>
          <AmountText amount={999999999} size="xl" tone="out" />
        </Card>
        <p className="latin text-label text-inkSoft" dir="ltr">Use the eye button at the top to hide all amounts.</p>
      </Section>

      <Section title="Card: plain, soft, pattern">
        <Card>{t('tagline')}</Card>
        <Card tone="soft">{t('tagline')}</Card>
        <Card pattern>
          <p className="text-title font-bold">“{t('entryAdded')}”</p>
        </Card>
      </Section>

      <Section title="ScreenHeader: brand and plain">
        <div className="overflow-hidden rounded-card bg-page">
          <ScreenHeader title={t('appName')} subtitle={t('tagline')} onBack={() => undefined} right={<HideAmountsButton tone="header" />} />
        </div>
        <Card className="p-0">
          <ScreenHeader variant="plain" title={t('appName')} subtitle={t('tagline')} onBack={() => undefined} right={<HideAmountsButton />} />
        </Card>
      </Section>

      <Section title="Icons">
        <Card className="grid grid-cols-4 gap-3">
          {ICON_NAMES.map((name) => (
            <div key={name} className="flex flex-col items-center gap-1 text-primary">
              <Icon name={name} size={32} />
              <span className="latin text-[12px] text-inkSoft" dir="ltr">{name}</span>
            </div>
          ))}
        </Card>
      </Section>

      <Section title="NumberKeypad">
        <div className="text-center">
          <AmountText amount={amount} size="xl" reveal />
        </div>
        <NumberKeypad value={amount} onChange={setAmount} />
      </Section>

      <Section title="MicButton: idle and listening">
        <div className="flex items-center justify-center gap-10 py-3">
          <MicButton label={t('mic')} />
          <MicButton label={t('listening')} listening={listening} onClick={() => setListening((v) => !v)} />
        </div>
        <p className="text-center text-body text-inkSoft">{listening ? t('listening') : t('mic')}</p>
      </Section>

      <Section title="ListeningMic (voice screen): listening and still">
        <div className="flex items-center justify-around rounded-card bg-primary p-8">
          <ListeningMic active label={t('listening')} />
          <ListeningMic active={false} label={t('mic')} />
        </div>
      </Section>

      <Section title="OptionButton: an answer to tap">
        <OptionButton center title={<AmountText amount={500} size="l" tone="out" reveal />} onClick={() => undefined} />
        <OptionButton title={t('anotherCustomer')} subtitle={t('writeByHand')} onClick={() => undefined} />
      </Section>

      <Section title="TextField: normal, large, with hint">
        <TextField label={t('nameLabel')} placeholder={t('namePlaceholder')} value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label={t('amountLabel')} placeholder="0" inputMode="numeric" dir="ltr" size="lg" />
        <TextField label={t('identifierLabel')} placeholder={t('identifierPlaceholder')} hint={t('identifierHelp')} />
      </Section>

      <Section title="SearchBar, Chip, ChoiceCard">
        <SearchBar value={query} onChange={setQuery} placeholder={t('searchPlaceholder')} />
        <div className="flex flex-wrap gap-2">
          <Chip>{t('example1')}</Chip>
          <Chip>{t('example2')}</Chip>
        </div>
        <div role="radiogroup" aria-label={t('whoOwesLabel')} className="flex flex-col gap-3">
          <ChoiceCard title={t('theyOweMe')} icon="up" selected={choice === 'a'} onSelect={() => setChoice('a')} />
          <ChoiceCard title={t('iOweThem')} icon="down" selected={choice === 'b'} onSelect={() => setChoice('b')} />
        </div>
      </Section>

      <Section title="PartyRow: owes me, I owe, settled">
        <PartyRow name="Ali" identifier="chai wala" balance={84500} onClick={() => undefined} />
        <PartyRow name="Dealer Shahid" identifier={null} balance={-12000} onClick={() => undefined} />
        <PartyRow name="Ali" identifier="gali 3" balance={0} onClick={() => undefined} />
        <PartyRow name="Muhammad Abdul Rehman Bakery Wala" identifier="Gali no 4, near masjid" balance={250000000} onClick={() => undefined} />
      </Section>

      <Section title="NavTabs (the real bar is BottomNav)">
        <Card><NavTabs active={tab} onSelect={setTab} /></Card>
      </Section>

      <Section title="SwitchRow, HideBanner (shows only while amounts are hidden)">
        <Card><SwitchRow label={t('hideAmounts')} checked={on} onChange={setOn} /></Card>
        <HideBanner />
      </Section>

      <Section title="Sheet">
        <BigButton full variant="ghost" onClick={() => setSheet(true)}>{t('micSoonTitle')}</BigButton>
        <Sheet open={sheet} onClose={() => setSheet(false)} title={t('micSoonTitle')}>
          <p className="mb-4 text-center text-body text-inkSoft">{t('micSoonBody')}</p>
          <BigButton full onClick={() => setSheet(false)}>{t('theekHai')}</BigButton>
        </Sheet>
      </Section>

      <Section title="TickBadge">
        <div className="flex justify-center"><TickBadge /></div>
      </Section>

      <Section title="Snackbar (with Wapas lo and WhatsApp)">
        <BigButton full variant="ghost" onClick={() => setSnack(true)}>{t('entryAdded')}</BigButton>
      </Section>

      <Section title="EmptyState">
        <Card>
          <EmptyState title={t('emptyTitle')} body={t('emptyBody')} buttonLabel={t('emptyButton')} onButton={() => undefined} />
        </Card>
      </Section>

      <Section title="SaveSuccess (tick + vibration + sound)">
        <BigButton full onClick={() => setSaved(true)} icon="check">{t('saved')}</BigButton>
      </Section>

      <Section title="BottomActionBar (fixed, below)">
        <p className="latin text-label text-inkSoft" dir="ltr">The bar at the bottom of this screen is the real component.</p>
      </Section>

      <Snackbar open={snack} message={t('entryAdded')} actionLabel={t('wapasLo')} secondaryLabel={t('waLabel')} onSecondary={() => undefined} onClose={() => setSnack(false)} />
      <SaveSuccess show={saved} label={t('saved')} onDone={() => setSaved(false)} />

      <BottomActionBar>
        <div className="grid grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] items-center gap-3">
          <BigButton size="lg" variant="diye" icon="note" className="!px-2">{t('diye')}</BigButton>
          <MicButton label={t('mic')} className="-mt-8 justify-self-center" />
          <BigButton size="lg" variant="mile" icon="note" className="!px-2">{t('mile')}</BigButton>
        </div>
      </BottomActionBar>
    </div>
  );
}
