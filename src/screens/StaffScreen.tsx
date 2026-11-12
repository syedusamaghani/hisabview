import { useCallback, useEffect, useState } from 'react';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { ChoiceCard } from '../components/ChoiceCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { TextField } from '../components/TextField';
import { staffRepo, type StaffInvite, type StaffMember } from '../data';
import { StaffError } from '../data/staffRepo';
import { useT } from '../i18n/i18n';
import type { TextKey } from '../i18n/translations';
import { goBack } from '../lib/router';

const ROLE_TEXT: Record<string, TextKey> = { owner: 'roleOwner', manager: 'roleManager', cashier: 'roleCashier' };

// The owner's team: add a person by their Google email (Manager or Cashier), switch somebody off or on.
// The rules for each role are enforced by the database (see lib/permissions.ts). Needs the internet.
export function StaffScreen({ shopId, userId }: { shopId: string; userId: string }) {
  const { t } = useT();
  const [team, setTeam] = useState<{ members: StaffMember[]; invites: StaffInvite[] } | null>(null);
  const [problem, setProblem] = useState<TextKey | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'cashier'>('cashier');
  const [busy, setBusy] = useState(false);

  const explain = (e: unknown): TextKey => (e instanceof StaffError ? (e.kind === 'offline' ? 'staffNeedNet' : e.kind === 'missing' ? 'staffMissing' : 'staffError') : 'staffError');

  const load = useCallback(async () => {
    try {
      setTeam(await staffRepo.list(shopId));
      setProblem(null);
    } catch (e) {
      setProblem(explain(e));
    }
  }, [shopId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (e) {
      setProblem(explain(e));
    } finally {
      setBusy(false);
    }
  };

  const add = () =>
    run(async () => {
      await staffRepo.invite(email.trim(), role);
      setEmail('');
    });

  return (
    <main className="mx-auto min-h-screen max-w-app pb-10">
      <ScreenHeader title={t('staffTitle')} onBack={() => goBack('/settings')} />
      <div className="flex flex-col gap-4 px-gutter pt-4">
        <p className="text-body text-inkSoft">{t('staffIntro')}</p>

        {problem && (
          <Card tone="soft" role="alert">
            <p className="text-body font-bold">{t(problem)}</p>
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <TextField label={t('staffEmail')} type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" dir="ltr" value={email} maxLength={200} onChange={(e) => setEmail(e.target.value)} />
          <div role="radiogroup" aria-label={t('yourRole')} className="flex flex-col gap-3">
            <ChoiceCard title={t('roleCashier')} selected={role === 'cashier'} onSelect={() => setRole('cashier')} className="!min-h-tap" />
            <ChoiceCard title={t('roleManager')} selected={role === 'manager'} onSelect={() => setRole('manager')} className="!min-h-tap" />
          </div>
          <p className="text-label text-inkSoft">{role === 'cashier' ? t('staffCashierInfo') : t('staffManagerInfo')}</p>
          <BigButton full icon="userPlus" disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())} onClick={add}>{t('staffAdd')}</BigButton>
        </Card>

        {team?.members.map((m) => (
          <Card key={m.user_id} className="flex flex-col gap-2">
            <div>
              <p dir="auto" className="truncate text-body font-extrabold text-ink">
                <bdi>{m.email ?? '—'}</bdi>
                {m.user_id === userId && <span className="text-inkSoft"> · {t('staffYou')}</span>}
              </p>
              <p className="text-label font-bold text-inkSoft">
                {t(ROLE_TEXT[m.role] ?? 'roleCashier')}
                {!m.active && ` · ${t('staffOffNote')}`}
              </p>
            </div>
            {m.role !== 'owner' && (
              <BigButton full variant="ghost" disabled={busy} onClick={() => run(() => staffRepo.setMember(m.user_id, m.role as 'manager' | 'cashier', !m.active))}>
                {m.active ? t('staffOff') : t('staffOn')}
              </BigButton>
            )}
          </Card>
        ))}

        {team?.invites.map((i) => (
          <Card key={i.id} tone="soft" className="flex flex-col gap-1">
            <p dir="auto" className="truncate text-body font-extrabold text-ink"><bdi>{i.email}</bdi></p>
            <p className="text-label font-bold text-inkSoft">{t(ROLE_TEXT[i.role])} · {t('staffInvited')}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
