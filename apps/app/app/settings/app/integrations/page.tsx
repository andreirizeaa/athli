'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@clerk/nextjs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { ConnectCalendarModal } from '@/app/calendar/components/connect-calendar-modal';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { calendarApi } from '@/lib/api/calendar-api';

type IntegrationProvider = 'google' | 'outlook';

interface Integration {
  id: IntegrationProvider;
  name: string;
  description: string;
  logo: string;
}

interface ComingSoonIntegration {
  id: string;
  name: string;
  description: string;
  logo: string;
}

const integrations: Integration[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Sync your Google Calendar events and manage appointments directly from OneNinety.',
    logo: '/icons/gmail.png',
  },
  {
    id: 'outlook',
    name: 'Outlook Calendar',
    description: 'Sync your Outlook Calendar events and manage appointments directly from OneNinety.',
    logo: '/icons/outlook.png',
  },
];

const comingSoonIntegrations: ComingSoonIntegration[] = [
  {
    id: 'docusign',
    name: 'Docusign',
    description: 'Streamline paperwork and document signing workflows directly from OneNinety.',
    logo: '/icons/docusign.png',
  },
  {
    id: 'vald',
    name: 'Vald',
    description: 'Measure an athlete\'s strength, power, movement, balance, asymmetry and more.',
    logo: '/icons/vald.png',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automate workflows and connect OneNinety with thousands of apps and services.',
    logo: '/icons/zapier.png',
  },
];

const IntegrationsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { getToken } = useAuth();
  const [connectedProviders, setConnectedProviders] = useState<IntegrationProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);

  useEffect(() => {
    const checkConnections = async () => {
      try {
        const token = await getToken();
        const response = await calendarApi.status(token);
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/sign-in');
            return;
          }
          setConnectedProviders([]);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        if (data.connected && data.provider) {
          setConnectedProviders([data.provider]);
        } else {
          setConnectedProviders([]);
        }
      } catch (error) {
        toast.error(t('settings.integrations.calendar.failedToCheckStatus'));
        setConnectedProviders([]);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnections();
  }, [router, t, getToken]);

  const handleDisconnect = async (provider: IntegrationProvider) => {
    try {
      const token = await getToken();
      const response = await calendarApi.disconnect(token);

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      setConnectedProviders((prev) => prev.filter((p) => p !== provider));
      toast.success(t('settings.integrations.disconnectedSuccessfully'));
    } catch (error) {
      toast.error(t('settings.integrations.disconnectFailed'));
    }
  };

  const handleConnect = (provider: IntegrationProvider) => {
    // Check if there's already a connected calendar
    if (connectedProviders.length > 0) {
      toast.error(t('settings.integrations.calendar.onlyOneActive'));
      return;
    }
    setSelectedProvider(provider);
    setConnectModalOpen(true);
  };

  const refreshConnections = async () => {
    try {
      const token = await getToken();
      const response = await calendarApi.status(token);
      if (response.ok) {
        const data = await response.json();
        if (data.connected && data.provider) {
          setConnectedProviders([data.provider]);
        } else {
          setConnectedProviders([]);
        }
      }
    } catch (error) {
      // Silently fail
    }
  };

  const connectedIntegrations = integrations.filter((integration) =>
    connectedProviders.includes(integration.id)
  );
  const availableIntegrations = integrations.filter(
    (integration) => !connectedProviders.includes(integration.id)
  );

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col overflow-auto">
        <div className="w-full relative bg-background flex-shrink-0">
          <div className="pl-4 pr-4 flex items-center justify-between">
            <h1 className="text-[22px] font-semibold mb-2 mt-2">
              {t('settings.sections.integrations')}
            </h1>
            <Button className="mb-2 mt-2 invisible" aria-hidden="true">
              {t('general.save')}
            </Button>
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
        <div className="w-full relative flex-1 bg-background flex flex-col items-center justify-center gap-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {t('settings.integrations.calendar.checkingConnection')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full relative bg-background">
        <div className="pl-4 pr-4 flex items-center justify-between">
          <h1 className="text-[22px] font-semibold mb-2 mt-2">
            {t('settings.sections.integrations')}
          </h1>
          <Button className="mb-2 mt-2 invisible" aria-hidden="true">
            {t('general.save')}
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto px-4 pt-4 pb-2 bg-background flex flex-col items-center gap-4">
        <Card className="bg-background max-w-3xl w-full">
          <CardHeader className="px-4">
            <CardTitle>
              {t('settings.integrations.connected.title')} ({connectedIntegrations.length})
            </CardTitle>
          </CardHeader>
          <Separator className="w-full mt-[-8px]" />
          <CardContent className="px-0">
            <div className="px-4 pb-2 pt-6">
              <div className="grid grid-cols-[1fr_auto] gap-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {t('settings.integrations.application')}
                </div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {t('settings.integrations.action')}
                </div>
              </div>
            </div>
            <Separator className="w-full" />
            <div className="w-full">
              {connectedIntegrations.length === 0 ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    {t('settings.integrations.noIntegrationsAvailable')}
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {connectedIntegrations.map((integration, index) => (
                    <div
                      key={integration.id}
                      className="border-b"
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-4 py-4 px-4 items-center">
                        <div className="flex items-center gap-3">
                          <Image
                            src={integration.logo}
                            alt={integration.name}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{integration.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {integration.description}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-primary dark:!border-primary"
                          onClick={() => handleDisconnect(integration.id)}
                          aria-label={`${t('settings.integrations.disconnect')} ${integration.name}`}
                        >
                          {t('settings.integrations.disconnect')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background max-w-3xl w-full">
          <CardHeader className="px-4">
            <CardTitle>
              {t('settings.integrations.available.title')} ({availableIntegrations.length})
            </CardTitle>
          </CardHeader>
          <Separator className="w-full mt-[-8px]" />
          <CardContent className="px-0">
            <div className="px-4 pb-2 pt-6">
              <div className="grid grid-cols-[1fr_auto] gap-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {t('settings.integrations.application')}
                </div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {t('settings.integrations.action')}
                </div>
              </div>
            </div>
            <Separator className="w-full" />
            <div className="w-full">
              {availableIntegrations.length === 0 ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    {t('settings.integrations.noIntegrationsAvailable')}
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {availableIntegrations.map((integration, index) => (
                    <div
                      key={integration.id}
                      className="border-b"
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-4 py-4 px-4 items-center">
                        <div className="flex items-center gap-3">
                          <Image
                            src={integration.logo}
                            alt={integration.name}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{integration.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {integration.description}
                            </span>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleConnect(integration.id)}
                          aria-label={`${t('settings.integrations.connect')} ${integration.name}`}
                        >
                          {t('settings.integrations.connect')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {comingSoonIntegrations.length > 0 && (
          <Card className="bg-background max-w-3xl w-full mb-12">
            <CardHeader className="px-4">
              <CardTitle>
                {t('settings.integrations.comingSoon.title')} ({comingSoonIntegrations.length})
              </CardTitle>
            </CardHeader>
            <Separator className="w-full mt-[-8px]" />
            <CardContent className="px-0">
              <div className="px-4 pb-2 pt-6">
                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {t('settings.integrations.application')}
                  </div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {t('settings.integrations.action')}
                  </div>
                </div>
              </div>
              <Separator className="w-full" />
              <div className="w-full">
                <div className="space-y-0">
                  {comingSoonIntegrations.map((integration, index) => (
                    <div
                      key={integration.id}
                      className="border-b"
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-4 py-4 px-4 items-center">
                        <div className="flex items-center gap-3">
                          <Image
                            src={integration.logo}
                            alt={integration.name}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{integration.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {integration.description}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          disabled
                          aria-label={`${integration.name} - ${t('settings.integrations.comingSoon.comingSoon')}`}
                        >
                          {t('settings.integrations.comingSoon.comingSoon')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <ConnectCalendarModal
        open={connectModalOpen}
        onOpenChange={async (open) => {
          setConnectModalOpen(open);
          if (!open) {
            setSelectedProvider(null);
            // Refresh connections when modal closes (in case connection was successful)
            await refreshConnections();
          }
        }}
        provider={selectedProvider}
      />
    </>
  );
};

export default IntegrationsPage;