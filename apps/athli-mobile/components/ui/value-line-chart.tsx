import React, { useMemo } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { CartesianChart, Line, Area } from 'victory-native';
import { LinearGradient, vec } from '@shopify/react-native-skia';

import { useThemePreference, useTranslations } from '@/stores';
import { typography } from '@/constants/typography';

type DataPoint = {
    value: number;
    date: string;
    label?: string;
    dataPointText?: string;
};

type ValueLineChartProps = {
    data: DataPoint[];
};

type ChartDataPoint = {
    x: number;
    y: number;
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

export const ValueLineChart = ({ data }: ValueLineChartProps) => {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 64;
    const chartHeight = 180;

    const chartData = useMemo((): ChartDataPoint[] => {
        if (data.length === 0) return [];

        const labelInterval = Math.max(1, Math.ceil(data.length / 4));

        return data.map((item, index) => ({
            x: index,
            y: item.value,
            date: item.date,
            label: index % labelInterval === 0 || index === data.length - 1
                ? formatShortDate(item.date)
                : '',
        }));
    }, [data]);

    const { minValue, maxValue } = useMemo(() => {
        if (chartData.length === 0) return { minValue: 0, maxValue: 100 };
        const values = chartData.map(d => d.y);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1 || 10;
        return {
            minValue: Math.max(0, min - padding),
            maxValue: max + padding,
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
                    }}
                >
                    {({ points, chartBounds }) => (
                        <>
                            <Area
                                points={points.y}
                                y0={chartBounds.bottom}
                                curveType="natural"
                                animate={{ type: 'timing', duration: 300 }}
                            >
                                <LinearGradient
                                    start={vec(0, chartBounds.top)}
                                    end={vec(0, chartBounds.bottom)}
                                    colors={[
                                        themeColors.primary + '4D',
                                        themeColors.primary + '00',
                                    ]}
                                />
                            </Area>
                            <Line
                                points={points.y}
                                color={themeColors.primary}
                                strokeWidth={2.5}
                                curveType="natural"
                                animate={{ type: 'timing', duration: 300 }}
                            />
                        </>
                    )}
                </CartesianChart>
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
    chartWrapper: {},
    emptyState: {
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        ...typography.p2,
    },
});
