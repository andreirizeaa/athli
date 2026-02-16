'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { getCheckInReviews, type CheckInReview } from '@/api/coach/coach-check-in-service';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, FileText, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

const CheckInsPage = () => {
  const t = useTranslations();
  const router = useRouter();
  const [reviews, setReviews] = useState<CheckInReview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const data = await getCheckInReviews();
      setReviews(data);
    } catch (error) {
      console.error('Failed to fetch check-in reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const columns: ColumnDefinition<CheckInReview>[] = [
    {
      id: 'client',
      label: 'Athlete',
      icon: <User className="size-3" />,
      sortable: true,
      width: { class: 'w-[250px]', pixel: '250px' },
      getSortValue: (row) => row.client_name.toLowerCase(),
      getSearchValue: (row) => row.client_name,
      renderCell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage src={row.client_avatar} alt={row.client_name} />
            <AvatarFallback>
              <User className="size-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{row.client_name}</span>
            <span className="text-xs text-muted-foreground">{row.client_email}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'checkin',
      label: 'Check-in Name',
      icon: <FileText className="size-3" />,
      sortable: true,
      width: { class: 'w-[250px]', pixel: '250px' },
      getSortValue: (row) => row.checkin_name.toLowerCase(),
      getSearchValue: (row) => row.checkin_name,
      renderCell: (row) => (
        <span className="text-sm font-medium">{row.checkin_name}</span>
      ),
    },
    {
      id: 'submitted',
      label: 'Submitted At',
      icon: <Calendar className="size-3" />,
      sortable: true,
      width: { class: 'w-[180px]', pixel: '180px' },
      getSortValue: (row) => new Date(row.submission_date).getTime(),
      getSearchValue: (row) => format(new Date(row.submission_date), 'MMM dd, yyyy HH:mm'),
      renderCell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm">{format(new Date(row.submission_date), 'MMM dd, yyyy')}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {format(new Date(row.submission_date), 'HH:mm')}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      width: { class: 'w-[120px]', pixel: '120px' },
      getSortValue: (row) => row.status,
      renderCell: (row) => (
        <span className="inline-flex items-center w-fit px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
          Awaiting Review
        </span>
      ),
    },
  ];

  const handleRowClick = (row: CheckInReview) => {
    router.push(`/check-ins/review/${row.client_id}/${row.coach_checkin_id}/${row.checkin_log_id}`);
  };

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-hidden font-sans">
      <div className="pl-4 pr-4 flex items-baseline gap-2 relative flex-shrink-0">
        <h1 className="text-[22px] font-semibold mb-2 mt-2">{t('checkInReviews.title')}</h1>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>

      <div className="flex-1 w-full overflow-hidden">
        <DataGrid<CheckInReview>
          data={reviews}
          columns={columns}
          getRowId={(row) => row.checkin_log_id}
          gridKey="check-in-reviews"
          enableSearch={true}
          searchPlaceholder="Search check-ins or athletes..."
          searchFields={['client_name', 'checkin_name', 'client_email']}
          onRowClick={handleRowClick}
          emptyMessage={t('checkInReviews.emptyMessage')}
          emptyState={
            <EmptyGridState
              title={t('checkInReviews.emptyState.title')}
              subtitle={t('checkInReviews.emptyState.subtitle')}
            />
          }
          gridPadding={true}
          showPagination={false}
          stickyFirstColumn={true}
          firstColumnId="client"
          firstColumnWidth="250px"
        />
      </div>
    </div>
  );
};

export default CheckInsPage;

