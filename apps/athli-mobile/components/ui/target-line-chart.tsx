import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { Line as SkiaLine, vec } from '@shopify/react-native-skia';

import { useThemePreference, useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { hexToRgba } from '@/utils/colorUtils';

type DataPoint = {
    value: number;
    date: string;
};

type TargetLineChartProps = {
    data: DataPoint[];
    targetValue: number;
    unit?: string;
};

type ChartDataPoint = {
    x: number;
    y: number;
    originalValue: number;
    date: string;
    label: string;
};

const formatShortDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    return `${day} ${month}`;
};

export const TargetLineChart = ({ data, targetValue, unit = '' }: TargetLineChartProps) => {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 64;
    const chartHeight = 180;

    // Transform data to show deviation from target
    const chartData = useMemo((): ChartDataPoint[] => {
        if (data.length === 0) return [];

        const labelInterval = Math.max(1, Math.ceil(data.length / 4));

        return data.map((item, index) => ({
            x: index,
            y: item.value - targetValue, // Deviation from target
            originalValue: item.value,
            date: item.date,
            label: index % labelInterval === 0 || index === data.length - 1
                ? formatShortDate(item.date)
                : '',
        }));
    }, [data, targetValue]);

    // Calculate symmetric range around zero (target)
    const { minValue, maxValue } = useMemo(() => {
        if (chartData.length === 0) return { minValue: -10, maxValue: 10 };
        const deviations = chartData.map(d => Math.abs(d.y));
        const maxDeviation = Math.max(...deviations, 1);
        const padding = maxDeviation * 0.2;
        const range = maxDeviation + padding;
        return {
            minValue: -range,
            maxValue: range,
        };
    }, [chartData]);

    if (chartData.length < 2) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.surfacePrimary }]}>
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('clientDetail.chart.notEnoughData')}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: themeColors.surfacePrimary }]}>
            {/* Target info */}
            <View style={styles.targetInfo}>
                <Text style={[styles.targetLabel, { color: themeColors.mutedText }]}>
                    {t('clientDetail.chart.target')}
                </Text>
                <Text style={[styles.targetValue, { color: themeColors.text }]}>
                    {targetValue}{unit ? ` ${unit}` : ''}
                </Text>
            </View>

            <View style={[styles.chartWrapper, { width: chartWidth, height: chartHeight }]}>
                <CartesianChart
                    data={chartData}
                    xKey="x"
                    yKeys={['y']}
                    domain={{ y: [minValue, maxValue] }}
                    axisOptions={{
                        tickCount: { x: 4, y: 4 },
                        labelColor: themeColors.mutedText,
                        lineColor: 'transparent',
                        formatXLabel: (value) => {
                            const index = Math.round(value);
                            if (index >= 0 && index < chartData.length) {
                                return chartData[index].label || '';
                            }
                            return '';
                        },
                        formatYLabel: (value) => {
                            if (value === 0) return `${targetValue}`;
                            if (value > 0) return `+${value.toFixed(0)}`;
                            return value.toFixed(0);
                        },
                    }}
                >
                    {({ points, chartBounds, yScale }) => {
                        // Calculate the y position for the reference line at y=0
                        const referenceLineY = yScale(0);

                        return (
                            <>
                                {/* Reference line at target (y=0) */}
                                <SkiaLine
                                    p1={vec(chartBounds.left, referenceLineY)}
                                    p2={vec(chartBounds.right, referenceLineY)}
                                    color={hexToRgba(themeColors.primary, 0.4)}
                                    strokeWidth={2}
                                />
                                <Line
                                    points={points.y}
                                    color={themeColors.primary}
                                    strokeWidth={2.5}
                                    curveType="natural"
                                    animate={{ type: 'timing', duration: 300 }}
                                />
                            </>
                        );
                    }}
                </CartesianChart>
            </View>

            {/* Legend */}
            <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={[styles.legendText, { color: themeColors.mutedText }]}>
                        {t('clientDetail.chart.aboveTarget')}
                    </Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={[styles.legendText, { color: themeColors.mutedText }]}>
                        {t('clientDetail.chart.belowTarget')}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 8,
    },
    chartWrapper: {
        marginTop: 8,
    },
    targetInfo: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        paddingHorizontal: 8,
    },
    targetLabel: {
        ...typography.p3,
    },
    targetValue: {
        ...typography.h4,
    },
    emptyState: {
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        ...typography.p2,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(150, 150, 150, 0.1)',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        ...typography.p3,
    },
});
