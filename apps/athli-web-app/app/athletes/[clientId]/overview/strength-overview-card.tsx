'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ReferenceLine } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { getStrengthOverview, type StrengthDataPoint } from '@/lib/athletes/athlete-service';

type StrengthOverviewCardProps = {
  clientId: string;
};

const chartConfig = {
  strength: {
    label: 'Strength',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export const StrengthOverviewCard = ({ clientId }: StrengthOverviewCardProps) => {
  const t = useTranslations();
  const [chartData, setChartData] = useState<StrengthDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const data = await getStrengthOverview(clientId);
        setChartData(data);
      } catch (error) {
        console.error('Failed to fetch strength overview:', error);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [clientId]);

  // Get only first and last date for x-axis
  const getXAxisTicks = () => {
    if (chartData.length === 0) return [];
    if (chartData.length === 1) return [chartData[0].date];
    return [chartData[0].date, chartData[chartData.length - 1].date];
  };

  const xAxisTicks = getXAxisTicks();

  return (
    <Card className="bg-background w-full flex flex-col" style={{ height: '300px', minHeight: '300px', maxHeight: '300px' }}>
      <CardHeader className="px-4 flex-shrink-0">
        <CardTitle>{t('athletes.profile.strengthOverview')}</CardTitle>
      </CardHeader>
      <Separator className="w-full mt-[-8px] flex-shrink-0" />
      <CardContent className="pl-0 pr-4 flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">{t('general.loading')}</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">{t('athletes.profile.noChartData')}</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 2,
                right: 12,
                top: 12,
                bottom: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <YAxis
                domain={[-100, 100]}
                tickLine={false}
                axisLine={false}
                tickMargin={0}
                tickFormatter={(value) => `${value}%`}
                ticks={[-100, -50, 0, 50, 100]}
                interval={0}
                allowDecimals={false}
                style={{ fontSize: '11px' }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={1} opacity={0.5} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                ticks={xAxisTicks}
                style={{ fontSize: '11px' }}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Line
                dataKey="strength"
                type="monotone"
                stroke="var(--color-strength)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
      <Separator className="w-full" />
    </Card>
  );
};

