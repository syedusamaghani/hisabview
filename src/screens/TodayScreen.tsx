import { useEffect, useMemo, useRef, useState } from 'react';
import { AmountText } from '../components/AmountText';
import { BigButton } from '../components/BigButton';
import { BottomActionBar } from '../components/BottomActionBar';
import { Card } from '../components/Card';
import { HideBanner } from '../components/HideBanner';
import { Icon, type IconName } from '../components/Icon';
import { HideAmountsButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { entriesRepo, partiesRepo, shopsRepo, useLive, type Entry } from '../data';
import { useT } from '../i18n/i18n';
import { cx } from '../lib/cx';
import { formatDay, formatTime } from '../lib/dates';
import { todayText } from '../lib/messages';
import { beginFlow, goBack, navigate } from '../lib/router';
import { changeEntryPath } from './EntryScreen';
import { pakistanDayStart, todayEntries, todaySummary } from '../lib/today';
import { openWhatsApp, whatsappUrl } from '../lib/whatsapp';
import { useEntrySnack } from './useEntrySnack';

// Aaj ka hisaab: udhaar given, money received, cash sales and kharcha of today (Pakistan time),
// every entry of the day, and buttons to write a sale or a kharcha.
export function TodayScreen() {
  const { t, lang } = useT();
  const { snackbar, notify, hide } = useEntrySnack();
  const [openId, setOpenId] = useState<string | null>(null);
  const data = useLive(
    async () => ({
      entries: await entriesRepo.listSince(pakistanDayStart(new Date()).toISOString()),
      parties: await partiesRepo.listAll(),
      shopName: (await shopsRepo.getMine())?.shop_name ?? '',
    }),
    [],
  );

  const view = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    return { now, summary: todaySummary(data.entries, now), list: todayEntries(data.entries, now), names: new Map(data.parties.map((p) => [p.id, p.name])) };
  }, [data]);

  const start = (path: string) => {
    beginFlow();
    navigate(path);
  };

  const send = () => {
    if (!view || !data) return;
    openWhatsApp(whatsappUrl(null, todayText(lang, data.shopName, view.now, view.summary)));
  };

  const cancel = async (entry: Entry) => {
    setOpenId(null);
    await entriesRepo.cancel(entry.id);
    notify('entryCancelled');
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={t('todayTitle')} subtitle={view ? formatDay(view.now.toISOString(), lang) : undefined} onBack={() => goBack('/')} right={<HideAmountsButton tone="onBrand" />} />

      <div className="flex flex-col gap-4 px-gutter pt-4">
        <HideBanner />

        <div className="grid grid-cols-2 gap-3">
          <Stat label={t('todayDiye')} amount={view?.summary.diye ?? 0} tone="out" />
          <Stat label={t('todayMile')} amount={view?.summary.mile ?? 0} tone="in" />
          <Stat label={t('todaySale')} amount={view?.summary.sale ?? 0} tone="in" />
          <Stat label={t('todayKharcha')} amount={view?.summary.kharcha ?? 0} tone="out" />
        </div>

        <BigButton full variant="ghost" icon="whatsapp" onClick={send} disabled={!view}>{t('sendStatement')}</BigButton>

        <h2 className="pt-1 text-title font-extrabold text-ink">{t('todayEntries')}</h2>
        {view && view.list.length === 0 && (
          <Card tone="soft">
            <p className="text-body font-extrabold text-ink">{t('todayEmpty')}</p>
          </Card>
        )}
        <ul className="flex flex-col gap-2">
          {view?.list.map((entry) => (
            <TodayRow
              key={entry.id}
              entry={entry}
              name={entry.party_id ? (view.names.get(entry.party_id) ?? '') : ''}
              open={openId === entry.id}
              onToggle={() => {
                hide();
                setOpenId(openId === entry.id ? null : entry.id);
              }}
              onCancel={() => cancel(entry)}
            />
          ))}
        </ul>
      </div>

      {snackbar}

      <BottomActionBar>
        <div className="grid grid-cols-2 gap-3">
          <BigButton size="lg" variant="mile" icon="down" onClick={() => start('/today/sale')}>{t('writeSale')}</BigButton>
          <BigButton size="lg" variant="diye" icon="up" onClick={() => start('/today/kharcha')}>{t('writeKharcha')}</BigButton>
        </div>
      </BottomActionBar>
    </main>
  );
}

function Stat({ label, amount, tone }: { label: string; amount: number; tone: 'in' | 'out' }) {
  return (
    <Card>
      <p className="text-label font-semibold text-inkSoft">{label}</p>
      <AmountText amount={amount} tone={tone} />
    </Card>
  );
}

// One entry of today. Tap it to cancel it (it stays in the history, marked cancelled).
function TodayRow({ entry, name, open, onToggle, onCancel }: { entry: Entry; name: string; open: boolean; onToggle: () => void; onCancel: () => void }) {
  const { t, lang } = useT();
  const rowRef = useRef<HTMLLIElement>(null);
  const [asking, setAsking] = useState(false);
  const changePath = changeEntryPath(entry);
  useEffect(() => {
    if (open) rowRef.current?.scrollIntoView({ block: 'nearest' });
    else setAsking(false);
  }, [open, asking]);

  const cancelled = entry.status === 'cancelled';
  const inn = entry.kind === 'mile' || entry.kind === 'cash_sale';
  const icon: IconName = inn ? 'down' : 'up';
  const kindLabel = t(entry.kind === 'mile' ? 'mile' : entry.kind === 'cash_sale' ? 'saleLabel' : entry.kind === 'kharcha' ? 'kharchaLabel' : 'diye');

  const body = (
    <div className="flex items-center gap-3">
      <span
        className={cx(
          'grid size-11 shrink-0 place-items-center rounded-full',
          cancelled ? 'bg-line text-inkSoft' : inn ? 'bg-moneyInSoft text-moneyIn' : 'bg-moneyOutSoft text-moneyOut',
        )}
      >
        <Icon name={icon} size={24} />
      </span>
      <span className="min-w-0 flex-1 text-start">
        <span dir="auto" className="block truncate text-body font-extrabold">{name || kindLabel}</span>
        <span className="block text-label text-inkSoft">
          {name && <>{kindLabel} · </>}
          <span className="whitespace-nowrap"><bdi>{formatTime(entry.created_at, lang)}</bdi></span>
        </span>
        {cancelled && <span className="block text-label font-bold text-inkSoft">{t('cancelledLabel')}</span>}
        {entry.note && <span dir="auto" className="block truncate text-label text-inkSoft">{entry.note}</span>}
      </span>
      <AmountText amount={entry.amount} tone={cancelled ? 'neutral' : inn ? 'in' : 'out'} room="120px" className={cancelled ? 'line-through' : undefined} />
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
            <>
              {changePath && <BigButton full icon="edit" onClick={() => { beginFlow(); navigate(changePath); }}>{t('badlo')}</BigButton>}
              <BigButton full variant="ghost" onClick={() => setAsking(true)}>{t('cancelEntry')}</BigButton>
            </>
          )}
        </div>
      )}
    </li>
  );
}
