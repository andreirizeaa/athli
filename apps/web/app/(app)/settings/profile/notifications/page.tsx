'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useGlobalData } from '@/providers/global-data-provider';
import { useUnsavedChanges } from '@/app/(app)/settings/context/unsaved-changes-context';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { type NotificationPreference } from '@/api/settings/coach/coach-notifications-service';

interface NotificationGroup {
  id: string;
  titleKey: string;
  descriptionKey: string;
  types: Array<{
    type: string;
    labelKey: string;
  }>;
}

const notificationGroups: NotificationGroup[] = [
  {
    id: 'training',
    titleKey: 'settings.notifications.training.title',
    descriptionKey: 'settings.notifications.training.description',
    types: [
      { type: 'workout_completed', labelKey: 'settings.notifications.training.options.workoutCompleted' },
      { type: 'workout_missed', labelKey: 'settings.notifications.training.options.workoutMissed' },
    ],
  },
  {
    id: 'forms',
    titleKey: 'settings.notifications.forms.title',
    descriptionKey: 'settings.notifications.forms.description',
    types: [
      { type: 'checkin_completed', labelKey: 'settings.notifications.forms.options.checkinCompleted' },
      { type: 'questionnaire_completed', labelKey: 'settings.notifications.forms.options.questionnaireCompleted' },
    ],
  },
  {
    id: 'tracking',
    titleKey: 'settings.notifications.tracking.title',
    descriptionKey: 'settings.notifications.tracking.description',
    types: [
      { type: 'metric_logged', labelKey: 'settings.notifications.tracking.options.metricLogged' },
      { type: 'habit_logged', labelKey: 'settings.notifications.tracking.options.habitLogged' },
      { type: 'photo_uploaded', labelKey: 'settings.notifications.tracking.options.photoUploaded' },
    ],
  },
  {
    id: 'profile',
    titleKey: 'settings.notifications.profile.title',
    descriptionKey: 'settings.notifications.profile.description',
    types: [
      { type: 'client_connected', labelKey: 'settings.notifications.profile.options.clientConnected' },
      { type: 'goal_added', labelKey: 'settings.notifications.profile.options.goalAdded' },
      { type: 'goal_edited', labelKey: 'settings.notifications.profile.options.goalEdited' },
      { type: 'goal_deleted', labelKey: 'settings.notifications.profile.options.goalDeleted' },
      { type: 'injury_added', labelKey: 'settings.notifications.profile.options.injuryAdded' },
      { type: 'injury_edited', labelKey: 'settings.notifications.profile.options.injuryEdited' },
      { type: 'injury_deleted', labelKey: 'settings.notifications.profile.options.injuryDeleted' },
    ],
  },
];

type PrefsState = Record<string, { in_app: boolean; push: boolean }>;

const NotificationsPage = () => {
  const t = useTranslations();
  const { setHasUnsavedChanges: setContextHasUnsavedChanges } = useUnsavedChanges();
  const { notificationPreferences, batchUpdateNotificationPreferences, isLoading } = useGlobalData();

  const [prefs, setPrefs] = useState<PrefsState>({});
  const [savedPrefs, setSavedPrefs] = useState<PrefsState>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const skipNextSyncRef = useRef(false);

  // Initialize from global data — skip while saving and skip stale sync after save
  useEffect(() => {
    if (isSaving) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    if (notificationPreferences && notificationPreferences.length > 0) {
      const state: PrefsState = {};
      notificationPreferences.forEach((p: NotificationPreference) => {
        state[p.notification_type] = {
          in_app: p.in_app_enabled,
          push: p.push_enabled,
        };
      });
      setPrefs(state);
      setSavedPrefs(state);
    }
  }, [notificationPreferences, isSaving]);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = Object.keys(prefs).some(
      key => prefs[key]?.in_app !== savedPrefs[key]?.in_app || prefs[key]?.push !== savedPrefs[key]?.push
    );
    setHasUnsavedChanges(hasChanges);
    setContextHasUnsavedChanges(hasChanges);
  }, [prefs, savedPrefs, setContextHasUnsavedChanges]);

  // Handle browser navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleToggle = useCallback((type: string, channel: 'in_app' | 'push', checked: boolean) => {
    setPrefs(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: checked,
      },
    }));
  }, []);

  const allTypes = notificationGroups.flatMap(g => g.types.map(t => t.type));

  const handleTurnOffAll = useCallback((channel: 'in_app' | 'push', checked: boolean) => {
    setPrefs(prev => {
      const next = { ...prev };
      for (const type of allTypes) {
        const existing = next[type] || { in_app: true, push: true };
        next[type] = { ...existing, [channel]: !checked };
      }
      return next;
    });
  }, [allTypes]);

  // Derived: are ALL currently off for each channel?
  const allInAppOff = Object.keys(prefs).length > 0 && Object.values(prefs).every(p => !p.in_app);
  const allPushOff = Object.keys(prefs).length > 0 && Object.values(prefs).every(p => !p.push);

  const handleSave = async () => {
    setIsSaving(true);
    // Snapshot what we're saving so the UI stays stable
    const prefsSnapshot = { ...prefs };
    try {
      const changed: Array<{ notificationType: string; inAppEnabled: boolean; pushEnabled: boolean }> = [];

      for (const type of Object.keys(prefsSnapshot)) {
        const current = prefsSnapshot[type];
        const saved = savedPrefs[type];
        if (!saved || current.in_app !== saved.in_app || current.push !== saved.push) {
          changed.push({
            notificationType: type,
            inAppEnabled: current.in_app,
            pushEnabled: current.push,
          });
        }
      }

      if (changed.length > 0) {
        await batchUpdateNotificationPreferences(changed);
      }
      // Update saved state to match what we just saved
      setSavedPrefs(prefsSnapshot);
      setPrefs(prefsSnapshot);
      setHasUnsavedChanges(false);
      setContextHasUnsavedChanges(false);
      toast.success(t('settings.notifications.savedSuccessfully'));
    } catch (error) {
      toast.error(t('settings.notifications.saveFailed'));
    } finally {
      // Skip the next useEffect sync — it would run with stale React Query data
      // before the refetch resolves. The subsequent refetch will trigger a clean sync.
      skipNextSyncRef.current = true;
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="w-full relative bg-background">
        <div className="pl-4 pr-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">
            {t('settings.sections.notifications')}
          </h1>
          <Button
            className="mb-2 mt-2 min-w-[70px]"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : t('general.save')}
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-background flex flex-col items-center gap-4">
        {notificationGroups.map((group) => (
          <Card key={group.id} className="bg-background max-w-3xl w-full">
            <CardHeader className="px-4">
              <CardTitle>{t(group.titleKey)}</CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-4">
              <p className="text-sm text-muted-foreground">
                {t(group.descriptionKey)}
              </p>
            </CardContent>
            {/* Column headers */}
            <div className="px-4">
              <div className="flex justify-end gap-6">
                <div className="text-xs font-semibold uppercase text-muted-foreground w-[60px] text-center">
                  {t('settings.notifications.inApp')}
                </div>
                <div className="text-xs font-semibold uppercase text-muted-foreground w-[60px] text-center">
                  {t('settings.notifications.push')}
                </div>
              </div>
            </div>
            <Separator className="w-full" />
            <div className="w-full">
              <div className="space-y-0">
                {group.types.map((option, optionIndex) => {
                  const isLast = optionIndex === group.types.length - 1;
                  const pref = prefs[option.type];
                  return (
                    <div
                      key={option.type}
                      className={`grid grid-cols-[1fr_auto] gap-4 ${optionIndex === 0
                        ? 'pb-2 pt-[-1px] px-4 border-b items-center'
                        : isLast
                          ? 'pt-2 px-4 items-center'
                          : 'py-2 px-4 border-b items-center'
                        }`}
                    >
                      <label className="text-sm cursor-pointer">
                        {t(option.labelKey)}
                      </label>
                      <div className="flex gap-6">
                        <div className="w-[60px] flex justify-center">
                          <Checkbox
                            id={`${option.type}-in-app`}
                            checked={pref?.in_app ?? true}
                            onCheckedChange={(checked) =>
                              handleToggle(option.type, 'in_app', checked === true)
                            }
                            className="size-5 rounded-[5px]"
                            aria-label={`${t(option.labelKey)} - ${t('settings.notifications.inApp')}`}
                          />
                        </div>
                        <div className="w-[60px] flex justify-center">
                          <Checkbox
                            id={`${option.type}-push`}
                            checked={pref?.push ?? true}
                            onCheckedChange={(checked) =>
                              handleToggle(option.type, 'push', checked === true)
                            }
                            className="size-5 rounded-[5px]"
                            aria-label={`${t(option.labelKey)} - ${t('settings.notifications.push')}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
        {/* Turn off all */}
        <Card className="bg-background max-w-3xl w-full">
          <CardHeader className="px-4">
            <CardTitle>{t('settings.notifications.bulkActions')}</CardTitle>
          </CardHeader>
          <Separator className="w-full mt-[-8px]" />
          {/* Column headers */}
          <div className="px-4">
            <div className="flex justify-end gap-6">
              <div className="text-xs font-semibold uppercase text-muted-foreground w-[60px] text-center">
                {t('settings.notifications.inApp')}
              </div>
              <div className="text-xs font-semibold uppercase text-muted-foreground w-[60px] text-center">
                {t('settings.notifications.push')}
              </div>
            </div>
          </div>
          <Separator className="w-full" />
          <div className="w-full">
            <div className="grid grid-cols-[1fr_auto] gap-4 py-2 px-4 items-center">
              <label className="text-sm cursor-pointer">
                {t('settings.notifications.turnOffAll')}
              </label>
              <div className="flex gap-6">
                <div className="w-[60px] flex justify-center">
                  <Checkbox
                    id="turn-off-all-in-app"
                    checked={allInAppOff}
                    onCheckedChange={(checked) => handleTurnOffAll('in_app', checked === true)}
                    className="size-5 rounded-[5px]"
                    aria-label={`${t('settings.notifications.turnOffAll')} - ${t('settings.notifications.inApp')}`}
                  />
                </div>
                <div className="w-[60px] flex justify-center">
                  <Checkbox
                    id="turn-off-all-push"
                    checked={allPushOff}
                    onCheckedChange={(checked) => handleTurnOffAll('push', checked === true)}
                    className="size-5 rounded-[5px]"
                    aria-label={`${t('settings.notifications.turnOffAll')} - ${t('settings.notifications.push')}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default NotificationsPage;
