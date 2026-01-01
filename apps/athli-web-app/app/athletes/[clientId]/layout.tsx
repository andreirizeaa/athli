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
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { useGlobalData } from '@/providers/global-data-provider';
import { ClientProfileProvider, useClientProfileContext } from './client-profile-context';
import { resendClientInvite } from '@/api/coach/coach-client-invite-service';
import { FullScreenLoader } from '@/components/ui/full-screen-loader';

export type ClientProfileLayoutProps = {
  children: React.ReactNode;
  hideBreadcrumb?: boolean;
  basePath?: string; // e.g., '/inbox' for inbox context (not used with onTabChange)
  activeTab?: string; // Override tab from URL segments (for inbox context)
  onTabChange?: (tab: string) => void; // Callback for state-based tab management
};

export const ClientProfileLayoutContent = ({ children, hideBreadcrumb = false, basePath, activeTab: activeTabProp, onTabChange }: ClientProfileLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const params = useParams<{ clientId: string; contactId: string }>();
  const { user } = useSupabaseAuth();
  const { uniqueCode } = useGlobalData();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;
  const [isInviteCopied, setIsInviteCopied] = useState<boolean>(false);
  const inviteCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { athlete, isLoading, error } = useClientProfileContext();

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
      value: 'notes',
      label: t('athletes.profile.notes'),
    },
    {
      value: 'training',
      label: t('athletes.profile.trainingCalendar'),
    },
    {
      value: 'metrics',
      label: t('athletes.profile.metrics'),
    },
    {
      value: 'habits',
      label: t('athletes.profile.habits'),
    },
    {
      value: 'photos',
      label: t('athletes.profile.photos'),
    },
    {
      value: 'files',
      label: t('athletes.profile.files'),
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
      value: 'updates',
      label: t('athletes.profile.updates'),
    },
    {
      value: 'settings',
      label: t('athletes.profile.settings.title'),
    },
  ];

  const validTabValues = tabs.map((tab) => tab.value);
  const lastSegment = segments[segments.length - 1];

  // Check if we're in a check-in, questionnaires, photos, settings, updates, or training-calendar route (either list or detail page)
  const isCheckInRoute = segments.includes('check-in');
  const isQuestionnairesRoute = segments.includes('questionnaires');
  const isPhotosRoute = segments.includes('photos');
  const isSettingsRoute = segments.includes('settings');
  const isUpdatesRoute = segments.includes('updates');
  const isTrainingCalendarRoute = segments.includes('training');

  // Determine active tab (use prop if provided, otherwise use segments)
  const activeTabFromSegments = isCheckInRoute
    ? 'check-in'
    : isQuestionnairesRoute
      ? 'questionnaires'
      : isPhotosRoute
        ? 'photos'
        : isSettingsRoute
          ? 'settings'
          : isUpdatesRoute
            ? 'updates'
            : isTrainingCalendarRoute
              ? 'training'
              : (lastSegment && validTabValues.includes(lastSegment) ? lastSegment : 'overview');

  const activeTab = activeTabProp || activeTabFromSegments;

  const handleTabChange = (value: string) => {
    if (!clientId) {
      return;
    }

    if (value === activeTab) {
      return;
    }

    // Use callback if provided (for state-based tab management in inbox context)
    if (onTabChange) {
      onTabChange(value);
      return;
    }

    // Otherwise use URL-based navigation
    const navigationPath = basePath
      ? `${basePath}/${clientId}/${value}`
      : `/athletes/${clientId}/${value}`;
    router.push(navigationPath);
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

  const handleResendInvite = async () => {
    if (!athlete?.id) return;

    try {
      const { email } = await resendClientInvite(athlete.id);
      toast.success(t('athletes.profile.resendInviteSuccess', { email }), {
        style: {
          background: 'rgb(220 252 231)',
          color: 'rgb(20 83 45)',
          border: '1px solid rgb(187 247 208)',
        },
      });
    } catch (error) {
      console.error('Failed to resend invite:', error);
      toast.error('Failed to resend invitation. Please try again.');
    }
  };

  const handleCopyInvite = async () => {
    if (!uniqueCode) {
      toast.error('Unable to generate invite link. Please try again.');
      return;
    }

    const inviteLink = `${window.location.origin}/client/invite/${uniqueCode}`;
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

  if (isLoading) {
    return <FullScreenLoader subtitle="Pulling up the good stuff..." />;
  }

  if (error || !athlete) {
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
          <p className="text-sm text-muted-foreground">{error || t('athletes.profile.clientNotFoundDescription')}</p>
        </div>
      </div>
    );
  }

  const names = athlete.name.split(' ');
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || '';
  const initials = firstName && lastName
    ? `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
    : firstName
      ? firstName.charAt(0).toUpperCase()
      : 'U';

  return (
    <div className="h-full w-full flex flex-col overflow-auto">
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
          {!hideBreadcrumb && (
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
          )}
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={athlete.avatarUrl} alt={athlete.name} />
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
      <div className="w-full flex-1 min-h-0 bg-background bg-card/50">{children}</div>
    </div>
  );
};

const ClientProfileLayout = ({ children }: ClientProfileLayoutProps) => {
  return (
    <ClientProfileProvider>
      <ClientProfileLayoutContent>{children}</ClientProfileLayoutContent>
    </ClientProfileProvider>
  );
};

export default ClientProfileLayout;
