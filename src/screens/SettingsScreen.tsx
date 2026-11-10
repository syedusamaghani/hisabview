import { useState } from 'react';
import { SyncBadge } from '../components/SyncBadge';
import { BigButton } from '../components/BigButton';
import { BottomNav } from '../components/BottomNav';
import { Card } from '../components/Card';
import { ChoiceCard } from '../components/ChoiceCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { SwitchRow } from '../components/SwitchRow';
import { TextField } from '../components/TextField';
import { describeSync, shopsRepo, sync, useSyncState, type Shop } from '../data';
import { useT } from '../i18n/i18n';
import { shopLanguage, type Lang } from '../i18n/translations';
import { formatDay, formatTime } from '../lib/dates';
import { APP_VERSION } from '../lib/report';
import { navigate } from '../lib/router';
import { installAskLater, promptInstall, useInstall } from '../lib/install';
import { useAuth } from '../state/auth';
import { clearAliases, countAliases } from '../voice/aliasStore';
import { usePrivacy } from '../state/privacy';

// Settings: language, hide amounts, shop name, logout.
export function SettingsScreen({ shop }: { shop: Shop }) {
  const { t, lang, setLang } = useT();
  const { hidden, toggle } = usePrivacy();
  const { signOut, email } = useAuth();
  const syncState = useSyncState();
  const install = useInstall();
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(shop.shop_name);
  const [failed, setFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [learned, setLearned] = useState(() => countAliases()); // wrong spellings the voice reader learned from corrections

  const chooseLang = (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    void shopsRepo.update(shop.id, { language: shopLanguage(next) }); // remembered with the shop, and audited
  };

  // "Abhi save karo": send everything now and also check for changes from another phone
  const saveNow = async () => {
    setSyncing(true);
    await sync.syncNow({ pull: true });
    setSyncing(false);
  };

  const saveName = async () => {
    setFailed(false);
    try {
      await shopsRepo.update(shop.id, { shop_name: name });
      setEditing(false);
    } catch {
      setFailed(true);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-app pb-[calc(var(--bar-h)+24px)]">
      <ScreenHeader title={t('navSettings')} />

      <div className="flex flex-col gap-4 px-gutter pt-4">
        <Card className="flex flex-col gap-3">
          <h2 className="text-label font-bold text-inkSoft">{t('langSection')}</h2>
          <div role="radiogroup" aria-label={t('langSection')} className="flex flex-col gap-3">
            <ChoiceCard title={t('langRo')} selected={lang === 'ro'} onSelect={() => chooseLang('ro')} className="!min-h-tap" />
            <ChoiceCard title={t('langEn')} selected={lang === 'en'} onSelect={() => chooseLang('en')} className="!min-h-tap" />
            <ChoiceCard title={t('langUr')} selected={lang === 'ur'} onSelect={() => chooseLang('ur')} className="!min-h-tap font-urdu !text-title" />
          </div>
        </Card>

        <Card>
          <SwitchRow label={t('hideAmounts')} checked={hidden} onChange={toggle} />
        </Card>

        <Card className="flex flex-col gap-3">
          {editing ? (
            <>
              <TextField label={t('shopNameLabel')} value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
              {failed && <p role="alert" className="text-body font-bold">{t('errorGeneric')}</p>}
              <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                <BigButton variant="ghost" onClick={() => { setEditing(false); setName(shop.shop_name); setFailed(false); }}>{t('cancelEdit')}</BigButton>
                <BigButton onClick={saveName} disabled={name.trim().length === 0}>{t('save')}</BigButton>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-label font-bold text-inkSoft">{t('shopNameLabel')}</p>
                <p dir="auto" className="text-title font-extrabold text-ink">{shop.shop_name}</p>
              </div>
              <BigButton full variant="ghost" icon="edit" onClick={() => setEditing(true)}>{t('badlo')}</BigButton>
            </>
          )}
        </Card>

        {learned > 0 && (
          <Card className="flex flex-col gap-3">
            <h2 className="text-body font-extrabold text-ink">{t('learnedTitle')}</h2>
            <p className="text-label text-inkSoft">{t('learnedBody').replace('{n}', String(learned))}</p>
            <BigButton
              full
              variant="ghost"
              onClick={() => {
                clearAliases();
                setLearned(0);
              }}
            >
              {t('learnedClear')}
            </BigButton>
          </Card>
        )}

        <Card className="flex flex-col gap-3">
          <h2 className="text-body font-extrabold text-ink">{t('backupTitle')}</h2>
          <SyncBadge className="!text-inkSoft" />
          <p className="text-label text-inkSoft">{t('backupBody')}</p>
          {email && (
            <p className="text-label text-inkSoft">
              {t('backupAccount')}: <bdi className="font-bold text-ink">{email}</bdi>
            </p>
          )}
          <p className="text-label text-inkSoft">
            {syncState.lastSyncAt ? (
              <>
                {t('backupLast').split('{when}')[0]}
                <bdi>{formatDay(syncState.lastSyncAt, lang)}</bdi> <bdi>{formatTime(syncState.lastSyncAt, lang)}</bdi>
                {t('backupLast').split('{when}')[1]}
              </>
            ) : (
              t('backupNever')
            )}
          </p>
          {syncState.pending > 0 && <p className="text-label font-bold text-ink">{t('backupPending').replace('{n}', String(syncState.pending))}</p>}
          {describeSync(syncState) === 'problem' && <p role="alert" className="text-label font-bold text-ink">{t('backupProblem')}</p>}
          <BigButton full variant="ghost" icon="cloud" disabled={syncing} onClick={saveNow}>{t('backupNow')}</BigButton>
        </Card>

        {install.canPrompt && (
          <BigButton
            full
            variant="ghost"
            icon="plus"
            onClick={async () => {
              if ((await promptInstall()) === 'dismissed') installAskLater();
            }}
          >
            {t('installSettings')}
          </BigButton>
        )}

        <BigButton full variant="ghost" icon="chat" onClick={() => navigate('/feedback')}>{t('feedbackTitle')}</BigButton>
        <button
          type="button"
          onClick={() => navigate('/privacy')}
          className="min-h-tap rounded-button text-body font-bold text-primary underline focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-accent"
        >
          {t('privacyLink')}
        </button>

        {loggingOut ? (
          <Card tone="soft" className="flex flex-col gap-3">
            <p className="text-body font-bold">{t('logoutAsk')}</p>
            <BigButton full onClick={signOut}>{t('yesLogout')}</BigButton>
            <BigButton full variant="ghost" onClick={() => setLoggingOut(false)}>{t('no')}</BigButton>
          </Card>
        ) : (
          <BigButton full variant="ghost" onClick={() => setLoggingOut(true)}>{t('logout')}</BigButton>
        )}
        <p className="text-center text-caption text-inkSoft">
          {t('versionLabel')} <bdi>{APP_VERSION}</bdi>
        </p>
      </div>

      <BottomNav active="settings" />
    </main>
  );
}
