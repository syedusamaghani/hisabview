import { useEffect, useRef, useState } from 'react';
import { AmountText } from '../components/AmountText';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Icon, type IconName } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { entriesRepo, partiesRepo, useLive, type Entry, type Party } from '../data';
import { useT } from '../i18n/i18n';
import { partyBalance } from '../lib/balance';
import { formatDay, formatTime } from '../lib/dates';
import { cx } from '../lib/cx';
import { beginFlow, goBack, navigate, setFlash } from '../lib/router';
import { speakBalance, speakSupported, stopSpeaking } from '../voice/speak';
import { useEntrySnack } from './useEntrySnack';

// One customer: the big balance, what is coming soon, every entry (newest first), and Diye / Mile.
export function PartyScreen({ partyId }: { partyId: string }) {
  const { t } = useT();
  const data = useLive(
    async () => ({ party: (await partiesRepo.get(partyId)) ?? null, entries: await entriesRepo.listForParty(partyId) }),
    [partyId],
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const { snackbar, notify, hide } = useEntrySnack();
  const archiveRef = useRef<HTMLDivElement>(null);

  // Stop talking when the screen is left
  useEffect(() => () => stopSpeaking(), []);

  // The "are you sure?" box must never hide behind the bottom bar
  useEffect(() => {
    if (archiving) archiveRef.current?.scrollIntoView({ block: 'nearest' });
  }, [archiving]);

  if (data === undefined) return <main className="mx-auto min-h-screen max-w-app" />;

  const { party, entries } = data;
  if (!party) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('appName')} onBack={() => goBack('/')} />
        <EmptyState title={t('partyNotFound')} body="" buttonLabel={t('goHome')} onButton={() => navigate('/', { replace: true })} />
      </main>
    );
  }

  const balance = partyBalance(party, entries);

  // "Sunao": the phone reads the balance aloud. Tap again to stop.
  const canSpeak = speakSupported();
  const sunao = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speakBalance(party.name, balance, () => setSpeaking(false));
  };

  const cancel = async (entry: Entry) => {
    setOpenId(null);
    await entriesRepo.cancel(entry.id);
    notify('entryCancelled');
  };

  const archive = async () => {
    await partiesRepo.archive(party.id);
    setFlash({ kind: 'undoArchive', partyId: party.id });
    navigate('/customers', { replace: true });
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={party.name} subtitle={party.identifier ?? undefined} onBack={() => goBack('/')} />

      <div className="flex flex-col gap-4 px-gutter pt-4">
        <Card>
          <p className="text-label font-semibold text-inkSoft">
            {balance > 0 ? t('leneHain') : balance < 0 ? t('deneHain') : t('settled')}
          </p>
          <AmountText amount={Math.abs(balance)} size="xl" tone={balance > 0 ? 'out' : 'neutral'} />
        </Card>

        <div className={canSpeak ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
          <SoonTile icon="bell" label={t('remind')} />
          <SoonTile icon="whatsapp" label={t('sendStatement')} />
          {canSpeak && <ListenTile speaking={speaking} onClick={sunao} />}
        </div>

        <h2 className="pt-2 text-title font-extrabold text-ink">{t('historyTitle')}</h2>
        {entries.length === 0 ? (
          <p className="text-body text-inkSoft">{t('emptyTitle')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                party={party}
                open={openId === entry.id}
                onToggle={() => {
                  hide();
                  setOpenId(openId === entry.id ? null : entry.id);
                }}
                onCancel={() => cancel(entry)}
              />
            ))}
          </ul>
        )}

        <div ref={archiveRef} className="scroll-mb-[calc(var(--bar-h)+24px)] pt-6">
          {archiving ? (
            <Card tone="soft" className="flex flex-col gap-3">
              <p className="text-body font-bold">{t('archiveAsk')}</p>
              <BigButton full onClick={archive}>{t('yesArchive')}</BigButton>
              <BigButton full variant="ghost" onClick={() => setArchiving(false)}>{t('no')}</BigButton>
            </Card>
          ) : (
            <BigButton
              full
              variant="ghost"
              icon="archive"
              onClick={() => {
                hide();
                setArchiving(true);
              }}
            >
              {t('archive')}
            </BigButton>
          )}
        </div>
      </div>

      {snackbar}

      <BottomActionBar>
        <div className="grid grid-cols-2 gap-3">
          <BigButton size="lg" variant="diye" icon="up" onClick={() => {
              beginFlow();
              navigate(`/party/${party.id}/diye`);
            }}>{t('diye')}</BigButton>
          <BigButton size="lg" variant="mile" icon="down" onClick={() => {
              beginFlow();
              navigate(`/party/${party.id}/mile`);
            }}>{t('mile')}</BigButton>
        </div>
      </BottomActionBar>
    </main>
  );
}

// The real "Sunao" button: reads the balance aloud, and becomes "Ruko" while it talks.
function ListenTile({ speaking, onClick }: { speaking: boolean; onClick: () => void }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={speaking}
      className={cx(
        'flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-card border-[1.5px] p-2 text-center shadow-card transition-colors duration-fast',
        'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-accent',
        speaking ? 'border-primary bg-primarySoft' : 'border-line bg-surface',
      )}
    >
      <Icon name={speaking ? 'stop' : 'speaker'} size={28} className="text-primary" />
      <span className="text-label font-bold leading-tight text-ink">{speaking ? t('ruko') : t('listen')}</span>
    </button>
  );
}

// A place for a feature that is coming later. Clearly switched off, with a small "jald" tag.
function SoonTile({ icon, label }: { icon: IconName; label: string }) {
  const { t } = useT();
  return (
    <button
      type="button"
      disabled
      className="flex min-h-[92px] flex-col items-center justify-center gap-1 rounded-card border-[1.5px] border-dashed border-line bg-surface p-2 text-center opacity-80"
    >
      <Icon name={icon} size={28} className="text-inkSoft" />
      <span className="text-label font-bold leading-tight text-ink">{label}</span>
      <span className="rounded-full bg-primarySoft px-2 text-caption font-bold text-primary">{t('soon')}</span>
    </button>
  );
}

function HistoryRow({ entry, party, open, onToggle, onCancel }: { entry: Entry; party: Party; open: boolean; onToggle: () => void; onCancel: () => void }) {
  const { t, lang } = useT();
  const rowRef = useRef<HTMLLIElement>(null);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (open) rowRef.current?.scrollIntoView({ block: 'nearest' });
    else setAsking(false);
  }, [open, asking]);
  const cancelled = entry.status === 'cancelled';
  const opening = entry.kind === 'opening';
  const gave = entry.kind === 'diye' || (opening && party.type === 'customer');

  // Red = they owe me / money went out. Green = money came in. Dark = I owe them.
  const tone = cancelled ? 'neutral' : entry.kind === 'mile' ? 'in' : gave ? 'out' : 'neutral';
  const badge = cancelled
    ? 'bg-line text-inkSoft'
    : entry.kind === 'mile'
      ? 'bg-moneyInSoft text-moneyIn'
      : gave
        ? 'bg-moneyOutSoft text-moneyOut'
        : 'bg-primarySoft text-primary';
  const icon: IconName = entry.kind === 'mile' ? 'down' : opening && !gave ? 'down' : 'up';
  const label = opening ? t('openingLabel') : entry.kind === 'mile' ? t('mile') : t('diye');

  const body = (
    <div className="flex items-center gap-3">
      <span className={cx('grid size-11 shrink-0 place-items-center rounded-full', badge)}>
        <Icon name={icon} size={24} />
      </span>
      <span className="min-w-0 flex-1 text-start">
        <span className="block text-body font-extrabold">{label}</span>
        <span className="block text-label text-inkSoft">
          <span className="whitespace-nowrap">{formatDay(entry.created_at, lang)}</span>{' '}
          <span className="whitespace-nowrap"><bdi>{formatTime(entry.created_at, lang)}</bdi></span>
          </span>
        {cancelled && <span className="block text-label font-bold text-inkSoft">{t('cancelledLabel')}</span>}
        {entry.note && <span dir="auto" className="block truncate text-label text-inkSoft">{entry.note}</span>}
      </span>
      <AmountText amount={entry.amount} tone={tone} room="120px" className={cancelled ? 'line-through' : undefined} />
    </div>
  );

  return (
    <li ref={rowRef} className={cx('scroll-mb-[calc(var(--bar-h)+24px)] rounded-card border-[1.5px] border-line bg-surface shadow-card', cancelled && 'opacity-60')}>
      {cancelled ? (
        <div className="p-3">{body}</div>
      ) : (
        <button type="button" onClick={onToggle} aria-expanded={open} className="block min-h-[68px] w-full rounded-card p-3 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent">
          {body}
        </button>
      )}
      {open && !cancelled && (
        <div className="flex flex-col gap-3 border-t-[1.5px] border-line p-3">
          {asking ? (
            <>
              <p className="text-body text-inkSoft">{t('cancelAsk')}</p>
              <BigButton full onClick={onCancel}>{t('yesCancel')}</BigButton>
              <BigButton full variant="ghost" onClick={onToggle}>{t('no')}</BigButton>
            </>
          ) : (
            <BigButton full variant="ghost" onClick={() => setAsking(true)}>{t('cancelEntry')}</BigButton>
          )}
        </div>
      )}
    </li>
  );
}
