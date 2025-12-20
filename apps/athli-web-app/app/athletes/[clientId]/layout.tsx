'use client';

import React, { useState, useRef, useEffect } from 'react';
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
import { toast } from 'sonner';
import { ChevronRight, MessageCircle, Users, Send, Copy, Check } from 'lucide-react';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { mockAthletes } from '@/components/app/app-shell';

type ClientProfileLayoutProps = {
  children: React.ReactNode;
};

const ClientProfileLayout = ({ children }: ClientProfileLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const params = useParams<{ clientId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const [isInviteCopied, setIsInviteCopied] = useState<boolean>(false);
  const inviteCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const athlete = mockAthletes.find((item) => item.id === clientId);

  useEffect(() => {
    return () => {
      if (inviteCopyTimeoutRef.current) {
        clearTimeout(inviteCopyTimeoutRef.current);
      }
    };
  }, []);

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
      value: 'training-calendar',
      label: t('athletes.profile.trainingCalendar'),
    },
    {
      value: 'check-in',
      label: t('athletes.profile.checkIns.title'),
    },
    {
      value: 'questionnaires',
      label: t('athletes.profile.questionnaires.title'),
    },
    {
      value: 'notes',
      label: t('athletes.profile.notes'),
    },
    {
      value: 'files',
      label: t('athletes.profile.files'),
    },
    {
      value: 'habits',
      label: t('athletes.profile.habits'),
    },
    {
      value: 'settings',
      label: t('athletes.profile.settings.title'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  const lastSegment = segments[segments.length - 1];

  // Check if we're in a check-in, questionnaires, or settings route (either list or detail page)
  const isCheckInRoute = segments.includes('check-in');
  const isQuestionnairesRoute = segments.includes('questionnaires');
  const isSettingsRoute = segments.includes('settings');

  // Determine active tab
  const activeTab = isCheckInRoute
    ? 'check-in'
    : isQuestionnairesRoute
    ? 'questionnaires'
    : isSettingsRoute
    ? 'settings'
    : (lastSegment && validTabValues.includes(lastSegment) ? lastSegment : 'overview');

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

  const handleResendInvite = () => {
    // TODO: Implement resend invite functionality
    console.log('Resending invite to:', clientId);
    toast.success(t('athletes.profile.resendInvite'), {
      style: {
        background: 'rgb(220 252 231)',
        color: 'rgb(20 83 45)',
        border: '1px solid rgb(187 247 208)',
      },
    });
  };

  const handleCopyInvite = async () => {
    // TODO: Get actual invite link for this specific client
    const inviteLink = `https://app.athli.com/invite/${clientId}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (fallbackErr) {
        // Ignore copy errors
      }
      document.body.removeChild(textArea);
    }

    setIsInviteCopied(true);

    // Clear existing timeout if any
    if (inviteCopyTimeoutRef.current) {
      clearTimeout(inviteCopyTimeoutRef.current);
    }

    // Set timeout to hide checkmark after 2 seconds
    inviteCopyTimeoutRef.current = setTimeout(() => {
      setIsInviteCopied(false);
      inviteCopyTimeoutRef.current = null;
    }, 2000);

    toast.success(t('athletes.profile.copyInvite'), {
      style: {
        background: 'rgb(220 252 231)',
        color: 'rgb(20 83 45)',
        border: '1px solid rgb(187 247 208)',
      },
    });
  };

  const handleCopyInviteKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopyInvite();
    }
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
    <div className="h-full w-full flex flex-col overflow-auto">
      <div className="w-full relative flex-shrink-0">
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
          <ButtonGroup>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleResendInvite}
                  variant="ghost"
                  className="gap-2 border border-primary"
                  aria-label={t('athletes.profile.resendInviteAria')}
                >
                  <Send className="size-4" />
                  <span>{t('athletes.profile.resendInvite')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('athletes.profile.resendInviteAria')}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleCopyInvite}
                  onKeyDown={handleCopyInviteKeyDown}
                  variant="ghost"
                  className="gap-2 border border-primary"
                  aria-label={t('athletes.profile.copyInviteAria')}
                >
                  {isInviteCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  <span>{t('athletes.profile.copyInvite')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('athletes.profile.copyInviteAria')}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => handleNavigateToMessages(clientId)}
                  className="gap-2"
                  aria-label={t('athletes.profile.messageAria')}
                >
                  <MessageCircle className="size-4" />
                  <span>{t('athletes.profile.message')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('athletes.profile.messageAria')}</p>
              </TooltipContent>
            </Tooltip>
          </ButtonGroup>
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
      <div className="w-full flex-1 min-h-0 bg-background">{children}</div>
    </div>
  );
};

export default ClientProfileLayout;
