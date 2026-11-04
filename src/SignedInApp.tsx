// Everything a logged-in person sees. It is loaded only after login (lazy), so the first
// screens (language, login) stay small and fast.
import { Suspense, lazy, useEffect, useState } from 'react';
import { ScreenHeader } from './components/ScreenHeader';
import { attachShop, shopsRepo, useLive } from './data';
import { useT } from './i18n/i18n';
import { usePath } from './lib/router';
import { AddPartyScreen } from './screens/AddPartyScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { DoneScreen } from './screens/DoneScreen';
import { EntryScreen } from './screens/EntryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { OldBalancesScreen } from './screens/OldBalancesScreen';
import { PartyScreen } from './screens/PartyScreen';
import { PickPartyScreen } from './screens/PickPartyScreen';
import { RemindScreen } from './screens/RemindScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ShopNameScreen } from './screens/ShopNameScreen';
import { TodayScreen } from './screens/TodayScreen';

// The voice screen (and the parser behind it) is loaded only when the mic is tapped
const VoiceScreen = lazy(() => import('./screens/VoiceScreen'));

// name -> done -> old (optional) -> home. A person who already has a shop goes straight to home.
type Stage = 'name' | 'done' | 'old' | 'home';

export default function SignedInApp() {
  const { t } = useT();
  const path = usePath();
  const found = useLive(async () => ({ shop: (await shopsRepo.getMine()) ?? null }), []);
  const [stage, setStage] = useState<Stage | null>(null);
  const [attachedShop, setAttachedShop] = useState<string | null>(null);

  useEffect(() => {
    if (!found) return;
    if (found.shop) {
      attachShop(found.shop.id);
      setAttachedShop(found.shop.id);
    }
    // Decided once, when we first learn whether this person already has a shop
    setStage((current) => current ?? (found.shop ? 'home' : 'name'));
  }, [found]);

  const shop = found?.shop;

  if (stage === null || (stage !== 'name' && (!shop || attachedShop !== shop.id))) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
      </main>
    );
  }

  if (stage === 'name') return <ShopNameScreen onCreated={() => setStage('done')} />;
  if (stage === 'done') return <DoneScreen shopName={shop?.shop_name ?? ''} onOld={() => setStage('old')} onSkip={() => setStage('home')} />;
  if (stage === 'old') return <OldBalancesScreen onFinish={() => setStage('home')} />;

  // Home and the customer screens, chosen by the page address
  if (path === '/party/new') return <AddPartyScreen />;
  if (path === '/customers') return <CustomersScreen />;
  if (path === '/voice') {
    return (
      <Suspense fallback={<main className="mx-auto min-h-screen max-w-app bg-primary" />}>
        <VoiceScreen />
      </Suspense>
    );
  }
  if (path === '/today') return <TodayScreen />;
  if (path === '/today/sale') return <EntryScreen kind="cash_sale" />;
  if (path === '/today/kharcha') return <EntryScreen kind="kharcha" />;
  if (path === '/settings' && shop) return <SettingsScreen shop={shop} />;
  const pick = /^\/entry\/(diye|mile)$/.exec(path);
  if (pick) return <PickPartyScreen kind={pick[1] as 'diye' | 'mile'} />;
  const match = /^\/party\/([^/]+)(?:\/(diye|mile|remind))?$/.exec(path);
  if (match) {
    if (match[2] === 'remind') return <RemindScreen partyId={match[1]} />;
    return match[2] ? <EntryScreen partyId={match[1]} kind={match[2] as 'diye' | 'mile'} /> : <PartyScreen partyId={match[1]} />;
  }
  return <HomeScreen shopName={shop?.shop_name ?? t('appName')} />;
}
