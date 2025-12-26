'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { type NotificationSettings } from '@/api/settings/settings-service'; // Keep for legacy types if needed, or remove? let's keep NotificationSettings or map it.
// Actually, let's import NotificationEvent from service
import { type NotificationEvent } from '@/api/settings/coach/coach-notifications-service';
import { useGlobalData } from '@/providers/global-data-provider';
import { useUnsavedChanges } from '@/app/settings/context/unsaved-changes-context';
import { toast } from 'sonner';

type NotificationKey =
  | 'newClientSignup'
  | 'clientActivity'
  | 'clientMessages'
  | 'preAppointmentInformation'
  | 'systemDowntimes'
  | 'newFeatures';

interface NotificationGroup {
  id: 'clients' | 'system';
  titleKey: string;
  descriptionKey: string;
  emailKey: string;
  options: Array<{
    id: NotificationKey;
    labelKey: string;
  }>;
}

const UI_TO_DB_KEY: Record<NotificationKey, string> = {
  newClientSignup: 'new_client_signup',
  clientActivity: 'client_activity',
  clientMessages: 'client_messages',
  preAppointmentInformation: 'pre_appointment_info',
  systemDowntimes: 'system_downtime',
  newFeatures: 'new_features',
};

const DB_TO_UI_KEY: Record<string, NotificationKey> = {
  new_client_signup: 'newClientSignup',
  client_activity: 'clientActivity',
  client_messages: 'clientMessages',
  pre_appointment_info: 'preAppointmentInformation',
  system_downtime: 'systemDowntimes',
  new_features: 'newFeatures',
};

const NotificationsPage = () => {
  const t = useTranslations();
  const { setHasUnsavedChanges: setContextHasUnsavedChanges } = useUnsavedChanges();
  const { notifications: globalNotifications, toggleNotification, isLoading } = useGlobalData();

  const [notifications, setNotifications] = useState<Record<NotificationKey, boolean>>({
    newClientSignup: false,
    clientActivity: false,
    clientMessages: false,
    preAppointmentInformation: false,
    systemDowntimes: false,
    newFeatures: false,
  });
  const [savedNotifications, setSavedNotifications] = useState<Record<NotificationKey, boolean>>({
    newClientSignup: false,
    clientActivity: false,
    clientMessages: false,
    preAppointmentInformation: false,
    systemDowntimes: false,
    newFeatures: false,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize from global data
  useEffect(() => {
    if (globalNotifications && globalNotifications.length > 0) {
      const newNotifications: Record<NotificationKey, boolean> = {
        newClientSignup: false,
        clientActivity: false,
        clientMessages: false,
        preAppointmentInformation: false,
        systemDowntimes: false,
        newFeatures: false,
      };

      globalNotifications.forEach(n => {
        const uiKey = DB_TO_UI_KEY[n.event_key];
        if (uiKey) {
          newNotifications[uiKey] = n.enabled;
        }
      });

      setNotifications(newNotifications);
      setSavedNotifications(newNotifications);
    }
  }, [globalNotifications]);

  const notificationGroups: NotificationGroup[] = [
    {
      id: 'clients',
      titleKey: 'settings.notifications.clients.title',
      descriptionKey: 'settings.notifications.clients.description',
      emailKey: 'settings.notifications.clients.email',
      options: [
        {
          id: 'newClientSignup',
          labelKey: 'settings.notifications.clients.options.newClientSignup.label',
        },
        {
          id: 'clientActivity',
          labelKey: 'settings.notifications.clients.options.clientActivity.label',
        },
        {
          id: 'clientMessages',
          labelKey: 'settings.notifications.clients.options.clientMessages.label',
        },
        {
          id: 'preAppointmentInformation',
          labelKey: 'settings.notifications.clients.options.preAppointmentInformation.label',
        },
      ],
    },
    {
      id: 'system',
      titleKey: 'settings.notifications.system.title',
      descriptionKey: 'settings.notifications.system.description',
      emailKey: 'settings.notifications.system.email',
      options: [
        {
          id: 'systemDowntimes',
          labelKey: 'settings.notifications.system.options.systemDowntimes.label',
        },
        {
          id: 'newFeatures',
          labelKey: 'settings.notifications.system.options.newFeatures.label',
        },
      ],
    },
  ];

  // Check if there are unsaved changes
  useEffect(() => {
    // Basic shallow comparison
    const hasChanges = Object.keys(notifications).some(
      key => notifications[key as NotificationKey] !== savedNotifications[key as NotificationKey]
    );

    setHasUnsavedChanges(hasChanges);
    setContextHasUnsavedChanges(hasChanges);
  }, [notifications, savedNotifications, setContextHasUnsavedChanges]);

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

  const handleNotificationChange = (key: NotificationKey, checked: boolean) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Find changes and update
      const promises: Promise<void>[] = [];
      const keys = Object.keys(notifications) as NotificationKey[];

      for (const key of keys) {
        if (notifications[key] !== savedNotifications[key]) {
          // Find ID from globalNotifications
          const dbKey = UI_TO_DB_KEY[key];
          const notification = globalNotifications?.find(n => n.event_key === dbKey);
          if (notification) {
            promises.push(toggleNotification({ eventId: notification.event_id, enabled: notifications[key] }));
          }
        }
      }

      await Promise.all(promises);

      setSavedNotifications(notifications);
      setHasUnsavedChanges(false);
      setContextHasUnsavedChanges(false);
      toast.success(t('settings.notifications.savedSuccessfully'));
    } catch (error) {
      toast.error(t('settings.notifications.saveFailed'));
    } finally {
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
            className="mb-2 mt-2"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving ? t('general.saving') : t('general.save')}
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-background flex flex-col items-center gap-4">
        {notificationGroups.map((group, groupIndex) => (
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
            <div className="px-4">
              <div className="flex justify-end">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {t(group.emailKey)}
                </div>
              </div>
            </div>
            <Separator className="w-full" />
            <div className="w-full">
              <div className="space-y-0">
                {group.options.map((option, optionIndex) => {
                  const isLast = optionIndex === group.options.length - 1;
                  return (
                    <div
                      key={option.id}
                      className={`grid grid-cols-[1fr_auto] gap-4 ${optionIndex === 0
                        ? 'pb-2 pt-[-1px] px-4 border-b items-center'
                        : isLast
                          ? 'pt-2 px-4 items-center'
                          : 'py-2 px-4 border-b items-center'
                        }`}
                    >
                      <label
                        htmlFor={option.id}
                        className="text-sm cursor-pointer"
                      >
                        {t(option.labelKey)}
                      </label>
                      <Checkbox
                        id={option.id}
                        checked={notifications[option.id]}
                        onCheckedChange={(checked) =>
                          handleNotificationChange(option.id, checked === true)
                        }
                        aria-label={t(option.labelKey)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
};

export default NotificationsPage;
