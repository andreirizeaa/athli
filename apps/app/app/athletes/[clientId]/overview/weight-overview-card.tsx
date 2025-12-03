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
import { getWeightOverview, type WeightDataPoint } from '@/lib/athletes/athlete-service';

type WeightOverviewCardProps = {
  clientId: string;
};

const chartConfig = {
  weight: {
    label: 'Weight',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

export const WeightOverviewCard = ({ clientId }: WeightOverviewCardProps) => {
  const t = useTranslations();
  const [chartData, setChartData] = useState<WeightDataPoint[]>([]);
  const [startingWeight, setStartingWeight] = useState<number>(80);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      if (!clientId) return;

      setIsLoading(true);
      try {
        const result = await getWeightOverview(clientId);
        // Round all weights to whole numbers
        const roundedData = result.dataPoints.map((point) => ({
          ...point,
          weight: Math.round(point.weight),
        }));
        setChartData(roundedData);
        setStartingWeight(Math.round(result.startingWeight));
      } catch (error) {
        console.error('Failed to fetch weight overview:', error);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [clientId]);

  // Calculate domain and ticks centered around starting weight with increments of 5
  const getWeightDomainAndTicks = () => {
    const roundedStartingWeight = Math.round(startingWeight);
    // Round to nearest multiple of 5 for the center
    const centerWeight = Math.round(roundedStartingWeight / 5) * 5;
    
    // Create ticks in increments of 5
    const ticks = [
      centerWeight - 30,
      centerWeight - 25,
      centerWeight - 20,
      centerWeight - 15,
      centerWeight - 10,
      centerWeight - 5,
      centerWeight,
      centerWeight + 5,
      centerWeight + 10,
      centerWeight + 15,
      centerWeight + 20,
      centerWeight + 25,
      centerWeight + 30,
    ];
    return {
      min: centerWeight - 30,
      max: centerWeight + 30,
      ticks,
    };
  };

  const { min, max, ticks } = getWeightDomainAndTicks();

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
        <CardTitle>{t('athletes.profile.weightOverview')}</CardTitle>
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
                domain={[min, max]}
                tickLine={false}
                axisLine={false}
                tickMargin={0}
                tickFormatter={(value) => `${value}kg`}
                ticks={ticks}
                style={{ fontSize: '11px' }}
              />
              <ReferenceLine y={Math.round(startingWeight / 5) * 5} stroke="hsl(var(--foreground))" strokeWidth={1} opacity={0.5} />
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
                dataKey="weight"
                type="monotone"
                stroke="var(--color-weight)"
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

