import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Animated, InteractionManager } from 'react-native';
import { PressableOpacity } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { haptics } from '@/utils/haptics';

// Constants for layout
const SEGMENT_PADDING = 4;
const SEGMENT_GAP = 2;

// Create animated SquircleView for the sliding indicator
const AnimatedSquircleView = Animated.createAnimatedComponent(SquircleView);

export type TimeRange = '90d' | '6m' | '1y' | 'all';
export type PhotoView = 'all' | 'front' | 'back' | 'side';

type Segment<T extends string> = {
    label: string;
    value: T;
};

type SegmentedControlProps<T extends string> = {
    segments: Segment<T>[];
    value: T;
    onChange: (value: T) => void;
    backgroundColor?: string;
    noPadding?: boolean;
};

export const SegmentedControl = React.memo(function SegmentedControl<T extends string>({
    segments,
    value,
    onChange,
    backgroundColor,
    noPadding,
}: SegmentedControlProps<T>) {
    const { colors: themeColors } = useThemePreference();

    // Track the visual index separately from the actual value
    // This allows the animation to complete before triggering expensive re-renders
    const [visualIndex, setVisualIndex] = useState(() =>
        segments.findIndex((seg) => seg.value === value)
    );

    const [containerW, setContainerW] = useState(0);
    const SEG_COUNT = segments.length;

    const innerW = Math.max(0, containerW - SEGMENT_PADDING * 2);
    const segmentWidth = SEG_COUNT > 0 ? Math.floor((innerW - SEGMENT_GAP * (SEG_COUNT - 1)) / SEG_COUNT) : 0;

    // Calculate target position based on visual index
    const targetX = SEGMENT_PADDING + visualIndex * (segmentWidth + SEGMENT_GAP);

    // Use React Native's Animated API
    const translateX = useRef(new Animated.Value(targetX)).current;
    const widthAnim = useRef(new Animated.Value(segmentWidth)).current;

    // Track if this is the first render
    const isFirstRender = useRef(true);
    const pendingOnChange = useRef<T | null>(null);

    // Sync visual index with value prop when it changes externally
    useEffect(() => {
        const newIndex = segments.findIndex((seg) => seg.value === value);
        if (newIndex !== visualIndex && pendingOnChange.current === null) {
            setVisualIndex(newIndex);
        }
    }, [value, segments]);

    // Animate when visual index changes
    useEffect(() => {
        const newTargetX = SEGMENT_PADDING + visualIndex * (segmentWidth + SEGMENT_GAP);

        if (isFirstRender.current) {
            // On first render, just set values without animation
            translateX.setValue(newTargetX);
            widthAnim.setValue(segmentWidth);
            isFirstRender.current = false;
        } else if (segmentWidth > 0) {
            // Animate to new position
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: newTargetX,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // After animation completes, trigger the actual onChange
                if (pendingOnChange.current !== null) {
                    const valueToSend = pendingOnChange.current;
                    pendingOnChange.current = null;
                    // Use InteractionManager to ensure animation is complete
                    InteractionManager.runAfterInteractions(() => {
                        onChange(valueToSend);
                    });
                }
            });
        }
    }, [visualIndex, segmentWidth]);

    // Update width separately (instant, no animation needed)
    useEffect(() => {
        if (segmentWidth > 0) {
            widthAnim.setValue(segmentWidth);
        }
    }, [segmentWidth]);

    const handlePress = useCallback((segValue: T, segIndex: number, isActive: boolean) => {
        if (!isActive) {
            haptics.selection();
            // Store the pending value and update visual index immediately
            pendingOnChange.current = segValue;
            setVisualIndex(segIndex);
        }
    }, []);

    return (
        <View style={[styles.wrapper, noPadding && styles.wrapperNoPadding]}>
            <SquircleView
                cornerSmoothing={1}
                style={[styles.container, { backgroundColor: backgroundColor ?? themeColors.surfacePrimary }]}
                onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
            >
                <AnimatedSquircleView
                    cornerSmoothing={1}
                    style={[
                        styles.activeBackground,
                        {
                            backgroundColor: themeColors.backgroundPrimary,
                            width: segmentWidth,
                            transform: [{ translateX }],
                        },
                    ]}
                />
                {segments.map((seg, index) => {
                    const active = value === seg.value;
                    const visuallyActive = index === visualIndex;
                    return (
                        <PressableOpacity
                            key={seg.value}
                            style={[styles.segment, styles.segmentTouchable]}
                            onPress={() => handlePress(seg.value, index, active)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    { color: themeColors.mutedText },
                                    visuallyActive && [styles.segmentTextActive, { color: themeColors.text }],
                                ]}
                            >
                                {seg.label}
                            </Text>
                        </PressableOpacity>
                    );
                })}
            </SquircleView>
        </View>
    );
});

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
    },
    wrapperNoPadding: {
        paddingHorizontal: 0,
    },
    container: {
        flexDirection: 'row',
        borderRadius: 28,
        padding: 3,
        position: 'relative',
    },
    activeBackground: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: 14,
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
    },
    segmentTouchable: {
        zIndex: 1,
    },
    segmentText: {
        ...typography.p3,
        fontWeight: '500',
    },
    segmentTextActive: {
        fontWeight: '600',
    },
});

// Helper to filter logs by time range
export const filterLogsByTimeRange = <T extends { date: string }>(
    logs: T[],
    timeRange: TimeRange
): T[] => {
    if (timeRange === 'all') return logs;

    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
        case '90d':
            cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case '6m':
            cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
        case '1y':
            cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        default:
            return logs;
    }

    return logs.filter((log) => new Date(log.date) >= cutoffDate);
};
