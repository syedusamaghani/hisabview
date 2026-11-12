import { useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { BottomActionBar } from '../../components/BottomActionBar';
import { Card } from '../../components/Card';
import { HideBanner } from '../../components/HideBanner';
import { Icon } from '../../components/Icon';
import { HideAmountsButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { currentUserId, cashRepo, entriesRepo, partiesRepo, useLive, useRole, type CancelReason, type Entry } from '../../data';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import { CASH_IN_SOURCES, CASH_OUT_SOURCES, addDays, dayKeyOf, isDayKey, type CashSource, type DayKey } from '../../lib/cashbook';
import { formatDay, formatTime } from '../../lib/dates';
import { formatRs } from '../../lib/money';
import { METHODS, METHOD_TEXT } from '../../lib/methods';
import { canChangeEntry, canManageCash } from '../../lib/permissions';
import { beginFlow, goBack, navigate } from '../../lib/router';
import { TodayRow } from '../TodayScreen';
import { useEntrySnack } from '../useEntrySnack';

const SOURCE_TEXT: Record<CashSource, TextKey> = {
  cashSale: 'cashSale',
  fromCustomers: 'cashFromCustomers',
  fromSuppliers: 'cashFromSuppliers',
  deposit: 'cashDeposit',
  supplierPayments: 'cashSupplierPay',
  expenses: 'cashExpenses',
  withdrawal: 'cashWithdrawal',
};

// The day's query (?day=2026-11-12), so a screen opened from another one shows the same day
export const dayFromAddress = (): DayKey => {
  const asked = new URLSearchParams(window.location.search).get('day');
  const today = dayKeyOf(new Date());
  return isDayKey(asked) && asked <= today ? asked : today;
};

// Galla: what went into and out of the drawer on one day, with the money by method, and the button to close the day.
// closing cash = opening + cash in - cash out. Udhaar given to a customer moves no cash, so it is not here.
export function CashbookScreen() {
  const { t, lang } = useT();
  const role = useRole() ?? 'cashier';
  const { snackbar, notify, hide } = useEntrySnack();
  const today = dayKeyOf(new Date());
  const [day, setDay] = useState<DayKey>(dayFromAddress);
  const [openId, setOpenId] = useState<string | null>(null);
  const view = useLive(() => cashRepo.cashbookFor(day), [day]);
  const names = useLive(async () => new Map((await partiesRepo.listAll()).map((p) => [p.id, p.name])), []);

  const header = <ScreenHeader title={t('cashTitle')} subtitle={formatDay(`${day}T12:00:00+05:00`, lang)} onBack={() => goBack('/today')} right={<HideAmountsButton tone="header" />} />;
  if (!canManageCash(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        {header}
        <p className="px-gutter pt-6 text-body font-bold">{t('cashAskManager')}</p>
      </main>
    );
  }

  const start = (path: string) => {
    beginFlow();
    navigate(path);
  };
  const cancel = async (entry: Entry, reason: CancelReason) => {
    setOpenId(null);
    await entriesRepo.cancel(entry.id, reason);
    notify('entryCancelled');
  };

  const cash = view?.day;
  const lines = (sources: CashSource[]) =>
    sources.filter((s) => (cash?.lines[s] ?? 0) > 0).map((s) => (
      <li key={s} className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-body font-semibold text-inkSoft">{t(SOURCE_TEXT[s])}</span>
        <AmountText amount={cash?.lines[s] ?? 0} size="s" tone="neutral" room="140px" />
      </li>
    ));
  const closing = view?.closing;
  const methodRows = METHODS.filter((m) => cash && (cash.byMethod[m].in > 0 || cash.byMethod[m].out > 0));

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      {header}
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <HideBanner />

        <div className="grid grid-cols-2 gap-3">
          <BigButton variant="ghost" onClick={() => { hide(); setDay(addDays(day, -1)); }}>{t('cashPrevDay')}</BigButton>
          <BigButton variant="ghost" disabled={day >= today} onClick={() => { hide(); setDay(addDays(day, 1)); }}>{t('cashNextDay')}</BigButton>
        </div>

        <Card>
          <p className="text-label font-semibold text-inkSoft">{t('cashOpening')}</p>
          <AmountText amount={cash?.opening ?? 0} size="l" tone="neutral" />
          {view && !view.openingKnown && <p className="mt-2 text-label font-semibold text-inkSoft">{t('cashOpeningUnknown')}</p>}
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-2 text-body font-extrabold text-ink"><Icon name="down" size={22} className="text-moneyIn" />{t('cashIn')}</span>
            <AmountText amount={cash?.cashIn ?? 0} size="m" tone="in" room="150px" />
          </div>
          <ul className="flex flex-col gap-1">{lines(CASH_IN_SOURCES)}</ul>
        </Card>

        <Card className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-2 text-body font-extrabold text-ink"><Icon name="up" size={22} className="text-moneyOut" />{t('cashOut')}</span>
            <AmountText amount={cash?.cashOut ?? 0} size="m" tone="out" room="150px" />
          </div>
          <ul className="flex flex-col gap-1">{lines(CASH_OUT_SOURCES)}</ul>
        </Card>

        <Card tone="soft">
          <p className="text-label font-semibold text-inkSoft">{t('cashExpected')}</p>
          <AmountText amount={cash?.closing ?? 0} size="xl" tone="neutral" />
        </Card>

        {closing && (
          <Card>
            <p className="text-body font-extrabold text-ink">{t('cashClosedTitle')}</p>
            <p className="text-label text-inkSoft"><bdi>{formatTime(closing.created_at, lang)}</bdi></p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-label font-semibold text-inkSoft">{t('cashClosedAt').replace('{amount}', '')}</span>
              <AmountText amount={closing.counted_cash} size="m" tone="neutral" room="160px" />
            </div>
            <p className={closing.difference < 0 ? 'mt-1 text-body font-extrabold text-moneyOut' : closing.difference > 0 ? 'mt-1 text-body font-extrabold text-moneyIn' : 'mt-1 text-body font-extrabold text-ink'}>
              {closing.difference < 0
                ? t('cashShort').replace('{amount}', formatRs(-closing.difference))
                : closing.difference > 0
                  ? t('cashExtra').replace('{amount}', formatRs(closing.difference))
                  : t('cashMatch')}
            </p>
            {closing.note && <p dir="auto" className="mt-1 text-label text-inkSoft">{closing.note}</p>}
          </Card>
        )}

        {methodRows.length > 0 && (
          <Card className="flex flex-col gap-2">
            <p className="text-body font-extrabold text-ink">{t('cashByMethod')}</p>
            <ul className="flex flex-col gap-2">
              {methodRows.map((m) => (
                <li key={m} className="flex items-baseline justify-between gap-3">
                  <span className="text-body font-bold text-ink">{t(METHOD_TEXT[m])}</span>
                  <span className="flex flex-col items-end text-label font-semibold text-inkSoft">
                    <span>{t('cashMethodIn')} <bdi className="font-extrabold text-moneyIn">{formatRs(cash?.byMethod[m].in ?? 0)}</bdi></span>
                    <span>{t('cashMethodOut')} <bdi className="font-extrabold text-moneyOut">{formatRs(cash?.byMethod[m].out ?? 0)}</bdi></span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {day === today && (
          <div className="grid grid-cols-2 gap-3">
            <BigButton variant="diye" icon="up" onClick={() => start('/cashbook/withdraw')}>{t('cashBtnOut')}</BigButton>
            <BigButton variant="mile" icon="down" onClick={() => start('/cashbook/deposit')}>{t('cashBtnIn')}</BigButton>
          </div>
        )}

        <h2 className="pt-1 text-title font-extrabold text-ink">{t('cashEntries')}</h2>
        {view && view.list.length === 0 && (
          <Card tone="soft">
            <p className="text-body font-extrabold text-ink">{t('cashNothing')}</p>
          </Card>
        )}
        <ul className="flex flex-col gap-2">
          {view?.list.map((entry) => (
            <TodayRow
              key={entry.id}
              entry={entry}
              name={entry.party_id ? (names?.get(entry.party_id) ?? '') : ''}
              open={openId === entry.id}
              canChange={canChangeEntry(role, entry, currentUserId())}
              onToggle={() => {
                hide();
                setOpenId(openId === entry.id ? null : entry.id);
              }}
              onCancel={(reason) => cancel(entry, reason)}
            />
          ))}
        </ul>
      </div>

      {snackbar}

      <BottomActionBar>
        <BigButton full size="lg" icon="check" onClick={() => navigate(`/cashbook/close?day=${day}`)} disabled={!view}>
          {closing ? t('cashCountAgain') : t('cashCloseDay')}
        </BigButton>
      </BottomActionBar>
    </main>
  );
}
