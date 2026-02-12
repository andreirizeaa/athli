import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { CartesianChart, Line, Area } from 'victory-native';
import { Line as SkiaLine, vec, DashPathEffect, useFont, Group, Skia, LinearGradient } from '@shopify/react-native-skia';
import { hexToRgba } from '@/utils/colorUtils';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { Flame } from 'lucide-react-native';

import { useThemePreference, useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Card } from '@/components/ui/card';

type DataPoint = {
    value: number;
    date: string;
};

type TargetLineChartProps = {
    data: DataPoint[];
    targetValue: number;
    unit?: string;
    name?: string;
    streak?: number;
    renderHeaderRight?: () => React.ReactNode;
    renderFooter?: () => React.ReactNode;
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

export const TargetLineChart = ({ data, targetValue, unit = '', name, streak, renderHeaderRight, renderFooter }: TargetLineChartProps) => {
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

    // Line drawing animation (disabled for performance)
    const animationProgress = useSharedValue(1);

    // Animation disabled - set to 1 immediately for instant display
    // useEffect(() => {
    //     animationProgress.value = 0;
    //     animationProgress.value = withDelay(200, withTiming(1, { duration: 800 }));
    // }, [chartData]);

    const clipRect = useDerivedValue(() => {
        const width = chartWidth * animationProgress.value;
        return Skia.XYWHRect(0, 0, width, chartHeight + 50);
    });

    const streakColor = '#f97316';

    if (chartData.length < 2) {
        return (
            <Card variant="chart">
                {/* Header row with name and streak */}
                <View style={styles.headerRow}>
                    {name && (
                        <Text style={[styles.nameText, { color: themeColors.text }]} numberOfLines={1}>
                            {name}
                        </Text>
                    )}
                    <View style={styles.headerRightContainer}>
                        {streak !== undefined && (
                            <View style={[styles.streakPill, { backgroundColor: hexToRgba(streakColor, 0.15) }]}>
                                <PlatformIcon
                                    sf="flame.fill"
                                    IconComponent={Flame}
                                    size={14}
                                    color={streakColor}
                                />
                                <Text style={[styles.streakText, { color: streakColor }]}>
                                    {streak}
                                </Text>
                            </View>
                        )}
                        {renderHeaderRight?.()}
                    </View>
                </View>
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('clientDetail.chart.notEnoughData')}
                    </Text>
                </View>
                {renderFooter?.()}
            </Card>
        );
    }

    return (
        <Card variant="chart">
            {/* Header row with name and streak */}
            <View style={styles.headerRow}>
                {name && (
                    <Text style={[styles.nameText, { color: themeColors.text }]} numberOfLines={1}>
                        {name}
                    </Text>
                )}
                <View style={styles.headerRightContainer}>
                    {streak !== undefined && (
                        <View style={[styles.streakPill, { backgroundColor: hexToRgba(streakColor, 0.15) }]}>
                            <PlatformIcon
                                sf="flame.fill"
                                IconComponent={Flame}
                                size={14}
                                color={streakColor}
                            />
                            <Text style={[styles.streakText, { color: streakColor }]}>
                                {streak}
                            </Text>
                        </View>
                    )}
                    {renderHeaderRight?.()}
                </View>
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
                    frame={{ lineWidth: 0 }}
                    gestureLongPressDelay={3000}
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
                                <Group clip={clipRect}>
                                    {/* Green shadow for values above target */}
                                    <Area
                                        points={points.y}
                                        y0={referenceLineY}
                                        curveType="natural"
                                    >
                                        <LinearGradient
                                            start={vec(0, chartBounds.top)}
                                            end={vec(0, referenceLineY)}
                                            colors={[
                                                hexToRgba('#22c55e', 0.35),
                                                hexToRgba('#22c55e', 0),
                                            ]}
                                        />
                                    </Area>
                                    {/* Red shadow for values below target */}
                                    <Area
                                        points={points.y}
                                        y0={referenceLineY}
                                        curveType="natural"
                                    >
                                        <LinearGradient
                                            start={vec(0, referenceLineY)}
                                            end={vec(0, chartBounds.bottom)}
                                            colors={[
                                                hexToRgba('#ef4444', 0),
                                                hexToRgba('#ef4444', 0.35),
                                            ]}
                                        />
                                    </Area>
                                    <Line
                                        points={points.y}
                                        color="white"
                                        strokeWidth={2.5}
                                        curveType="natural"
                                    >
                                        <LinearGradient
                                            start={vec(0, chartBounds.top)}
                                            end={vec(0, chartBounds.bottom)}
                                            colors={['#22c55e', '#22c55e', '#ef4444', '#ef4444']}
                                            positions={[0, 0.48, 0.52, 1]}
                                        />
                                    </Line>
                                </Group>
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
            {renderFooter?.()}
        </Card>
    );
};

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        marginBottom: 16,
    },
    nameText: {
        ...typography.h5,
        flex: 1,
    },
    headerRightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chartWrapper: {},
    streakPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    streakText: {
        ...typography.p3,
        fontWeight: '600',
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
