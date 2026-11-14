// Small pieces shared by the staff-work, activity and alerts screens.
import { useEffect, useState } from 'react';
import { cachedTeam, currentUserId, loadTeam, shopsRepo, useLive, type Teammate } from '../../data';
import { useT } from '../../i18n/i18n';
import type { TextKey } from '../../i18n/translations';
import type { What } from '../../lib/team';

export const WHAT_TEXT: Record<What, TextKey> = {
  sale: 'wSale',
  diye: 'wDiye',
  mile: 'wMile',
  kharcha: 'wKharcha',
  purchase: 'wPurchase',
  cash: 'wCash',
  stock: 'wStock',
  customer: 'wCustomer',
  other: 'wOther',
};

export const REASON_TEXT: Record<string, TextKey> = {
  wrong_entry: 'reasonWrong',
  customer_refused: 'reasonRefused',
  other: 'reasonOther',
  undo: 'reasonUndo',
  changed: 'reasonChanged',
};

export const ROLE_TEXT: Record<string, TextKey> = { owner: 'roleOwner', manager: 'roleManager', cashier: 'roleCashier' };

// The team of the shop: the saved copy at once, the fresh one when the internet answers
export function useTeam(): Teammate[] {
  const shop = useLive(() => shopsRepo.getMine(), []);
  const [team, setTeam] = useState<Teammate[]>([]);
  const shopId = shop?.id;
  useEffect(() => {
    if (!shopId) return;
    let alive = true;
    void cachedTeam(shopId).then((c) => alive && setTeam((now) => (now.length ? now : c)));
    void loadTeam(shopId).then((fresh) => alive && fresh.length && setTeam(fresh));
    return () => {
      alive = false;
    };
  }, [shopId]);
  return team;
}

// A person's name for the screen: the part of their email before the @, "you" for the person looking
export function useWho(team: Teammate[]): (userId: string | undefined) => string {
  const { t } = useT();
  const me = currentUserId();
  return (userId) => {
    if (!userId) return t('whoUnknown');
    if (userId === me) return t('tYou');
    const mate = team.find((m) => m.user_id === userId);
    return mate?.email ? mate.email.split('@')[0] : `${t('whoUnknown')} ${userId.slice(0, 4)}`;
  };
}
