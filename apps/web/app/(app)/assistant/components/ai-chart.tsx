'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { ChartPayload } from '@/api/ai/ai-service';

const DEFAULT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

interface AIChartProps {
  chart: ChartPayload;
}

export function AIChart({ chart }: AIChartProps) {
  const { type, title, xAxisLabel, yAxisLabel, data, series } = chart;

  if (!data || data.length === 0 || !series || series.length === 0) {
    return null;
  }

  // Build ChartConfig from series
  const chartConfig: ChartConfig = {};
  series.forEach((s, i) => {
    chartConfig[s.dataKey] = {
      label: s.label,
      color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    };
  });

  // Find the x-axis key (first string field not in series)
  const seriesKeys = new Set(series.map((s) => s.dataKey));
  const xKey =
    Object.keys(data[0]).find((k) => !seriesKeys.has(k) && typeof data[0][k] === 'string') ||
    Object.keys(data[0])[0];

  const renderChart = () => {
    const commonAxisProps = {
      tickLine: false as const,
      axisLine: false as const,
      tickMargin: 8,
    };

    const xAxisProps = {
      dataKey: xKey,
      ...commonAxisProps,
      tickFormatter: (value: string) => {
        // Shorten date strings for readability
        if (value && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          const d = new Date(value);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        // Truncate long labels
        return value.length > 12 ? value.slice(0, 12) + '...' : value;
      },
    };

    const yAxisProps = {
      ...commonAxisProps,
      width: 50,
    };

    if (type === 'line') {
      return (
        <LineChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={`var(--color-${s.dataKey})`}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      );
    }

    if (type === 'bar') {
      return (
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {series.map((s, i) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              fill={`var(--color-${s.dataKey})`}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      );
    }

    // area
    return (
      <AreaChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {series.map((s, i) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            stroke={`var(--color-${s.dataKey})`}
            fill={`var(--color-${s.dataKey})`}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    );
  };

  return (
    <div className="my-3 w-full rounded-lg border bg-card p-4">
      <h4 className="mb-3 text-sm font-medium text-foreground">{title}</h4>
      <ChartContainer config={chartConfig} className="h-64 w-full">
        {renderChart()}
      </ChartContainer>
      {(xAxisLabel || yAxisLabel) && (
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          {xAxisLabel && <span>{xAxisLabel}</span>}
          {yAxisLabel && <span>{yAxisLabel}</span>}
        </div>
      )}
    </div>
  );
}
