'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSelectedLayoutSegments } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ChevronRight, MessageCircle, Users, Send, Copy, Dna, Cake } from 'lucide-react';
import { ButtonGroup } from '@/components/ui/button-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { useGlobalData } from '@/providers/global-data-provider';
import { ClientProfileProvider, useClientProfileContext } from './client-profile-context';
import { resendClientInvite } from '@/api/coach/coach-client-invite-service';
import { FullScreenLoader } from '@/components/ui/full-screen-loader';
import { SectionLoader } from '@/components/ui/section-loader';
import { EditClientDetailsSidePanel } from './components/edit-client-details-side-panel';
import { InviteLinkDialog, copyToClipboard } from '@/components/app/invite-link-dialog';
import { useCoachOnboardings } from '@/hooks/use-coach-onboardings';
import { getFlagEmoji } from '@/lib/general/country-utils';

export type ClientProfileLayoutProps = {
  children: React.ReactNode;
  hideBreadcrumb?: boolean;
  basePath?: string; // e.g., '/inbox' for inbox context (not used with onTabChange)
  activeTab?: string; // Override tab from URL segments (for inbox context)
  onTabChange?: (tab: string) => void; // Callback for state-based tab management
  hideMessageButton?: boolean;
  useSectionLoader?: boolean; // Use contained section loader instead of full-screen (for inbox context)
  hideLoader?: boolean;
};

export const ClientProfileLayoutContent = ({ children, hideBreadcrumb = false, basePath, activeTab: activeTabProp, onTabChange, hideMessageButton = false, useSectionLoader = false, hideLoader = false }: ClientProfileLayoutProps) => {
  const t = useTranslations();
  const router = useRouter();
  const segments = useSelectedLayoutSegments();
  const params = useParams<{ clientId: string; contactId: string }>();
  const { user } = useSupabaseAuth();
  const { uniqueCode } = useGlobalData();
  const { onboardings } = useCoachOnboardings();
  // Support both clientId (athletes context) and contactId (inbox context)
  const clientIdFromParams = params.clientId || params.contactId;
  const clientId = Array.isArray(clientIdFromParams) ? clientIdFromParams[0] : clientIdFromParams;
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState<boolean>(false);
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false);

  const { athlete, details, isLoading, error } = useClientProfileContext();

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
      value: 'exercise-history',
      label: t('athletes.profile.exerciseHistory'),
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
  const isExerciseHistoryRoute = segments.includes('exercise-history');

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
              : isExerciseHistoryRoute
                ? 'exercise-history'
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
    router.push(`/inbox/${athleteId}`);
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

  const handleCopyInvite = () => {
    if (!uniqueCode) {
      toast.error('Unable to generate invite link. Please try again.');
      return;
    }
    if (onboardings.length === 0) {
      copyToClipboard(`${window.location.origin}/client/invite/${uniqueCode}`);
      toast.success(t('athletes.inviteDialog.linkCopied'));
    } else {
      setIsInviteDialogOpen(true);
    }
  };

  // For section loader mode, we render the loader overlay on top of the content structure
  // to prevent layout shifts when switching clients
  const showSectionLoading = isLoading && useSectionLoader && !hideLoader;

  if (isLoading && !useSectionLoader && !hideLoader) {
    return <FullScreenLoader subtitle="Pulling up the good stuff..." />;
  }

  if ((error || !athlete) && !showSectionLoading) {
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

  const displayName = athlete?.name?.trim() || '--';
  const names = (athlete?.name || '').split(' ');
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || '';
  const initials = firstName && lastName
    ? `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`
    : firstName
      ? firstName.charAt(0).toUpperCase()
      : '?';

  return (
    <div className="h-full w-full flex flex-col overflow-auto relative">
      {showSectionLoading && <SectionLoader subtitle="Pulling up the good stuff..." />}
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
                    {displayName}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage src={athlete?.avatarUrl} alt={athlete?.name || ''} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold leading-none">{displayName}</h1>
                <Badge
                  variant="outline"
                  className={
                    athlete?.status === 'archived'
                      ? 'bg-red-100 text-red-900 border-red-200 hover:bg-red-100 rounded-sm px-2.5 py-0.5 font-medium text-sm'
                      : 'bg-[#dcfce7] text-[#14532d] border-[#bbf7d0] hover:bg-[#dcfce7] rounded-sm px-2.5 py-0.5 font-medium text-sm'
                  }
                >
                  {athlete?.status === 'archived' ? t('general.archived') : t('general.active')}
                </Badge>
              </div>

              <div
                className="flex items-center gap-4 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setIsEditDetailsOpen(true)}
              >
                <div className="flex items-center gap-1.5">
                  <Dna className="size-3" />
                  <span>{details?.gender ? t(`athletes.profile.${details.gender}`) : '--'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Cake className="size-3" />
                  <span>{athlete?.age ? `${athlete.age} years old` : '--'}</span>
                </div>

                {details?.country && (
                  <div className="flex items-center text-xl leading-none">
                    {getFlagEmoji(details.country)}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-medium px-2 py-0 h-6 text-xs rounded-sm">
                    {athlete?.coachingType === 'online'
                      ? t('athletes.profile.online')
                      : athlete?.coachingType === 'in-person'
                        ? t('athletes.profile.inPerson')
                        : athlete?.coachingType === 'hybrid'
                          ? t('athletes.profile.hybrid')
                          : t('athletes.filters.uncategorized', { defaultValue: 'Not set' })}
                  </Badge>
                  <Badge variant="outline" className="h-6 px-1.5 text-xs rounded-sm border-muted-foreground/30 font-medium">
                    Edit +3
                  </Badge>
                </div>
              </div>
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
                  variant="ghost"
                  className="gap-2 border border-primary"
                  aria-label={t('athletes.profile.copyInviteAria')}
                >
                  <Copy className="size-4" />
                  <span>{t('athletes.profile.copyInvite')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('athletes.profile.copyInviteAria')}</p>
              </TooltipContent>
            </Tooltip>
            {!hideMessageButton && (
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
            )}
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
      <div className="w-full flex-1 min-h-0">{children}</div>
      <EditClientDetailsSidePanel
        open={isEditDetailsOpen}
        onOpenChange={setIsEditDetailsOpen}
      />
      {uniqueCode && (
        <InviteLinkDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          uniqueCode={uniqueCode}
        />
      )}
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
