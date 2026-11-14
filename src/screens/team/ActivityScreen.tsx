import { useState } from 'react';
import { AmountText } from '../../components/AmountText';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { ScreenHeader } from '../../components/ScreenHeader';
import { sync, teamRepo, useLive, useRole } from '../../data';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import { formatDay, formatTime } from '../../lib/dates';
import { canSeeTeamWork } from '../../lib/permissions';
import { goBack } from '../../lib/router';
import type { Act, What } from '../../lib/team';
import { REASON_TEXT, useTeam, useWho, WHAT_TEXT } from './parts';

const ACTIONS: { act: Act; text: TextKey; verb: TextKey }[] = [
  { act: 'create', text: 'actCreate', verb: 'actCreateV' },
  { act: 'edit', text: 'actEdit', verb: 'actEditV' },
  { act: 'cancel', text: 'actCancel', verb: 'actCancelV' },
];
const WHATS: What[] = ['sale', 'diye', 'mile', 'kharcha', 'purchase', 'stock', 'cash', 'customer'];

// Kaun ne kya kiya: the shop's diary, newest first. Filter by person, by what happened, by what it was about.
export function ActivityScreen() {
  const { t, lang } = useT();
  const role = useRole() ?? 'cashier';
  const [user, setUser] = useState<string | null>(null);
  const [action, setAction] = useState<Act | null>(null);
  const [what, setWhat] = useState<What | null>(null);
  const [busy, setBusy] = useState(false);
  const team = useTeam();
  const who = useWho(team);

  const rows = useLive(async () => (canSeeTeamWork(role) ? teamRepo.feed({ user, action, what }) : null), [role, user, action, what]);

  if (!canSeeTeamWork(role)) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('actTitle')} onBack={() => goBack('/dashboard')} />
        <p className="px-gutter pt-6 text-body font-bold">{t('tNotAllowed')}</p>
      </main>
    );
  }

  const refresh = async () => {
    setBusy(true);
    try {
      await sync.syncNow({ pull: true });
    } finally {
      setBusy(false);
    }
  };

  const chip = (selected: boolean, label: string, onClick: () => void, key: string) => (
    <Chip key={key} aria-pressed={selected} className={selected ? 'border-primary bg-primarySoft' : undefined} onClick={onClick}>
      {label}
    </Chip>
  );

  return (
    <main className="mx-auto min-h-screen max-w-app pb-10">
      <ScreenHeader title={t('actTitle')} onBack={() => goBack('/dashboard')} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <p className="text-label text-inkSoft">{t('actNote')}</p>
        <BigButton full variant="ghost" disabled={busy} onClick={refresh}>{t('refreshNow')}</BigButton>

        <div className="flex flex-col gap-2">
          <p className="text-label font-bold text-inkSoft">{t('fWho')}</p>
          <div className="flex flex-wrap gap-2" role="group">
            {chip(user === null, t('fAll'), () => setUser(null), 'all')}
            {team.map((m) => chip(user === m.user_id, who(m.user_id), () => setUser(m.user_id), m.user_id))}
          </div>
          <p className="pt-1 text-label font-bold text-inkSoft">{t('fAction')}</p>
          <div className="flex flex-wrap gap-2" role="group">
            {chip(action === null, t('fAll'), () => setAction(null), 'all')}
            {ACTIONS.map((a) => chip(action === a.act, t(a.text), () => setAction(a.act), a.act))}
          </div>
          <p className="pt-1 text-label font-bold text-inkSoft">{t('fWhat')}</p>
          <div className="flex flex-wrap gap-2" role="group">
            {chip(what === null, t('fAll'), () => setWhat(null), 'all')}
            {WHATS.map((w) => chip(what === w, t(WHAT_TEXT[w]), () => setWhat(w), w))}
          </div>
        </div>

        {rows && rows.length === 0 && (
          <Card tone="soft">
            <p className="text-body text-inkSoft">{t('actEmpty')}</p>
          </Card>
        )}
        <ul className="flex flex-col gap-2">
          {rows?.map((r) => {
            const verb = ACTIONS.find((a) => a.act === r.action)?.verb ?? 'actCreateV';
            return (
              <li key={r.id}>
                <Card className="flex flex-col gap-1 !p-3">
                  <span className="flex items-baseline justify-between gap-3">
                    <span dir="auto" className={r.action === 'cancel' ? 'min-w-0 text-body font-extrabold text-moneyOut' : 'min-w-0 text-body font-extrabold text-ink'}>
                      {t(WHAT_TEXT[r.what])}
                      {r.label && <span className="font-semibold text-inkSoft"> · {r.label}</span>}
                    </span>
                    {r.amount !== null && <AmountText amount={r.amount} size="s" tone="neutral" room="120px" />}
                  </span>
                  <span dir="auto" className="text-label font-semibold text-ink">{who(r.actor)} {t(verb)}</span>
                  {r.reason && <span className="text-label text-inkSoft">{t('actReason')}: {REASON_TEXT[r.reason] ? t(REASON_TEXT[r.reason]) : r.reason}</span>}
                  <bdi className="text-label text-inkSoft">{formatDay(r.at, lang)} · {formatTime(r.at, lang)}</bdi>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
