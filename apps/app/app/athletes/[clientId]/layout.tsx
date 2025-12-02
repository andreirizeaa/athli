'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PageTabs } from '@/components/page-tabs';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Archive, ChevronRight, MessageCircle, Users, X } from 'lucide-react';
import { mockAthletes } from '@/components/app/app-shell';
import { archiveUser } from '@/lib/athletes/athlete-service';

type ClientProfileLayoutProps = {
  children: React.ReactNode;
};

const ClientProfileLayout = ({ children }: ClientProfileLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;

  const athlete = mockAthletes.find((item) => item.id === clientId);

  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  const tabs = [
    {
      value: 'overview',
      label: t('athletes.profile.overview'),
    },
    {
      value: 'metrics',
      label: t('athletes.profile.metrics'),
    },
    {
      value: 'appointment-sessions',
      label: t('athletes.profile.bookings'),
    },
    {
      value: 'training-calendar',
      label: t('athletes.profile.trainingCalendar'),
    },
    {
      value: 'app-settings',
      label: t('athletes.profile.appSettings'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  const lastSegment = segments[segments.length - 1];
  const activeTab = lastSegment && validTabValues.includes(lastSegment) ? lastSegment : 'overview';

  const handleTabChange = (value: string) => {
    if (!clientId) {
      return;
    }

    if (value === activeTab) {
      return;
    }

    router.push(`/athletes/${clientId}/${value}`);
  };

  const handleNavigateToAthletes = () => {
    router.push('/athletes');
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    handleNavigateToAthletes();
  };

  const handleNavigateToMessages = (athleteId: string) => {
    router.push(`/messaging/${athleteId}`);
  };

  const handleArchive = async () => {
    if (!clientId) return;
    
    try {
      await archiveUser(clientId);
      setIsArchiveModalOpen(false);
      toast.success(t('athletes.profile.archivedSuccessfully'), {
        style: {
          background: 'rgb(220 252 231)',
          color: 'rgb(20 83 45)',
          border: '1px solid rgb(187 247 208)',
        },
      });
      handleNavigateToAthletes();
    } catch (error) {
      toast.error(t('athletes.profile.failedToArchive'), {
        style: {
          background: 'rgb(254 242 242)',
          color: 'rgb(153 27 27)',
          border: '1px solid rgb(254 202 202)',
        },
      });
    }
  };

  const handleCancelArchive = () => {
    setIsArchiveModalOpen(false);
  };

  if (!athlete) {
    return (
      <div className="h-full w-full flex flex-col">
        <div className="w-full relative">
          <div className="px-4 flex items-center justify-between mb-2 mt-2">
            <h1 className="text-[22px] font-semibold">{t('athletes.profile.clientNotFound')}</h1>
            <Button
              onClick={handleNavigateToAthletes}
              className="gap-2"
              aria-label={t('athletes.profile.viewAllClients')}
            >
              <Users className="size-4" />
              <span>{t('athletes.profile.allClients')}</span>
            </Button>
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
        <div className="w-full flex-1 overflow-auto px-4 py-4 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('athletes.profile.clientNotFoundDescription')}</p>
        </div>
      </div>
    );
  }

  const initials = athlete.name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const firstName = athlete.name.split(' ')[0];

  return (
    <div className="h-full w-full flex flex-col">
      <div className="w-full relative">
        <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={handleNavigateToAthletes}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  {t('athletes.profile.athletes')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronRight className="h-2 w-2" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                  {athlete.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={athlete.avatar} alt={athlete.name} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <h1 className="text-[22px] font-semibold">{athlete.name}</h1>
            </div>
          </div>
        </div>
        <div className="absolute top-2 right-4 flex items-center gap-2">
          <Button
            onClick={() => handleNavigateToMessages(clientId)}
            variant="secondary"
            className="gap-2"
            aria-label={t('athletes.profile.messageAria')}
          >
            <MessageCircle className="size-4" />
            <span>{t('athletes.profile.message')}</span>
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="gap-2"
            aria-label={t('athletes.profile.archiveAria')}
            onClick={() => setIsArchiveModalOpen(true)}
          >
            <Archive className="size-4" />
          </Button>
        </div>
        <div className="px-4">
          <PageTabs
            tabs={tabs}
            value={activeTab}
            onValueChange={handleTabChange}
            className="mt-1"
          />
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 overflow-auto bg-background">{children}</div>
      <Dialog open={isArchiveModalOpen} onOpenChange={setIsArchiveModalOpen}>
        <DialogContent
          className="w-full max-w-[500px] sm:max-w-[500px] flex flex-col"
          showCloseButton={false}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left">{t('athletes.profile.archiveConfirmTitle', { firstName })}</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={t('general.close')}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 mt-4">
            <p className="text-sm text-muted-foreground">
              {t('athletes.profile.archiveDescription')}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCancelArchive}>
              {t('athletes.profile.no')}
            </Button>
            <Button type="button" onClick={handleArchive}>
              {t('athletes.profile.yes')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientProfileLayout;
