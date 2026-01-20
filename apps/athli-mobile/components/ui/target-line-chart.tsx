import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { Line as SkiaLine, vec, DashPathEffect, useFont } from '@shopify/react-native-skia';

import { useThemePreference, useTranslations } from '@/stores';
import { typography } from '@/constants/typography';

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
    const font = useFont(require('../../assets/fonts/SpaceMono-Regular.ttf'), 12);
    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 64;
    const chartHeight = 180;

    // Transform data to show deviation from target
    const chartData = useMemo((): ChartDataPoint[] => {
        if (data.length === 0) return [];

        return data.map((item, index) => ({
            x: index,
            y: item.value - targetValue, // Deviation from target
            originalValue: item.value,
            date: item.date,
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

    // Date labels for X axis
    const startDate = chartData.length > 0 ? formatShortDate(chartData[0].date) : '';
    const middleIndex = Math.floor((chartData.length - 1) / 2);
    const middleDate = chartData.length > 2 ? formatShortDate(chartData[middleIndex].date) : '';
    const endDate = chartData.length > 0 ? formatShortDate(chartData[chartData.length - 1].date) : '';

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
                    {t('clientDetail.chart.target')}:
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
                    domain={{
                        x: [0, chartData.length - 1],
                        y: [minValue, maxValue],
                    }}
                    axisOptions={{
                        font,
                        tickCount: { x: 0, y: 4 },
                        labelColor: themeColors.mutedText,
                        lineColor: 'transparent',
                        axisSide: { x: 'bottom', y: 'left' },
                        formatYLabel: (value) => {
                            const actualValue = targetValue + value;
                            return actualValue.toFixed(0);
                        },
                    }}
                >
                    {({ points, chartBounds, yScale }) => {
                        // Calculate the y position for the reference line at y=0
                        const referenceLineY = yScale(0);

                        return (
                            <>
                                {/* Reference line at target (y=0) - dashed horizontal line */}
                                <SkiaLine
                                    p1={vec(chartBounds.left, referenceLineY)}
                                    p2={vec(chartBounds.right, referenceLineY)}
                                    color={themeColors.mutedText}
                                    strokeWidth={1.5}
                                >
                                    <DashPathEffect intervals={[6, 4]} />
                                </SkiaLine>
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

            {/* Date labels */}
            <View style={[styles.dateLabels, { width: chartWidth }]}>
                <Text style={[styles.dateLabel, { color: themeColors.mutedText }]}>
                    {startDate}
                </Text>
                {middleDate && (
                    <Text style={[styles.dateLabel, { color: themeColors.mutedText }]}>
                        {middleDate}
                    </Text>
                )}
                <Text style={[styles.dateLabel, { color: themeColors.mutedText }]}>
                    {endDate}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 24,
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    chartWrapper: {},
    targetInfo: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    targetLabel: {
        ...typography.p3,
    },
    targetValue: {
        ...typography.h4,
    },
    dateLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -12,
    },
    dateLabel: {
        fontFamily: 'SpaceMono',
        fontSize: 12,
    },
    emptyState: {
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        ...typography.p2,
    },
});
