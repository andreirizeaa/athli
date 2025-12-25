'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { useSupabaseAuth } from '@/lib/providers/supabase-auth-provider';
import { useGlobalData } from '@/providers/global-data-provider';
import { toast } from 'sonner';

type ReferralData = {
  id: string;
  coach: string;
  date: Date;
  status: 'Signed up' | 'Free trial' | 'Paid Plan';
};

// Mock data - replace with actual data from API
const mockReferrals: ReferralData[] = [
  {
    id: '1',
    coach: 'John Smith',
    date: new Date('2025-02-26'),
    status: 'Paid Plan',
  },
  {
    id: '2',
    coach: 'Jane Doe',
    date: new Date('2025-02-20'),
    status: 'Free trial',
  },
  {
    id: '3',
    coach: 'Mike Johnson',
    date: new Date('2025-02-15'),
    status: 'Signed up',
  },
];

const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
};

const ReferAndEarnPage = () => {
  const t = useTranslations('referAndEarn');
  const { user } = useSupabaseAuth();
  const { uniqueCode } = useGlobalData();
  const [isCopied, setIsCopied] = useState(false);

  const steps = [
    {
      title: t('steps.referFriends.title'),
      description: t('steps.referFriends.description'),
    },
    {
      title: t('steps.friendSignsUp.title'),
      description: t('steps.friendSignsUp.description'),
    },
    {
      title: t('steps.coachJoinsPaidPlan.title'),
      description: t('steps.coachJoinsPaidPlan.description'),
    },
    {
      title: t('steps.rewardGifted.title'),
      description: t('steps.rewardGifted.description'),
    },
    {
      title: t('steps.referMoreCoaches.title'),
      description: t('steps.referMoreCoaches.description'),
    },
  ];

  const handleCopyReferralLink = async () => {
    if (!uniqueCode) {
      toast.error('Unable to generate referral link. Please try again.');
      return;
    }

    const referralLink = `${window.location.origin}/coach/referral/${uniqueCode}`;

    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      toast.success(t('referralLinkCopied'));

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        toast.success(t('referralLinkCopied'));
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } catch (fallbackErr) {
        toast.error(t('copyFailed'));
      }
      document.body.removeChild(textArea);
    }
  };

  const getStatusTranslation = (status: ReferralData['status']): string => {
    switch (status) {
      case 'Signed up':
        return t('status.signedUp');
      case 'Free trial':
        return t('status.freeTrial');
      case 'Paid Plan':
        return t('status.paidPlan');
      default:
        return status;
    }
  };

  const columns: ColumnDefinition<ReferralData>[] = [
    {
      id: 'coach',
      label: t('columns.coach'),
      width: { class: 'w-[200px]', pixel: '200px' },
      sortable: true,
      getSortValue: (row) => row.coach,
      renderCell: (row) => (
        <div className="flex items-center w-full">
          <span className="text-sm">{row.coach}</span>
        </div>
      ),
    },
    {
      id: 'date',
      label: t('columns.date'),
      width: { class: 'w-[150px]', pixel: '150px' },
      sortable: true,
      getSortValue: (row) => row.date.getTime(),
      renderCell: (row) => (
        <div className="flex items-center w-full">
          <span className="text-sm">{formatDate(row.date)}</span>
        </div>
      ),
    },
    {
      id: 'status',
      label: t('columns.status'),
      width: { class: 'w-[150px]', pixel: '150px' },
      sortable: true,
      getSortValue: (row) => row.status,
      renderCell: (row) => (
        <div className="flex items-center w-full">
          <span className="text-sm">{getStatusTranslation(row.status)}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background overflow-auto">
      <div className="w-full relative flex-shrink-0">
        <div className="px-4 flex items-start justify-between gap-4 mb-2 mt-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h1 className="text-[22px] font-semibold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground -mt-[6px]">
              {t('subtitle')}
            </p>
          </div>
          <Button
            onClick={handleCopyReferralLink}
            className="flex-shrink-0 gap-2"
            variant="default"
          >
            {isCopied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            <span>{t('copyReferralLink')}</span>
          </Button>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 px-4 py-4 flex gap-4">
        {/* Left side - Timeline */}
        <div className="w-1/2 flex-shrink-0 h-full flex justify-center">
          <div className="relative ml-6 h-full flex flex-col justify-between">
            {steps.map(({ title, description }, index) => {
              const isLast = index === steps.length - 1;
              const isFirst = index === 0;
              return (
                <div key={index} className="relative pl-10 flex-1 flex flex-col justify-center">
                  {/* Timeline Icon */}
                  <div className="absolute left-px -translate-x-1/2 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-primary ring-8 ring-background z-10">
                    <span className="font-semibold text-lg text-primary-foreground">{index + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <h3 className="text-l font-semibold tracking-[-0.01em]">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side - DataGrid */}
        <div className="w-1/2 flex-shrink-0 px-4">
          <DataGrid
            data={mockReferrals}
            columns={columns}
            getRowId={(row) => row.id}
            gridKey="referrals"
            enableSearch={false}
            showPagination={false}
            gridPadding={false}
          />
        </div>
      </div>
    </div>
  );
};

export default ReferAndEarnPage;

