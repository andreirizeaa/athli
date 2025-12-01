'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const NotificationsPage = () => {
  const t = useTranslations();
  const [notifications, setNotifications] = useState({
    newClientSignup: false,
    clientActivity: false,
    clientMessages: false,
    preAppointmentInformation: false,
    systemDowntimes: false,
    newFeatures: false,
  });

  const handleNotificationChange = (key: keyof typeof notifications, checked: boolean) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  return (
    <>
      <div className="w-full relative bg-background">
        <div className="pl-4 pr-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">
            {t('settings.sections.notifications')}
          </h1>
          <Button className="mb-2 mt-2">
            {t('general.save')}
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-secondary flex flex-col items-center gap-4">
        <Card className="bg-background max-w-3xl w-full">
          <CardHeader>
            <CardTitle>{t('settings.notifications.clients.title')}</CardTitle>
          </CardHeader>
          <Separator className="w-full mt-[-8px]" />
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('settings.notifications.clients.description')}
            </p>
          </CardContent>
          <div className="px-4">
            <div className="flex justify-end">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {t('settings.notifications.clients.email')}
              </div>
            </div>
          </div>
          <Separator className="w-full" />
          <div className="w-full">
            <div className="space-y-0">
              <div className="grid grid-cols-[1fr_auto] gap-4 pb-2 pt-[-1px] px-6 border-b items-center">
                <label
                  htmlFor="newClientSignup"
                  className="text-sm cursor-pointer"
                >
                  {t('settings.notifications.clients.options.newClientSignup.label')}
                </label>
                <Checkbox
                  id="newClientSignup"
                  checked={notifications.newClientSignup}
                  onCheckedChange={(checked) =>
                    handleNotificationChange('newClientSignup', checked === true)
                  }
                  aria-label={t('settings.notifications.clients.options.newClientSignup.label')}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 py-2 px-6 border-b items-center">
                <label
                  htmlFor="clientActivity"
                  className="text-sm cursor-pointer"
                >
                  {t('settings.notifications.clients.options.clientActivity.label')}
                </label>
                <Checkbox
                  id="clientActivity"
                  checked={notifications.clientActivity}
                  onCheckedChange={(checked) =>
                    handleNotificationChange('clientActivity', checked === true)
                  }
                  aria-label={t('settings.notifications.clients.options.clientActivity.label')}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 py-2 px-6 border-b items-center">
                <label
                  htmlFor="clientMessages"
                  className="text-sm cursor-pointer"
                >
                  {t('settings.notifications.clients.options.clientMessages.label')}
                </label>
                <Checkbox
                  id="clientMessages"
                  checked={notifications.clientMessages}
                  onCheckedChange={(checked) =>
                    handleNotificationChange('clientMessages', checked === true)
                  }
                  aria-label={t('settings.notifications.clients.options.clientMessages.label')}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 px-6 items-center">
                <label
                  htmlFor="preAppointmentInformation"
                  className="text-sm cursor-pointer"
                >
                  {t('settings.notifications.clients.options.preAppointmentInformation.label')}
                </label>
                <Checkbox
                  id="preAppointmentInformation"
                  checked={notifications.preAppointmentInformation}
                  onCheckedChange={(checked) =>
                    handleNotificationChange('preAppointmentInformation', checked === true)
                  }
                  aria-label={t('settings.notifications.clients.options.preAppointmentInformation.label')}
                />
              </div>
            </div>
          </div>
        </Card>
        <Card className="bg-background max-w-3xl w-full">
          <CardHeader>
            <CardTitle>{t('settings.notifications.system.title')}</CardTitle>
          </CardHeader>
          <Separator className="w-full mt-[-8px]" />
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('settings.notifications.system.description')}
            </p>
          </CardContent>
          <div className="px-4">
            <div className="flex justify-end">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {t('settings.notifications.system.email')}
              </div>
            </div>
          </div>
          <Separator className="w-full" />
          <div className="w-full">
            <div className="space-y-0">
              <div className="grid grid-cols-[1fr_auto] gap-4 pb-2 pt-[-1px] px-6 border-b items-center">
                <label
                  htmlFor="systemDowntimes"
                  className="text-sm cursor-pointer"
                >
                  {t('settings.notifications.system.options.systemDowntimes.label')}
                </label>
                <Checkbox
                  id="systemDowntimes"
                  checked={notifications.systemDowntimes}
                  onCheckedChange={(checked) =>
                    handleNotificationChange('systemDowntimes', checked === true)
                  }
                  aria-label={t('settings.notifications.system.options.systemDowntimes.label')}
                />
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-4 pt-2 px-6 items-center">
                <label
                  htmlFor="newFeatures"
                  className="text-sm cursor-pointer"
                >
                  {t('settings.notifications.system.options.newFeatures.label')}
                </label>
                <Checkbox
                  id="newFeatures"
                  checked={notifications.newFeatures}
                  onCheckedChange={(checked) =>
                    handleNotificationChange('newFeatures', checked === true)
                  }
                  aria-label={t('settings.notifications.system.options.newFeatures.label')}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default NotificationsPage;

