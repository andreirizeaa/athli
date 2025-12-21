'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Edit } from 'lucide-react';
import { PieChart, Pie, Label } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { getWorkoutStatistics, type WorkoutStatistics } from '@/lib/client/client-athlete-service';

type AthleteWorkoutsCardProps = {
  clientId: string;
};

const chartConfig = {
  value: {
    label: 'Workouts',
  },
  completed: {
    label: 'Completed',
    color: 'var(--chart-3)', // Primary orange
  },
  inProgress: {
    label: 'In Progress',
    color: 'var(--chart-2)', // Medium orange
  },
  notStarted: {
    label: 'Not Started',
    color: 'var(--chart-1)', // Lightest orange
  },
} satisfies ChartConfig;

export const AthleteWorkoutsCard = ({ clientId }: AthleteWorkoutsCardProps) => {
  const t = useTranslations();
  const [last7DaysStats, setLast7DaysStats] = useState<WorkoutStatistics | null>(null);
  const [last30DaysStats, setLast30DaysStats] = useState<WorkoutStatistics | null>(null);
  const [nextWeekStats, setNextWeekStats] = useState<WorkoutStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const [last7, last30, next] = await Promise.all([
          getWorkoutStatistics(clientId, 'last7Days'),
          getWorkoutStatistics(clientId, 'last30Days'),
          getWorkoutStatistics(clientId, 'nextWeek'),
        ]);
        setLast7DaysStats(last7);
        setLast30DaysStats(last30);
        setNextWeekStats(next);
      } catch (error) {
        console.error('Failed to fetch workout statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatistics();
  }, [clientId]);

  const formatDataForChart = (stats: WorkoutStatistics) => {
    return [
      { name: 'completed', value: stats.completed, fill: 'var(--color-completed)' },
      { name: 'inProgress', value: stats.inProgress, fill: 'var(--color-inProgress)' },
      { name: 'notStarted', value: stats.notStarted, fill: 'var(--color-notStarted)' },
    ].filter((item) => item.value > 0);
  };

  const getTotalWorkouts = (stats: WorkoutStatistics): number => {
    return stats.completed + stats.inProgress + stats.notStarted;
  };

  return (
    <Card className="bg-background flex flex-col flex-1 min-w-0" style={{ height: '240px', minHeight: '240px', maxHeight: '240px' }}>
      <CardHeader className="px-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle>Athlete Workouts</CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-2 invisible"
            aria-hidden="true"
            tabIndex={-1}
          >
            <Edit className="h-3 w-3" />
            {t('general.edit')}
          </Button>
        </div>
      </CardHeader>
      <Separator className="w-full mt-[-8px] flex-shrink-0" />
      <CardContent className="px-4 py-0 flex-1 mt-[-12px] -mb-[12px] flex overflow-y-auto">
        <div className="flex-1 flex flex-col items-center mt-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Last 7 Days</div>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">{t('general.loading')}</p>
            </div>
          ) : last7DaysStats ? (
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[130px] w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={formatDataForChart(last7DaysStats)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={34}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-semibold"
                            >
                              {getTotalWorkouts(last7DaysStats)}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : null}
        </div>
        <div className="flex-1 flex flex-col items-center mt-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Last 30 Days</div>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">{t('general.loading')}</p>
            </div>
          ) : last30DaysStats ? (
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[130px] w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={formatDataForChart(last30DaysStats)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={34}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-semibold"
                            >
                              {getTotalWorkouts(last30DaysStats)}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          ) : null}
        </div>
        <div className="flex-1 flex flex-col items-center mt-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Next Week</div>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground">{t('general.loading')}</p>
            </div>
          ) : nextWeekStats ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-2xl font-semibold text-foreground">{getTotalWorkouts(nextWeekStats)}</p>
              <p className="text-xs text-muted-foreground mt-1">ASSIGNED</p>
            </div>
          ) : null}
        </div>
      </CardContent>
      <Separator className="w-full" />
    </Card>
  );
};

