'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { ListTodo, ClipboardList } from 'lucide-react';
import { useCoachTodo } from '@/hooks/use-coach-todo';
import { useQuery } from '@tanstack/react-query';
import { getCheckInReviews } from '@/api/coach/coach-check-in-service';

export const SummaryCards = () => {
  const t = useTranslations();
  const router = useRouter();

  const { ownTodos, autoTodos } = useCoachTodo();
  const { data: reviews = [] } = useQuery({
    queryKey: ['check-in-reviews'],
    queryFn: getCheckInReviews,
    staleTime: 5 * 60 * 1000,
  });

  const totalTodos = ownTodos.length + autoTodos.length;
  const reviewCount = reviews.length;

  return (
    <div className="flex gap-3">
      {/* Todos Card */}
      <Card
        className="flex-1 cursor-pointer hover:bg-accent transition-colors p-3"
        onClick={() => router.push('/todo/your-list')}
      >
        <span className="text-xs text-muted-foreground">{t('home.summaryCards.todos')}</span>
        <div className="flex items-center gap-2 mt-2">
          {totalTodos > 0 ? (
            <>
              <span className="text-xl font-bold">{totalTodos}</span>
              <span className="text-xs text-muted-foreground">{t('home.summaryCards.outstanding')}</span>
            </>
          ) : (
            <>
              <ListTodo className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">{t('home.summaryCards.allCaughtUp')}</span>
            </>
          )}
        </div>
      </Card>

      {/* Check-ins Card */}
      <Card
        className="flex-1 cursor-pointer hover:bg-accent transition-colors p-3"
        onClick={() => router.push('/check-ins')}
      >
        <span className="text-xs text-muted-foreground">{t('home.summaryCards.checkIns')}</span>
        <div className="flex items-center gap-2 mt-2">
          {reviewCount > 0 ? (
            <>
              <span className="text-xl font-bold">{reviewCount}</span>
              <span className="text-xs text-muted-foreground">{t('home.summaryCards.awaitingReview')}</span>
            </>
          ) : (
            <>
              <ClipboardList className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">{t('home.summaryCards.allCaughtUp')}</span>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
