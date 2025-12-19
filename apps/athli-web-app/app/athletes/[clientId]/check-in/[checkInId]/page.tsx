'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';

// Mock check-ins data - in production this would come from an API
const mockCheckIns = [
  {
    id: 'checkin-1',
    name: 'Weekly Check-in',
    questionCount: 5,
    schedule: 'Every Monday',
    description: 'Weekly progress check-in form',
  },
  {
    id: 'checkin-2',
    name: 'Monthly Assessment',
    questionCount: 12,
    schedule: 'First of each month',
    description: 'Comprehensive monthly assessment',
  },
  {
    id: 'checkin-3',
    name: 'Daily Check-in',
    questionCount: 3,
    schedule: 'Daily',
    description: 'Quick daily check-in',
  },
];

const CheckInDetailPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams<{ clientId: string; checkInId: string }>();
  const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
  const checkInId = Array.isArray(params.checkInId) ? params.checkInId[0] : params.checkInId;

  const checkIn = mockCheckIns.find((c) => c.id === checkInId);

  const handleBreadcrumbClick = () => {
    router.push(`/athletes/${clientId}/check-in`);
  };

  if (!checkIn) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Check-in not found</h1>
          <p className="text-muted-foreground">The check-in you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden">
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex flex-col gap-1 mb-2 mt-2">
          <Breadcrumb>
            <BreadcrumbList className="text-xs gap-1">
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={handleBreadcrumbClick}
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground px-0.5 py-0.5 rounded transition-colors text-foreground"
                >
                  {t('athletes.profile.checkIn')}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-muted-foreground/60">
                <ChevronRight className="h-2 w-2" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground px-0.5">
                  {checkIn.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-[22px] font-semibold">{checkIn.name}</h1>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 min-h-0 bg-background">
        {/* Content will go here */}
      </div>
    </div>
  );
};

export default CheckInDetailPage;
