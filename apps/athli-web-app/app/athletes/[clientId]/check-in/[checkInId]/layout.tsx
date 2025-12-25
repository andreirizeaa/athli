'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/general/utils';
import { getClientCheckInsForForm, getCheckInInstance, type CheckInInstance } from '@/lib/api/client/client-form-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronRight, Download, Loader2, GitCompare, ChevronDown } from 'lucide-react';

type CheckInLayoutProps = {
  children: React.ReactNode;
};

const CheckInLayout = ({ children }: CheckInLayoutProps) => {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams<{ clientId: string; checkInId: string; instanceId?: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const checkInId = Array.isArray(params.checkInId) ? params.checkInId[0] : params.checkInId;
  const instanceId = params.instanceId ? (Array.isArray(params.instanceId) ? params.instanceId[0] : params.instanceId) : undefined;

  const [instances, setInstances] = useState<CheckInInstance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    const fetchInstances = async () => {
      if (!clientId || !checkInId) return;

      setIsLoading(true);
      try {
        const data = await getClientCheckInsForForm(clientId, checkInId);
        setInstances(data);
      } catch (error) {
        console.error('Failed to fetch check-in instances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInstances();
  }, [clientId, checkInId]);

  const handleBreadcrumbClick = (path: string) => {
    router.push(path);
  };

  const handleDownload = async (selectedInstanceId?: string) => {
    const downloadInstanceId = selectedInstanceId || instanceId;
    if (!downloadInstanceId || isDownloading) return;

    const targetInstance = instances.find((i) => i.id === downloadInstanceId);
    if (!targetInstance || targetInstance.status === 'assigned') return;

    setIsDownloading(true);
    try {
      const instanceDetail = await getCheckInInstance(clientId, checkInId, downloadInstanceId);
      const { downloadQuestionnaire } = await import('@/lib/general/pdf-service');

      const clientName = 'Client Name';

      await downloadQuestionnaire({
        questionnaire: {
          id: instanceDetail.id,
          name: instanceDetail.formName,
          description: '',
          status: instanceDetail.status === 'assigned' ? 'pending' : 'completed',
          sentAt: instanceDetail.scheduledDate,
          completedAt: instanceDetail.completedAt,
          questions: instanceDetail.questions || [],
          answers: instanceDetail.answers || [],
        },
        clientName,
      });
    } catch (error) {
      console.error('Failed to download check-in:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadLatest = () => {
    // Find the latest completed instance
    const completedInstances = instances.filter((i) => i.status !== 'assigned');
    if (completedInstances.length === 0) return;

    // Sort by scheduled date descending to get the latest
    const latestInstance = completedInstances.sort(
      (a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime()
    )[0];

    handleDownload(latestInstance.id);
  };

  const handleCompare = () => {
    router.push(`/athletes/${clientId}/check-in/${checkInId}/compare`);
  };

  const getDateSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    const lastDigit = day % 10;
    switch (lastDigit) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  const formatScheduledDate = (date: Date): string => {
    const day = date.getDate();
    const suffix = getDateSuffix(day);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return `${day}${suffix} ${month}, ${year}`;
  };

  const getStatusVariant = (status: CheckInInstance['status']) => {
    switch (status) {
      case 'assigned':
        return 'outline';
      case 'review':
      case 'completed':
        return 'outline';
      case 'reviewed':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStatusClassName = (status: CheckInInstance['status']) => {
    switch (status) {
      case 'review':
      case 'completed':
        return 'border-primary text-primary';
      case 'reviewed':
        return 'bg-primary text-primary-foreground border-transparent';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: CheckInInstance['status']) => {
    switch (status) {
      case 'assigned':
        return t('athletes.profile.checkIns.status.assigned');
      case 'review':
        return t('athletes.profile.checkIns.status.review');
      case 'reviewed':
        return t('athletes.profile.checkIns.status.reviewed');
      case 'completed':
        // Map 'completed' to 'review' for display purposes
        return t('athletes.profile.checkIns.status.review');
      default:
        return status;
    }
  };

  const formName = instances.length > 0 ? instances[0].formName : '';
  const currentInstance = instanceId ? instances.find((i) => i.id === instanceId) : undefined;
  const completedInstances = instances.filter((i) => i.status !== 'assigned');
  const showButtons = completedInstances.length > 0;
  const isComparePage = pathname?.includes('/compare');

  // Sort instances by scheduled date (newest first)
  const sortedInstances = React.useMemo(() => {
    return [...instances].sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime());
  }, [instances]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col">
        <div className="w-full relative flex-shrink-0">
          <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
          <Separator className="absolute bottom-[-1px] left-0 right-0" />
        </div>
        <div className="flex h-full w-full flex-1 min-h-0">
          <div className="w-80 border-r bg-background flex-shrink-0 flex flex-col">
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-4">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      {isComparePage ? (
        <div className="w-full">{children}</div>
      ) : (
        <>
          {/* Top header with breadcrumb and title */}
          <div className="w-full relative flex-shrink-0">
            <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <Breadcrumb>
                  <BreadcrumbList className="text-xs gap-1">
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        onClick={() => handleBreadcrumbClick(`/athletes/${clientId}/check-in`)}
                        className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                      >
                        {t('athletes.profile.checkIns.title')}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-muted-foreground/60">
                      <ChevronRight className="h-2 w-2" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="font-semibold text-foreground px-0.5">{formName}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <h1 className="text-[22px] font-semibold">{formName}</h1>
              </div>
              {showButtons && (
                <div className="flex items-center flex-shrink-0">
                  <div className="inline-flex rounded-md shadow-sm" role="group">
                    <Button
                      variant="outline"
                      onClick={handleCompare}
                      className="gap-2 rounded-r-none border-r-0"
                    >
                      <GitCompare className="size-4" />
                      <span>Compare</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button disabled={isDownloading} className="gap-2 min-w-[120px] rounded-l-none">
                          {isDownloading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="size-4" />
                              <span>Download</span>
                              <ChevronDown className="size-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={handleDownloadLatest}>
                          <span className="font-medium">Latest</span>
                        </DropdownMenuItem>
                        {completedInstances.length > 0 && <DropdownMenuSeparator />}
                        {completedInstances
                          .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime())
                          .map((instance) => (
                            <DropdownMenuItem
                              key={instance.id}
                              onClick={() => handleDownload(instance.id)}
                            >
                              {formatScheduledDate(instance.scheduledDate)}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0" />
          </div>

          {/* Main content area with sidebar and content */}
          <div className="flex h-full w-full flex-1 min-h-0">
            {/* Left sidebar navigation */}
            <div className="w-80 border-r bg-background flex-shrink-0 flex flex-col">
              <div className="flex-1 overflow-y-auto flex flex-col">
                {/* Instances list */}
                <div className="space-y-0 flex-1 overflow-y-auto">
                  {sortedInstances.map((instance, index) => {
                    const instanceHref = `/athletes/${clientId}/check-in/${checkInId}/${instance.id}`;
                    const isActive = pathname === instanceHref;
                    const isLast = index === sortedInstances.length - 1;

                    return (
                      <React.Fragment key={instance.id}>
                        <Link
                          href={instanceHref}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 text-sm transition-colors text-left',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                          )}
                        >
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-sm font-medium">{formatScheduledDate(instance.scheduledDate)}</span>
                            <span className="text-xs text-muted-foreground">
                              {getStatusLabel(instance.status)}
                            </span>
                          </div>
                          <Badge
                            variant={getStatusVariant(instance.status)}
                            className={cn("text-xs flex-shrink-0", getStatusClassName(instance.status))}
                          >
                            {getStatusLabel(instance.status)}
                          </Badge>
                        </Link>
                        {!isLast && <Separator className="w-full" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
          </div>
        </>
      )}
    </div>
  );
};

export default CheckInLayout;
