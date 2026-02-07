'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { useGlobalData } from '@/providers/global-data-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { archiveUser as archiveClient, type Athlete } from '@/api/coach/coach-client-service';
import { useCoachClients } from '@/hooks/use-coach-clients';
import { cn } from '@/lib/general/utils';
import { exportToCSV } from '@/lib/general/csv-export';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AddClientSidePanel } from './add-client-side-panel';
import { UploadClientsSidePanel } from './upload-clients-side-panel';
import { RestoreClientsSidePanel } from './restore-clients-side-panel';
import { DataGrid, type ColumnDefinition, type FilterDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { ConfirmArchiveDialog } from '@/components/app/confirm-archive-dialog';
import { InviteLinkDialog, copyToClipboard } from '@/components/app/invite-link-dialog';
import { useCoachOnboardings } from '@/hooks/use-coach-onboardings';
import {
  User,
  Users,
  ClockAlert,
  Dumbbell,
  Grid2x2,
  HeartPulse,
  MessageCircle,
  Mail,
  Phone,
  Globe,
  Eye,
  EyeOff,
  Copy,
  Check,
  UserPlus,
  X,
  ChevronDown,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  Download,
  Archive,
  ArchiveRestore,
  Cake,
} from 'lucide-react';
import flags from 'react-phone-number-input/flags';
import type { Country } from 'react-phone-number-input';
import { getCountryCode, getCountryName } from '@/lib/general/country-utils';

type ColumnId =
  | 'lastActivity'
  | 'last7DaysTraining'
  | 'last30DaysTraining'
  | 'category'
  | 'connected'
  | 'email'
  | 'phone'
  | 'country'
  | 'birthDate'
  | 'clientFor';

const COLUMN_ORDER: ColumnId[] = [
  'lastActivity',
  'last7DaysTraining',
  'last30DaysTraining',
  'category',
  'connected',
  'email',
  'phone',
  'country',
  'birthDate',
  'clientFor',
];

const getColumnWidth = (colId: ColumnId, format: 'class' | 'pixel' = 'class'): string => {
  const widths: Record<ColumnId, { class: string; pixel: string }> = {
    lastActivity: { class: 'min-w-[165px]', pixel: '165px' },
    last7DaysTraining: { class: 'min-w-[160px]', pixel: '200px' },
    last30DaysTraining: { class: 'min-w-[170px]', pixel: '200px' },
    category: { class: 'min-w-[140px]', pixel: '140px' },
    connected: { class: 'min-w-[150px]', pixel: '150px' },
    email: { class: 'min-w-[220px]', pixel: '310px' },
    phone: { class: 'min-w-[160px]', pixel: '240px' },
    country: { class: 'min-w-[120px]', pixel: '120px' },
    birthDate: { class: 'min-w-[140px]', pixel: '140px' },
    clientFor: { class: 'min-w-[150px]', pixel: '150px' },
  };

  return widths[colId]?.[format] || (format === 'class' ? 'min-w-[130px]' : '130px');
};

const AthleteNameTooltip = ({ name }: { name: string }) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const checkTruncationRef = useRef<(() => void) | null>(null);
  const displayName = name?.trim() || '--';

  const handleRef = (element: HTMLSpanElement | null) => {
    if (element) {
      const checkTruncation = () => {
        setIsTruncated(element.scrollWidth > element.clientWidth);
      };
      checkTruncationRef.current = checkTruncation;
      checkTruncation();
      window.addEventListener('resize', checkTruncation);
    } else if (checkTruncationRef.current) {
      window.removeEventListener('resize', checkTruncationRef.current);
      checkTruncationRef.current = null;
    }
  };

  const nameSpan = (
    <span ref={handleRef} className="text-sm truncate cursor-default">
      {displayName}
    </span>
  );

  if (isTruncated && displayName !== '--') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{nameSpan}</TooltipTrigger>
        <TooltipContent>
          <p>{displayName}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return nameSpan;
};

const AthletesPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const { uniqueCode } = useGlobalData();
  const { clients: athletes, isLoading, archiveClient } = useCoachClients();
  const { onboardings } = useCoachOnboardings();
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set());
  const [isAddAthleteOpen, setIsAddAthleteOpen] = useState<boolean>(false);
  const [isUploadClientsOpen, setIsUploadClientsOpen] = useState<boolean>(false);
  const [isRestoreClientsOpen, setIsRestoreClientsOpen] = useState<boolean>(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState<boolean>(false);
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState<boolean>(false);
  const [filteredCount, setFilteredCount] = useState<number>(0);
  const itemsPerPage = 25;
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const copyTimeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Data is now fetched and cached by useCoachClients hook
  useEffect(() => {
    if (athletes) {
      setFilteredCount(athletes.length);
    }
  }, [athletes]);


  const handleToggleAthlete = (athleteId: string) => {
    setSelectedAthletes((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) {
        next.delete(athleteId);
      } else {
        next.add(athleteId);
      }
      return next;
    });
  };

  const handleNavigateToClientProfile = (athleteId: string) => {
    router.push(`/athletes/${athleteId}/overview`);
  };

  const handleAthleteRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    athleteId: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      const targetElement = event.target as HTMLElement;
      if (targetElement.closest('[data-no-row-link="true"]')) {
        return;
      }

      event.preventDefault();
      handleNavigateToClientProfile(athleteId);
    }
  };

  const handleAthleteRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    athleteId: string
  ) => {
    const targetElement = event.target as HTMLElement;
    if (targetElement.closest('[data-no-row-link="true"]')) {
      return;
    }

    handleNavigateToClientProfile(athleteId);
  };

  const calculatePercentage = (value: string): string => {
    const [completed, total] = value.split('/').map(Number);
    if (!total || total === 0) return '0%';
    const percentage = Math.round((completed / total) * 100);
    return `${percentage}%`;
  };

  const formatClientFor = (days: number): string => {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      const remainingDays = days % 365;
      if (remainingDays === 0) {
        return `${years} ${years === 1 ? t('athletes.timeUnits.year') : t('athletes.timeUnits.years')}`;
      }
      return `${years} ${years === 1 ? t('athletes.timeUnits.year') : t('athletes.timeUnits.years')} ${remainingDays} ${remainingDays === 1 ? t('athletes.timeUnits.day') : t('athletes.timeUnits.days')}`;
    }
    return `${days} ${days === 1 ? t('athletes.timeUnits.day') : t('athletes.timeUnits.days')}`;
  };


  const handleClearSelected = () => {
    setSelectedAthletes(new Set());
  };

  const handleExportSelected = () => {
    if (selectedAthletes.size === 0) return;
    const selectedAthletesData = athletes.filter((athlete) =>
      selectedAthletes.has(athlete.id)
    );
    const exportData = selectedAthletesData.map((row) => ({
      [t('athletes.export.name')]: row.name,
      [t('athletes.export.email')]: row.email,
      [t('athletes.export.phone')]: row.phone,
      [t('athletes.export.country')]: row.country,
      [t('athletes.export.category')]:
        row.category === 'online'
          ? t('athletes.filters.online')
          : row.category === 'in-person'
            ? t('athletes.filters.inPerson')
            : row.category === 'hybrid'
              ? t('athletes.filters.hybrid')
              : row.category === null
                ? t('athletes.filters.uncategorized', { defaultValue: 'Not set' })
                : row.category,
      [t('athletes.export.connected')]:
        row.connected === true
          ? t('athletes.status.connected')
          : row.connected === false
            ? t('athletes.filters.notConnected')
            : t('athletes.filters.invitationSent'),
      [t('athletes.export.lastActivity')]: row.lastActivity,
      [t('athletes.export.last7DaysTraining')]: row.last7DaysTraining,
      [t('athletes.export.last30DaysTraining')]: row.last30DaysTraining,
      [t('athletes.export.birthDate')]: row.birthDate,
      [t('athletes.export.age')]: row.age,
      [t('athletes.export.clientFor')]: row.clientFor,
    }));
    exportToCSV(exportData, 'selected-athletes.csv');
  };

  const handleArchiveSelected = () => {
    if (selectedAthletes.size === 0) return;
    setIsArchiveConfirmOpen(true);
  };

  const [isArchiving, setIsArchiving] = useState<boolean>(false);

  const handleConfirmArchive = async () => {
    setIsArchiving(true);
    try {
      const athleteIds = Array.from(selectedAthletes);
      // Get names of athletes being archived
      const archivedNames = athletes
        .filter(a => selectedAthletes.has(a.id))
        .map(a => a.name)
        .join(', ');

      await Promise.all(athleteIds.map(id => archiveClient(id)));

      const message = selectedAthletes.size === 1
        ? `${archivedNames} has been successfully archived and will lose app access immediately`
        : `${selectedAthletes.size} clients have been successfully archived and will lose app access immediately`;

      toast.success(message, {
        description: 'You can restore archived clients later.',
        duration: 5000,
      });

      setSelectedAthletes(new Set());
      setIsArchiveConfirmOpen(false);
    } catch (error) {
      toast.error(t('athletes.notifications.archiveError', { defaultValue: 'Failed to archive athlete(s)' }));
      console.error(error);
    } finally {
      setIsArchiving(false);
    }
  };


  const handleNavigateToMessages = (athleteId: string) => {
    router.push(`/messaging/${athleteId}`);
  };

  const handleNavigateToTrainingCalendar = (athleteId: string) => {
    router.push(`/athletes/${athleteId}/training`);
  };

  const handleTrainingCalendarIconKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    athleteId: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigateToTrainingCalendar(athleteId);
    }
  };

  const handleMessageIconKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    athleteId: string
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigateToMessages(athleteId);
    }
  };

  const censorEmail = (email: string): string => {
    const [localPart, domain] = email.split('@');
    if (!domain) return '***';
    const visibleChars = Math.min(2, localPart.length);
    const censoredLocal =
      localPart.slice(0, visibleChars) + '*'.repeat(Math.max(3, localPart.length - visibleChars));
    const [domainName, domainExt] = domain.split('.');
    if (!domainExt) return `${censoredLocal}@***`;
    const visibleDomainChars = Math.min(2, domainName.length);
    const censoredDomain =
      domainName.slice(0, visibleDomainChars) +
      '*'.repeat(Math.max(2, domainName.length - visibleDomainChars));
    return `${censoredLocal}@${censoredDomain}.${domainExt}`;
  };

  const censorPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 0) return '***';
    const visibleDigits = Math.min(3, digits.length);
    const visiblePart = digits.slice(-visibleDigits);
    let digitCount = 0;
    return phone
      .split('')
      .map((char) => {
        if (/\d/.test(char)) {
          digitCount++;
          if (digitCount > digits.length - visibleDigits) {
            return visiblePart[digitCount - (digits.length - visibleDigits) - 1];
          }
          return '*';
        }
        return char;
      })
      .join('');
  };

  const getFieldKey = (athleteId: string, fieldType: 'email' | 'phone' | 'name'): string => {
    return `${fieldType}-${athleteId}`;
  };

  const isFieldRevealed = (athleteId: string, fieldType: 'email' | 'phone'): boolean => {
    return revealedFields.has(getFieldKey(athleteId, fieldType));
  };

  const handleToggleReveal = (athleteId: string, fieldType: 'email' | 'phone') => {
    const fieldKey = getFieldKey(athleteId, fieldType);
    setRevealedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldKey)) {
        // Hide immediately if already revealed
        next.delete(fieldKey);
        const existingTimeout = timeoutRefs.current.get(fieldKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          timeoutRefs.current.delete(fieldKey);
        }
      } else {
        // Reveal and set auto-hide after 5 seconds
        next.add(fieldKey);
        const timeout = setTimeout(() => {
          setRevealedFields((current) => {
            const updated = new Set(current);
            updated.delete(fieldKey);
            return updated;
          });
          timeoutRefs.current.delete(fieldKey);
        }, 5000);
        timeoutRefs.current.set(fieldKey, timeout);
      }
      return next;
    });
  };

  const handleCopy = async (
    text: string,
    athleteId: string,
    fieldType: 'email' | 'phone' | 'name'
  ) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
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

    const fieldKey = getFieldKey(athleteId, fieldType);
    setCopiedFields((prev) => {
      const next = new Set(prev);
      next.add(fieldKey);
      return next;
    });

    // Clear existing timeout if any
    const existingTimeout = copyTimeoutRefs.current.get(fieldKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set timeout to hide checkmark after 2 seconds
    const timeout = setTimeout(() => {
      setCopiedFields((current) => {
        const updated = new Set(current);
        updated.delete(fieldKey);
        return updated;
      });
      copyTimeoutRefs.current.delete(fieldKey);
    }, 2000);
    copyTimeoutRefs.current.set(fieldKey, timeout);
  };

  const handleCopyIconKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    text: string,
    athleteId: string,
    fieldType: 'email' | 'phone' | 'name'
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCopy(text, athleteId, fieldType);
    }
  };

  const isFieldCopied = (athleteId: string, fieldType: 'email' | 'phone' | 'name'): boolean => {
    return copiedFields.has(getFieldKey(athleteId, fieldType));
  };

  useEffect(() => {
    return () => {
      // Cleanup all timeouts on unmount
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.current.clear();
      copyTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      copyTimeoutRefs.current.clear();
    };
  }, []);

  const handleRevealIconKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    athleteId: string,
    fieldType: 'email' | 'phone'
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggleReveal(athleteId, fieldType);
    }
  };

  const handleCopyInviteLink = () => {
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

  // Create column definitions for DataGrid
  const columns: ColumnDefinition<Athlete>[] = [
    {
      id: 'name',
      label: t('athletes.columns.athlete'),
      icon: <User className="size-3" />,
      getSortValue: (row) => (row.name || '').toLowerCase(),
      getSearchValue: (row) =>
        `${row.name || ''} ${row.email || ''} ${row.phone || ''} ${row.country || ''} ${row.category || ''}`,
    },
    ...COLUMN_ORDER.map((columnId: ColumnId): ColumnDefinition<Athlete> => {
      switch (columnId) {
        case 'lastActivity':
          return {
            id: 'lastActivity',
            label: t('athletes.columns.lastActivity'),
            icon: <ClockAlert className="size-3" />,
            width: getColumnWidth('lastActivity', 'pixel')
              ? {
                class: getColumnWidth('lastActivity', 'class'),
                pixel: getColumnWidth('lastActivity', 'pixel'),
              }
              : undefined,
            tooltip: t('athletes.columnTooltips.lastActivity'),
            getSortValue: (row) => row.lastActivity,
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row) => (
              <div className="flex items-center w-full">
                <span className="text-sm">{row.lastActivity || '--'}</span>
              </div>
            ),
          };
        case 'last7DaysTraining':
          return {
            id: 'last7DaysTraining',
            label: t('athletes.columns.last7DaysTraining'),
            icon: <Dumbbell className="size-3" />,
            width: {
              class: getColumnWidth('last7DaysTraining', 'class'),
              pixel: getColumnWidth('last7DaysTraining', 'pixel'),
            },
            tooltip: t('athletes.columnTooltips.last7DaysTraining'),
            getSortValue: (row) => {
              const training = row.last7DaysTraining || '0/0';
              const [completed, total] = training.split('/').map(Number);
              return total > 0 ? completed / total : 0;
            },
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row) => {
              const training = row.last7DaysTraining || '0/0';
              const [completed, total] = training.split('/').map(Number);
              const percentage = !total || total === 0 ? 0 : Math.round((completed / total) * 100);
              return (
                <div className="flex items-center w-full gap-2">
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="text-xs w-10 text-right">{percentage}%</span>
                </div>
              );
            },
          };
        case 'last30DaysTraining':
          return {
            id: 'last30DaysTraining',
            label: t('athletes.columns.last30DaysTraining'),
            icon: <Dumbbell className="size-3" />,
            width: {
              class: getColumnWidth('last30DaysTraining', 'class'),
              pixel: getColumnWidth('last30DaysTraining', 'pixel'),
            },
            tooltip: t('athletes.columnTooltips.last30DaysTraining'),
            getSortValue: (row) => {
              const training = row.last30DaysTraining || '0/0';
              const [completed, total] = training.split('/').map(Number);
              return total > 0 ? completed / total : 0;
            },
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row) => {
              const training = row.last30DaysTraining || '0/0';
              const [completed, total] = training.split('/').map(Number);
              const percentage = !total || total === 0 ? 0 : Math.round((completed / total) * 100);
              return (
                <div className="flex items-center w-full gap-2">
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="text-xs w-10 text-right">{percentage}%</span>
                </div>
              );
            },
          };
        case 'category':
          return {
            id: 'category',
            label: t('athletes.columns.category'),
            icon: <Grid2x2 className="size-3" />,
            width: {
              class: getColumnWidth('category', 'class'),
              pixel: getColumnWidth('category', 'pixel'),
            },
            tooltip: t('athletes.columnTooltips.category'),
            getSortValue: (row) => row.category ?? '',
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row) => {
              const category = row.category;
              if (category === 'in-person') {
                return (
                  <Badge variant="default" className="text-xs rounded-full bg-primary text-primary-foreground border-transparent">
                    {t('athletes.filters.inPerson')}
                  </Badge>
                );
              } else if (category === 'online') {
                return (
                  <Badge variant="outline" className="text-xs border-primary text-primary bg-transparent">
                    {t('athletes.filters.online')}
                  </Badge>
                );
              } else if (category === 'hybrid') {
                return (
                  <Badge variant="outline" className="text-xs">
                    {t('athletes.filters.hybrid')}
                  </Badge>
                );
              } else if (category === null) {
                return (
                  <Badge variant="secondary" className="text-xs">
                    {t('athletes.filters.uncategorized', { defaultValue: 'Not set' })}
                  </Badge>
                );
              }
              return (
                <div className="flex items-center w-full">
                  <span className="text-sm capitalize">{category}</span>
                </div>
              );
            },
          };
        case 'connected':
          return {
            id: 'connected',
            label: t('athletes.columns.connected'),
            icon: <HeartPulse className="size-3" />,
            width: {
              class: getColumnWidth('connected', 'class'),
              pixel: getColumnWidth('connected', 'pixel'),
            },
            tooltip: t('athletes.columnTooltips.connected'),
            getSortValue: (row) => (row.connected === true ? 1 : row.connected === false ? 0 : 0.5),
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row) => {
              let connectedLabel = '';
              if (row.connected === true) {
                connectedLabel = t('athletes.status.connected');
              } else if (row.connected === false) {
                connectedLabel = t('athletes.status.notConnected');
              } else if (row.connected === 'invitation-sent') {
                connectedLabel = t('athletes.status.invitationSent');
              }
              return (
                <div className="flex items-center w-full">
                  <span className="text-sm">{connectedLabel}</span>
                </div>
              );
            },
          };
        case 'email':
          return {
            id: 'email',
            label: t('athletes.columns.email'),
            icon: <Mail className="size-3" />,
            width: {
              class: getColumnWidth('email', 'class'),
              pixel: getColumnWidth('email', 'pixel'),
            },
            getSortValue: (row) => row.email,
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row, isSelected) => {
              const fieldKey = getFieldKey(row.id, 'email');
              const isRevealed = revealedFields.has(fieldKey);
              const isCopied = copiedFields.has(fieldKey);
              return (
                <div className="flex items-center justify-between gap-2 w-full">
                  <a
                    href={`mailto:${row.email}`}
                    className="text-sm flex-1 min-w-0 truncate hover:underline text-blue-600 dark:text-blue-400"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {isRevealed ? (row.email || '') : censorEmail(row.email || '')}
                  </a>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {row.email && (
                      <>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={
                            isRevealed ? t('athletes.actions.hideEmail', { name: row.name }) : t('athletes.actions.revealEmail', { name: row.name })
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReveal(row.id, 'email');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleReveal(row.id, 'email');
                            }
                          }}
                          data-no-row-link="true"
                          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        >
                          {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={t('athletes.actions.copyEmail', { name: row.name })}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(row.email, row.id, 'email');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopy(row.email, row.id, 'email');
                            }
                          }}
                          data-no-row-link="true"
                          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <Check className="size-4 text-green-500" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            },
          };
        case 'phone':
          return {
            id: 'phone',
            label: t('athletes.columns.phone'),
            icon: <Phone className="size-3" />,
            width: {
              class: getColumnWidth('phone', 'class'),
              pixel: getColumnWidth('phone', 'pixel'),
            },
            getSortValue: (row) => row.phone || '',
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row, isSelected) => {
              const fieldKey = getFieldKey(row.id, 'phone');
              const isRevealed = revealedFields.has(fieldKey);
              const isCopied = copiedFields.has(fieldKey);
              return (
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-sm flex-1 min-w-0 truncate">
                    {row.phone ? (isRevealed ? row.phone : censorPhone(row.phone)) : '--'}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {row.phone && (
                      <>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={
                            isRevealed ? t('athletes.actions.hidePhone', { name: row.name }) : t('athletes.actions.revealPhone', { name: row.name })
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleReveal(row.id, 'phone');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleReveal(row.id, 'phone');
                            }
                          }}
                          data-no-row-link="true"
                          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        >
                          {isRevealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </div>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label={t('athletes.actions.copyPhone', { name: row.name })}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(row.phone, row.id, 'phone');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopy(row.phone, row.id, 'phone');
                            }
                          }}
                          data-no-row-link="true"
                          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <Check className="size-4 text-green-500" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            },
          };
        case 'country':
          return {
            id: 'country',
            label: t('athletes.columns.country'),
            icon: <Globe className="size-3" />,
            width: {
              class: getColumnWidth('country', 'class'),
              pixel: getColumnWidth('country', 'pixel'),
            },
            getSortValue: (row) => row.country || '',
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row) => {
              const countryCode = getCountryCode(row.country);
              const Flag = countryCode ? flags[countryCode] : null;
              const countryDisplayName = getCountryName(row.country);
              return (
                <div className="flex items-center w-full">
                  {Flag ? (
                    <div className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
                      <Flag title={countryDisplayName || ''} />
                    </div>
                  ) : (
                    <span className="text-sm">{row.country || '--'}</span>
                  )}
                </div>
              );
            },
          };
        case 'birthDate':
          return {
            id: 'birthDate',
            label: t('athletes.columns.birthDate', { defaultValue: 'Birth Date' }),
            icon: <Cake className="size-3" />,
            width: {
              class: getColumnWidth('birthDate', 'class'),
              pixel: getColumnWidth('birthDate', 'pixel'),
            },
            getSortValue: (row) => row.birthDate || '',
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row) => (
              <div className="flex items-center w-full">
                <span className="text-sm">
                  {row.birthDate ? format(new Date(row.birthDate), 'd MMM, yyyy') : '--'}
                </span>
              </div>
            ),
          };
        case 'clientFor':
          return {
            id: 'clientFor',
            label: t('athletes.columns.clientFor'),
            icon: <ClockAlert className="size-3" />,
            width: {
              class: getColumnWidth('clientFor', 'class'),
              pixel: getColumnWidth('clientFor', 'pixel'),
            },
            tooltip: t('athletes.columnTooltips.clientFor'),
            getSortValue: (row) => row.clientFor || '',
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row) => (
              <div className="flex items-center w-full pr-6">
                <span className="text-sm">{formatClientFor(Number(row.clientFor))}</span>
              </div>
            ),
          };
        default:
          return {
            id: columnId,
            label: columnId,
            width: { class: 'min-w-[130px]', pixel: '130px' },
            getSearchValue: (row) =>
              `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`,
            renderCell: (row) => (
              <div className="flex items-center w-full">
                <span className="text-sm">{String(row[columnId as keyof Athlete] ?? '')}</span>
              </div>
            ),
          };
      }
    }),
  ];

  // Create filter definitions
  const filters: FilterDefinition<Athlete>[] = [
    {
      id: 'category',
      label: t('athletes.filters.category'),
      icon: <Grid2x2 className="size-4" />,
      options: [
        { value: 'online', label: t('athletes.filters.online') },
        { value: 'in-person', label: t('athletes.filters.inPerson') },
        { value: 'hybrid', label: t('athletes.filters.hybrid') },
      ],
      getFilterValue: (row) => row.category,
    },
    {
      id: 'connected',
      label: t('athletes.filters.connected'),
      icon: <HeartPulse className="size-4" />,
      options: [
        { value: 'true', label: t('athletes.status.connected') },
        { value: 'false', label: t('athletes.filters.notConnected') },
        { value: 'invitation-sent', label: t('athletes.filters.invitationSent') },
      ],
      getFilterValue: (row) => {
        if (row.connected === true) return 'true';
        if (row.connected === false) return 'false';
        if (row.connected === 'invitation-sent') return 'invitation-sent';
        return null;
      },
    },
  ];

  // Create first column header renderer
  const renderFirstColumnHeader = ({
    isAllSelected,
    onToggleAll,
    enableRowSelection,
    isSorted,
    isAscending,
    isDescending,
    onSort,
  }: {
    isAllSelected: boolean;
    onToggleAll: () => void;
    enableRowSelection: boolean;
    isSorted: boolean;
    isAscending: boolean;
    isDescending: boolean;
    onSort: (direction: 'asc' | 'desc') => void;
  }) => {
    return (
      <div className="flex items-center gap-3 h-full w-full">
        {enableRowSelection && (
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
            aria-label={t('athletes.actions.selectAll')}
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer h-full flex-1">
              <User className="size-3 text-muted-foreground" />
              <span className="text-xs uppercase text-muted-foreground">{t('athletes.columns.athlete')}</span>
              {isAscending && <ArrowUpNarrowWide className="size-3 text-muted-foreground" />}
              {isDescending && <ArrowDownWideNarrow className="size-3 text-muted-foreground" />}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => onSort('asc')}
              className={cn(isAscending && 'bg-accent')}
            >
              <ArrowUpNarrowWide className="size-4 mr-2" />
              <span className="flex-1">{t('athletes.actions.sortAscending')}</span>
              {isAscending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSort('desc')}
              className={cn(isDescending && 'bg-accent')}
            >
              <ArrowDownWideNarrow className="size-4 mr-2" />
              <span className="flex-1">{t('athletes.actions.sortDescending')}</span>
              {isDescending && <Check className="ml-2 size-4" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  // Create first column renderer
  const renderFirstColumn = (athlete: Athlete, isSelected: boolean) => {
    const initials = (athlete.name?.trim() || '')
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || '?';
    const fieldKey = getFieldKey(athlete.id, 'name');
    const isCopied = copiedFields.has(fieldKey);

    return (
      <div className="flex items-center gap-3 h-full w-full">
        <div
          className="flex items-center justify-center h-full flex-shrink-0"
          data-no-row-link="true"
        >
          <Checkbox checked={isSelected} onCheckedChange={() => handleToggleAthlete(athlete.id)} />
        </div>
        <div className="flex items-center justify-between gap-2 min-w-0 flex-1 w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={athlete.avatarUrl} alt={athlete.name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <AthleteNameTooltip name={athlete.name} />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={t('athletes.actions.messageAria', { name: athlete.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateToMessages(athlete.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNavigateToMessages(athlete.id);
                    }
                  }}
                  data-no-row-link="true"
                  className="flex items-center justify-center rounded-md p-1.5 text-foreground hover:bg-accent hover:text-primary transition-colors cursor-pointer h-7 max-h-7"
                >
                  <MessageCircle className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('athletes.actions.messageClient')}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={t('athletes.actions.viewTrainingCalendarAria', { name: athlete.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateToTrainingCalendar(athlete.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNavigateToTrainingCalendar(athlete.id);
                    }
                  }}
                  data-no-row-link="true"
                  className="flex items-center justify-center rounded-md p-1.5 text-foreground hover:bg-accent hover:text-primary transition-colors cursor-pointer h-7 max-h-7"
                >
                  <Dumbbell className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('athletes.actions.viewTrainingCalendar')}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={t('athletes.actions.copyAthleteNameAria', { name: athlete.name })}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(athlete.name, athlete.id, 'name');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCopy(athlete.name, athlete.id, 'name');
                    }
                  }}
                  data-no-row-link="true"
                  className="flex items-center justify-center rounded-md p-1.5 text-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer h-7 max-h-7"
                >
                  {isCopied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('athletes.actions.copyAthleteName')}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  };
  return (
    <div className="h-full w-full flex flex-col">
      <PageHeader
        title={t('athletes.title')}
        subtitle={t('athletes.subtitle', { count: filteredCount })}
        action={
          <div>
            <DropdownMenu>
              <ButtonGroup>
                <Button
                  variant="ghost"
                  onClick={handleCopyInviteLink}
                  className="gap-2 border border-primary"
                  aria-label={t('athletes.actions.copyInviteLink')}
                >
                  <Copy className="size-4" />
                  <span>{t('athletes.actions.yourInviteLink')}</span>
                </Button>
                <Button onClick={() => setIsAddAthleteOpen(true)} className="gap-2">
                  <UserPlus className="size-4" />
                  <span>{t('athletes.actions.addClient')}</span>
                </Button>
                <ButtonGroupSeparator />
                <DropdownMenuTrigger asChild>
                  <Button className="px-2" aria-label={t('general.more')}>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
              </ButtonGroup>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsAddAthleteOpen(true)}>
                  <UserPlus className="size-4 mr-2" />
                  <span>{t('athletes.actions.singleClient')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsUploadClientsOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>{t('athletes.actions.uploadCSV')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsRestoreClientsOpen(true)}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  <span>{t('athletes.actions.archivedClients')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <DataGrid
        data={athletes}
        columns={columns}
        getRowId={(row) => row.id}
        gridKey="athletes"
        itemsPerPage={itemsPerPage}
        onFilteredDataChange={setFilteredCount}
        enableSearch={true}
        searchPlaceholder={t('athletes.searchPlaceholder')}
        searchFields={[(row: Athlete) => `${row.name} ${row.email} ${row.phone} ${row.country} ${row.category}`]}
        filters={filters}
        enableEditColumns={true}
        enableExport={true}
        exportFileName="athletes.csv"
        exportDataTransform={(row) => ({
          [t('athletes.export.name')]: row.name,
          [t('athletes.export.email')]: row.email,
          [t('athletes.export.phone')]: row.phone,
          [t('athletes.export.country')]: row.country,
          [t('athletes.export.category')]:
            row.category === 'online'
              ? t('athletes.filters.online')
              : row.category === 'in-person'
                ? t('athletes.filters.inPerson')
                : row.category === 'hybrid'
                  ? t('athletes.filters.hybrid')
                  : row.category === null
                    ? t('athletes.filters.uncategorized', { defaultValue: 'Not set' })
                    : row.category,
          [t('athletes.export.connected')]:
            row.connected === true
              ? t('athletes.status.connected')
              : row.connected === false
                ? t('athletes.status.notConnected')
                : t('athletes.status.invitationSent'),
          [t('athletes.export.lastActivity')]: row.lastActivity,
          [t('athletes.export.last7DaysTraining')]: row.last7DaysTraining,
          [t('athletes.export.last30DaysTraining')]: row.last30DaysTraining,
          [t('athletes.export.age')]: row.age,
          [t('athletes.export.clientFor')]: row.clientFor,
        })}
        enableRowSelection={true}
        selectedRowIds={selectedAthletes}
        onSelectionChange={(next: Set<string>) => setSelectedAthletes(next)}
        onRowClick={(row, event) => {
          const targetElement = event.target as HTMLElement;
          if (targetElement.closest('[data-no-row-link="true"]')) {
            return;
          }
          handleNavigateToClientProfile(row.id);
        }}
        onRowKeyDown={(row, event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const targetElement = event.target as HTMLElement;
            if (targetElement.closest('[data-no-row-link="true"]')) {
              return;
            }
            event.preventDefault();
            handleNavigateToClientProfile(row.id);
          }
        }}
        defaultColumnOrder={['name', ...COLUMN_ORDER]}
        defaultVisibleColumns={['name', ...COLUMN_ORDER]}
        firstColumnId="name"
        selectionActions={
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleClearSelected}
                    className="gap-2"
                    aria-label={t('athletes.actions.clearSelectedAria')}
                  >
                    <X className="size-4" />
                    <span>
                      {t('general.clearSelected', { count: selectedAthletes.size })}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('athletes.actions.clearSelected')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleExportSelected}
                    className="gap-2"
                    aria-label={t('athletes.actions.exportSelectedAria')}
                  >
                    <Download className="size-4" />
                    <span>{t('athletes.actions.export')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('athletes.actions.export')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleArchiveSelected}
                    className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={isArchiving}
                    aria-label={t('athletes.actions.archiveSelectedAria')}
                  >
                    {isArchiving ? <Spinner className="size-4" /> : <Archive className="size-4" />}
                    <span>{t('athletes.actions.archive')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('athletes.actions.archive')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        }
        emptyMessage={t('athletes.emptyMessage')}
        emptyState={
          <EmptyGridState
            title={t('athletes.emptyState.title')}
            subtitle={t('athletes.emptyState.subtitle')}
            action={
              <DropdownMenu>
                <ButtonGroup>
                  <Button onClick={() => setIsAddAthleteOpen(true)} className="gap-2">
                    <UserPlus className="size-4" />
                    <span>{t('athletes.actions.addClient')}</span>
                  </Button>
                  <ButtonGroupSeparator />
                  <DropdownMenuTrigger asChild>
                    <Button className="px-2" aria-label={t('general.more')}>
                      <ChevronDown className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </ButtonGroup>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsAddAthleteOpen(true)}>
                    <UserPlus className="size-4 mr-2" />
                    <span>{t('athletes.actions.singleClient')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsUploadClientsOpen(true)}>
                    <Users className="size-4 mr-2" />
                    <span>{t('athletes.actions.uploadClients')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsRestoreClientsOpen(true)}>
                    <ArchiveRestore className="size-4 mr-2" />
                    <span>{t('athletes.actions.restoreClient')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        }
        rowHeight="54px"
        stickyFirstColumn={true}
        firstColumnWidth="350px"
        renderFirstColumn={renderFirstColumn}
        renderFirstColumnHeader={renderFirstColumnHeader}
        showPagination={true}
        gridPadding={true}
        compactPagination={true}
      />
      <AddClientSidePanel
        open={isAddAthleteOpen}
        onOpenChange={setIsAddAthleteOpen}
      />
      <UploadClientsSidePanel
        open={isUploadClientsOpen}
        onOpenChange={setIsUploadClientsOpen}
      />
      <ConfirmArchiveDialog
        open={isArchiveConfirmOpen}
        onOpenChange={setIsArchiveConfirmOpen}
        onConfirm={handleConfirmArchive}
        count={selectedAthletes.size}
      />
      {uniqueCode && (
        <InviteLinkDialog
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          uniqueCode={uniqueCode}
        />
      )}
      <RestoreClientsSidePanel
        open={isRestoreClientsOpen}
        onOpenChange={setIsRestoreClientsOpen}
        onClientRestored={() => {
          // Invalidate the coach-clients query to refresh the list
          // This is handled by the useCoachClients hook's query invalidation
        }}
      />
    </div>
  );
};

export default AthletesPage;
