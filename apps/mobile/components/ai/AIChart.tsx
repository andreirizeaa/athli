import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { CartesianChart, Line, Bar, Area } from 'victory-native';
import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import type { ChartPayload } from '@/services/ai/ai-service';

const DEFAULT_COLORS = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
];

interface AIChartProps {
  chart: ChartPayload;
}

export function AIChart({ chart }: AIChartProps) {
  const { colors: themeColors } = useThemePreference();
  const { width: screenWidth } = useWindowDimensions();
  const { type, title, xAxisLabel, yAxisLabel, data, series } = chart;

  if (!data || data.length === 0 || !series || series.length === 0) return null;

  // Find x-axis key
  const seriesKeys = new Set(series.map((s) => s.dataKey));
  const xKey =
    Object.keys(data[0]).find((k) => !seriesKeys.has(k) && typeof data[0][k] === 'string') ||
    Object.keys(data[0])[0];

  // Assign colors
  const seriesColors = series.map((s, i) => s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]);

  const chartWidth = Math.min(screenWidth - 64, 320);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.surfacePrimary, borderColor: themeColors.border }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
      <View style={{ height: 200, width: chartWidth }}>
        <CartesianChart
          data={data as any[]}
          xKey={xKey as any}
          yKeys={series.map((s) => s.dataKey) as any}
          domainPadding={{ left: 10, right: 10, top: 10 }}
          axisOptions={{
            font: null,
            tickCount: { x: Math.min(data.length, 5), y: 5 },
            formatXLabel: (val: any) => {
              const str = String(val);
              if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
                const d = new Date(str);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }
              return str.length > 8 ? str.slice(0, 8) + '…' : str;
            },
            labelColor: themeColors.mutedText,
            lineColor: themeColors.border,
          }}
        >
          {({ points, chartBounds }) => {
            return series.map((s, i) => {
              const color = seriesColors[i];
              const pts = (points as any)[s.dataKey];
              if (!pts) return null;

              if (type === 'bar') {
                return (
                  <Bar
                    key={s.dataKey}
                    points={pts}
                    chartBounds={chartBounds}
                    color={color}
                    roundedCorners={{ topLeft: 4, topRight: 4 }}
                  />
                );
              }
              if (type === 'area') {
                return (
                  <Area
                    key={s.dataKey}
                    points={pts}
                    y0={chartBounds.bottom}
                    color={color}
                    opacity={0.2}
                  />
                );
              }
              // line (default)
              return (
                <Line
                  key={s.dataKey}
                  points={pts}
                  color={color}
                  strokeWidth={2}
                  curveType="natural"
                />
              );
            });
          }}
        </CartesianChart>
      </View>
      {(xAxisLabel || yAxisLabel) && (
        <View style={styles.axisLabels}>
          {xAxisLabel ? <Text style={[styles.axisLabel, { color: themeColors.mutedText }]}>{xAxisLabel}</Text> : null}
          {yAxisLabel ? <Text style={[styles.axisLabel, { color: themeColors.mutedText }]}>{yAxisLabel}</Text> : null}
        </View>
      )}
      {/* Legend */}
      {series.length > 1 && (
        <View style={styles.legend}>
          {series.map((s, i) => (
            <View key={s.dataKey} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seriesColors[i] }]} />
              <Text style={[styles.legendText, { color: themeColors.mutedText }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 8,
    gap: 8,
  },
  title: {
    ...typography.p2,
    fontWeight: '600',
  },
  axisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: 10,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
});
