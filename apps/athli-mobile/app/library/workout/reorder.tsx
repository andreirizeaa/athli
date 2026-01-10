import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Platform, Pressable, ScrollView } from 'react-native';
import { ChevronLeft, ChevronDown, ChevronUp, GripVertical, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
    SharedValue,
} from 'react-native-reanimated';
import {
    Gesture,
    GestureDetector,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { IconButton } from '@/components/icon-button';
import { useTranslations } from '@/contexts/useTranslations';
import { hexToRgba } from '@/utils/colorUtils';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import {
    type BuilderItem,
    type BuilderSection,
    type BuilderExercise,
    isBuilderSection,
} from '@/components/workout/workout-schema';

// Row height constants
const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const ITEM_HEIGHT = ROW_HEIGHT + ROW_GAP;
const SECTION_INDENT = 32;

// Animation config
const TIMING_CONFIG = { duration: 150 };

// Types for the flat list representation
type FlatItem = {
    id: string;
    name: string;
    type: 'exercise' | 'section';
    sectionId: string | null;
    isCollapsed?: boolean;
    originalBuilderItem: BuilderItem | BuilderExercise;
    hasNestedExercises?: boolean;
};

// Convert BuilderItems to flat list
const flattenBuilderItems = (items: BuilderItem[], collapsedSections: Set<string>): FlatItem[] => {
    const result: FlatItem[] = [];

    items.forEach((item) => {
        if (isBuilderSection(item)) {
            const section = item as BuilderSection;
            const isCollapsed = collapsedSections.has(section.id);

            result.push({
                id: section.id,
                name: section.name,
                type: 'section',
                sectionId: null,
                isCollapsed,
                originalBuilderItem: item,
                hasNestedExercises: section.exercises.length > 0,
            });

            if (!isCollapsed) {
                section.exercises.forEach((ex) => {
                    result.push({
                        id: ex.id,
                        name: ex.name,
                        type: 'exercise',
                        sectionId: section.id,
                        originalBuilderItem: ex as unknown as BuilderItem,
                    });
                });
            }
        } else {
            const exercise = item as BuilderExercise;
            result.push({
                id: exercise.id,
                name: exercise.name,
                type: 'exercise',
                sectionId: null,
                originalBuilderItem: item,
            });
        }
    });

    return result;
};

// Convert flat list back to BuilderItems  
const unflattenToBuilderItems = (flatItems: FlatItem[]): BuilderItem[] => {
    const result: BuilderItem[] = [];
    const sectionExercises = new Map<string, BuilderExercise[]>();

    flatItems.forEach((item) => {
        if (item.type === 'exercise' && item.sectionId) {
            const exercises = sectionExercises.get(item.sectionId) || [];
            exercises.push(item.originalBuilderItem as unknown as BuilderExercise);
            sectionExercises.set(item.sectionId, exercises);
        }
    });

    flatItems.forEach((item) => {
        if (item.sectionId !== null) return;

        if (item.type === 'section') {
            const originalSection = item.originalBuilderItem as BuilderSection;
            const exercises = sectionExercises.get(item.id) || originalSection.exercises;
            result.push({
                ...originalSection,
                exercises,
            });
        } else {
            result.push(item.originalBuilderItem);
        }
    });

    return result;
};

// Draggable Row Component
interface DraggableRowProps {
    item: FlatItem;
    index: number;
    totalItems: number;
    onToggleSection: (id: string) => void;
    onDragComplete: (fromIndex: number, toIndex: number) => void;
    draggingIndex: SharedValue<number>;
    hoverIndex: SharedValue<number>;
    themeColors: any;
}

const DraggableRow: React.FC<DraggableRowProps> = ({
    item,
    index,
    totalItems,
    onToggleSection,
    onDragComplete,
    draggingIndex,
    hoverIndex,
    themeColors,
}) => {
    const translateY = useSharedValue(0);
    const isDragging = useSharedValue(false);

    const isSection = item.type === 'section';
    const isNested = item.sectionId !== null;

    const panGesture = Gesture.Pan()
        .activateAfterLongPress(200)
        .onStart(() => {
            'worklet';
            isDragging.value = true;
            draggingIndex.value = index;
            hoverIndex.value = index;
            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        })
        .onUpdate((event) => {
            'worklet';
            translateY.value = event.translationY;

            const displacement = Math.round(event.translationY / ITEM_HEIGHT);
            let newHoverIndex = index + displacement;
            newHoverIndex = Math.max(0, Math.min(newHoverIndex, totalItems - 1));
            hoverIndex.value = newHoverIndex;
        })
        .onEnd(() => {
            'worklet';
            const finalIndex = hoverIndex.value;
            const startIndex = index;

            // Reset the dragged item position instantly
            translateY.value = 0;
            isDragging.value = false;

            // DON'T reset draggingIndex/hoverIndex here!
            // Keep them set so shifts stay in place until state updates
            // Parent will reset them after state update

            // Notify parent
            if (finalIndex !== startIndex) {
                runOnJS(onDragComplete)(startIndex, finalIndex);
            } else {
                // No change, reset immediately
                draggingIndex.value = -1;
                hoverIndex.value = -1;
            }

            runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        });

    // Style for the dragged item - instant changes, no animations
    const animatedDragStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: translateY.value },
                { scale: isDragging.value ? 1.02 : 1 },
            ],
        };
    });

    // Style for non-dragged items - they shift to make room
    // zIndex is here so it applies to the outermost wrapper
    const shiftStyle = useAnimatedStyle(() => {
        // Common properties for all items
        const baseStyle = {
            position: 'relative' as const,
            zIndex: isDragging.value ? 999 : 1,
            elevation: isDragging.value ? 20 : 0,
        };

        // When not dragging, reset instantly (no animation) to prevent flicker on drop
        if (draggingIndex.value === -1) {
            return { ...baseStyle, zIndex: 1, elevation: 0, transform: [{ translateY: 0 }] };
        }

        // The dragged item itself doesn't shift
        if (draggingIndex.value === index) {
            return { ...baseStyle, transform: [{ translateY: 0 }] };
        }

        const draggedFrom = draggingIndex.value;
        const hoveredAt = hoverIndex.value;

        let shift = 0;

        if (draggedFrom < index && hoveredAt >= index) {
            shift = -ITEM_HEIGHT;
        } else if (draggedFrom > index && hoveredAt <= index) {
            shift = ITEM_HEIGHT;
        }

        return {
            ...baseStyle,
            zIndex: 1,
            elevation: 0,
            transform: [{ translateY: withTiming(shift, TIMING_CONFIG) }],
        };
    });

    // Dragging card visual style - instant changes, no animations
    const draggingCardStyle = useAnimatedStyle(() => {
        return {
            shadowOpacity: isDragging.value ? 0.25 : 0,
            backgroundColor: themeColors.surfaceSecondary,
        };
    });

    const renderLeftIcon = () => {
        if (isSection) {
            const ChevronIcon = item.isCollapsed ? ChevronUp : ChevronDown;
            return (
                <Pressable
                    onPress={() => onToggleSection(item.id)}
                    style={styles.chevronButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ChevronIcon {...({ size: 20, color: themeColors.primary, strokeWidth: 2.5 } as any)} />
                </Pressable>
            );
        }
        return (
            <View style={styles.dotContainer}>
                <View style={[styles.dot, { backgroundColor: themeColors.mutedText }]} />
            </View>
        );
    };

    return (
        <Animated.View style={[styles.itemWrapper, shiftStyle]}>
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[
                        styles.rowWrapper,
                        isNested && { marginLeft: SECTION_INDENT },
                        animatedDragStyle,
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.rowContent,
                            { borderColor: themeColors.border },
                            draggingCardStyle,
                        ]}
                    >
                        {renderLeftIcon()}
                        <Text
                            style={[
                                styles.rowText,
                                { color: isSection ? themeColors.primary : themeColors.text },
                                isSection && styles.sectionText,
                            ]}
                            numberOfLines={1}
                        >
                            {item.name}
                        </Text>
                        <View style={styles.dragHandle}>
                            <GripVertical {...({ size: 20, color: themeColors.primary, strokeWidth: 1.5 } as any)} />
                        </View>
                    </Animated.View>
                </Animated.View>
            </GestureDetector>
        </Animated.View>
    );
};

export default function ReorderScreen() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { reorderItems, triggerReorder } = useModalCallbacks();

    const [flatItems, setFlatItems] = useState<FlatItem[]>([]);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

    // Shared values for coordinating drag state
    const draggingIndex = useSharedValue(-1);
    const hoverIndex = useSharedValue(-1);

    // Track pending reorders (accumulated during session)
    const pendingReordersRef = useRef<Array<{ from: number; to: number }>>([]);

    // Initialize items from context
    useEffect(() => {
        if (reorderItems && reorderItems.length > 0) {
            const items = flattenBuilderItems(reorderItems, collapsedSections);
            setFlatItems(items);
            pendingReordersRef.current = [];
        }
    }, [reorderItems]);

    // Re-flatten when collapse state changes
    useEffect(() => {
        if (flatItems.length > 0) {
            const builderItems = unflattenToBuilderItems(flatItems);
            const items = flattenBuilderItems(builderItems, collapsedSections);
            setFlatItems(items);
            pendingReordersRef.current = [];
        }
    }, [collapsedSections]);

    const handleToggleSection = useCallback((sectionId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCollapsedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) {
                next.delete(sectionId);
            } else {
                next.add(sectionId);
            }
            return next;
        });
    }, []);

    // Called when a drag completes - record the reorder
    const handleDragComplete = useCallback((fromIndex: number, toIndex: number) => {
        // Record this reorder
        pendingReordersRef.current.push({ from: fromIndex, to: toIndex });

        // Update state to reflect new order
        setFlatItems(prev => {
            const newItems = [...prev];
            const [movedItem] = newItems.splice(fromIndex, 1);
            newItems.splice(toIndex, 0, movedItem);
            return newItems;
        });

        // Reset shifts AFTER state update (next frame)
        requestAnimationFrame(() => {
            draggingIndex.value = -1;
            hoverIndex.value = -1;
        });
    }, [draggingIndex, hoverIndex]);

    const handleSave = useCallback(() => {
        const builderItems = unflattenToBuilderItems(flatItems);
        triggerReorder(builderItems);
        router.back();
    }, [flatItems, triggerReorder, router]);

    const handleBack = useCallback(() => {
        router.back();
    }, [router]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: themeColors.background }]}>
                {/* Fixed Header Gradient */}
                <View style={[styles.fixedHeader, { height: headerHeight }]}>
                    <LinearGradient
                        colors={[
                            hexToRgba(themeColors.background, 1),
                            hexToRgba(themeColors.background, 0.85),
                            hexToRgba(themeColors.background, 0.5),
                            hexToRgba(themeColors.background, 0),
                        ]}
                        locations={[0, 0.5, 0.8, 1]}
                        style={[styles.headerGradient, { height: gradientHeight }]}
                        pointerEvents="none"
                    />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top, paddingBottom: insets.bottom + 40 }
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <IconButton
                            icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
                            onPress={handleBack}
                            size="md"
                            color={themeColors.text}
                        />
                        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
                            {t('library.reorder.title')}
                        </Text>
                        <IconButton
                            icon={{ sf: 'checkmark', IconComponent: Check }}
                            onPress={handleSave}
                            size="md"
                            variant="primary"
                        />
                    </View>

                    {/* Reorderable List */}
                    <View style={styles.listContainer}>
                        {flatItems.map((item, index) => (
                            <DraggableRow
                                key={item.id}
                                item={item}
                                index={index}
                                totalItems={flatItems.length}
                                onToggleSection={handleToggleSection}
                                onDragComplete={handleDragComplete}
                                draggingIndex={draggingIndex}
                                hoverIndex={hoverIndex}
                                themeColors={themeColors}
                            />
                        ))}
                    </View>
                </ScrollView>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 12,
        marginBottom: 16,
        height: 56,
    },
    title: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
    },
    listContainer: {
        flex: 1,
    },
    itemWrapper: {
        // Container for shift animation
    },
    rowWrapper: {
        marginBottom: ROW_GAP,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        height: ROW_HEIGHT,
        borderRadius: 12,
        paddingHorizontal: 12,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
    },
    chevronButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    dotContainer: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    rowText: {
        ...typography.p1,
        flex: 1,
    },
    sectionText: {
        fontWeight: '600',
    },
    dragHandle: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
