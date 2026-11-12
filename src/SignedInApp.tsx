// Everything a logged-in person sees. It is loaded only after login (lazy), so the first
// screens (language, login) stay small and fast.
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ScreenHeader } from './components/ScreenHeader';
import { attachShop, currentUserId, isTesting, shopsRepo, sync, useLive, useRole } from './data';
import { TestBanner } from './components/TestBanner';
import { useT } from './i18n/i18n';
import { shopLanguage } from './i18n/translations';
import { goBack, usePath } from './lib/router';
import { AccessOffScreen } from './screens/AccessOffScreen';
import { AddPartyScreen } from './screens/AddPartyScreen';
import { StaffScreen } from './screens/StaffScreen';
import { canManageStaff } from './lib/permissions';
import { CustomersScreen } from './screens/CustomersScreen';
import { DoneScreen } from './screens/DoneScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { EditPartyScreen } from './screens/EditPartyScreen';
import { EntryScreen } from './screens/EntryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LinkPhoneScreen } from './screens/LinkPhoneScreen';
import { OldBalancesScreen } from './screens/OldBalancesScreen';
import { PartyScreen } from './screens/PartyScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { PickPartyScreen } from './screens/PickPartyScreen';
import { RestoreScreen } from './screens/RestoreScreen';
import { RemindScreen } from './screens/RemindScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ShopNameScreen } from './screens/ShopNameScreen';
import { TodayScreen } from './screens/TodayScreen';

// The voice screen (and the parser behind it) is loaded only when the mic is tapped
const VoiceScreen = lazy(() => import('./screens/VoiceScreen'));

// restoring -> (name -> done -> old (optional)) -> home.
// A person who already has a shop on this phone goes straight to home. A login with no shop on this
// phone first asks the internet: its khata may be there (new phone), and then it is brought back.
type Stage = 'restoring' | 'restoreFailed' | 'name' | 'done' | 'old' | 'home';

export default function SignedInApp() {
  const { t, lang } = useT();
  const testShopMade = useRef(false);
  const path = usePath();
  const found = useLive(async () => ({ shop: (await shopsRepo.getMine()) ?? null }), []);
  const [stage, setStage] = useState<Stage | null>(null);
  const [attachedShop, setAttachedShop] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const role = useRole();

  useEffect(() => {
    if (!found) return;
    if (found.shop) {
      attachShop(found.shop.id);
      setAttachedShop(found.shop.id);
    }
    // Decided once, when we first learn whether this person already has a shop here
    setStage((current) => {
      if (found.shop) return current === null || current === 'restoring' || current === 'restoreFailed' ? 'home' : current;
      return current ?? 'restoring';
    });
  }, [found]);

  // No shop on this phone: look on the internet before asking for a shop name
  useEffect(() => {
    if (stage !== 'restoring') return;
    // Testing mode: no internet and no questions, a test shop is made at once
    if (isTesting()) {
      if (!testShopMade.current) {
        testShopMade.current = true;
        void shopsRepo.create({ shop_name: t('testShopName'), language: shopLanguage(lang) });
      }
      return;
    }
    let alive = true;
    void sync.restore().then((result) => {
      if (!alive) return;
      if (result === 'none') setStage('name');
      else if (result !== 'restored') setStage('restoreFailed'); // 'restored': the shop appears and the effect above moves on
    });
    return () => {
      alive = false;
    };
  }, [stage, attempt]);

  // Keep the khata backed up while the app is open
  useEffect(() => {
    if (!attachedShop) return;
    return sync.start();
  }, [attachedShop]);

  const shop = found?.shop;

  if (stage === 'restoring' || stage === 'restoreFailed') {
    return (
      <RestoreScreen
        failed={stage === 'restoreFailed'}
        onRetry={() => {
          setStage('restoring');
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (stage === null || (stage !== 'name' && (!shop || attachedShop !== shop.id))) {
    return (
      <main className="mx-auto min-h-screen max-w-app">
        <ScreenHeader title={t('appName')} subtitle={t('tagline')} />
      </main>
    );
  }

  if (role === 'revoked') return <AccessOffScreen />; // the owner switched this login off
  if (stage === 'name') return <ShopNameScreen onCreated={() => setStage('done')} />;
  if (stage === 'done') return <DoneScreen shopName={shop?.shop_name ?? ''} onOld={() => setStage('old')} onSkip={() => setStage('home')} />;
  if (stage === 'old') return <OldBalancesScreen onFinish={() => setStage('home')} />;

  // Home and the customer screens, chosen by the page address. A new screen fades in softly (150 ms,
  // opacity only, so the bars fixed to the bottom do not move; off for "reduce motion").
  const screen = (() => {
  if (path === '/party/new') return <AddPartyScreen />;
  if (path === '/customers') return <CustomersScreen />;
  if (path === '/voice') {
    return (
      <Suspense fallback={<main className="mx-auto min-h-screen max-w-app bg-primary" />}>
        <VoiceScreen />
      </Suspense>
    );
  }
  if (path === '/feedback') return <FeedbackScreen />;
  if (path === '/privacy') return <PrivacyScreen onBack={() => goBack('/settings')} />;
  if (path === '/today') return <TodayScreen />;
  if (path === '/today/sale') return <EntryScreen kind="cash_sale" />;
  if (path === '/today/kharcha') return <EntryScreen kind="kharcha" />;
  if (path === '/settings' && shop) return <SettingsScreen shop={shop} />;
  if (path === '/settings/staff' && shop && role && canManageStaff(role)) return <StaffScreen shopId={shop.id} userId={currentUserId()} />;
  const pick = /^\/entry\/(diye|mile)$/.exec(path);
  if (pick) return <PickPartyScreen kind={pick[1] as 'diye' | 'mile'} />;
  const match = /^\/party\/([^/]+)(?:\/(diye|mile|remind|edit|link))?$/.exec(path);
  if (match) {
    if (match[2] === 'remind') return <RemindScreen partyId={match[1]} />;
    if (match[2] === 'link') return <LinkPhoneScreen partyId={match[1]} />;
    if (match[2] === 'edit') return <EditPartyScreen partyId={match[1]} />;
    return match[2] ? <EntryScreen partyId={match[1]} kind={match[2] as 'diye' | 'mile'} /> : <PartyScreen partyId={match[1]} />;
  }
  return <HomeScreen shopName={shop?.shop_name ?? t('appName')} />;
  })();
  return (
    <>
      <TestBanner />
      <div key={path} className="animate-fade">
        {screen}
      </div>
    </>
  );
}
