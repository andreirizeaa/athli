import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { Dialog } from '@/components/ui/dialog';
import { ChevronLeft, ChevronDown, ChevronUp, GripVertical, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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


import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { useTranslations } from '@/stores';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { useModalCallbacks } from '@/stores';
import { Card } from '@/components/ui/card';
import {
    type BuilderItem,
    type BuilderSection,
    type BuilderExercise,
    isBuilderSection,
} from '@/components/features/workout/workout-schema';

// Row height constants
const ROW_HEIGHT = 56;
const ROW_GAP = 8;
const ITEM_HEIGHT = ROW_HEIGHT + ROW_GAP;
const SECTION_INDENT = 32;

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

    // First pass: collect exercises that belong to sections
    flatItems.forEach((item) => {
        if (item.type === 'exercise' && item.sectionId) {
            const exercises = sectionExercises.get(item.sectionId) || [];

            // Get the exercise from the original builder item
            let exercise: BuilderExercise;
            if ('type' in item.originalBuilderItem && item.originalBuilderItem.type === 'section') {
                // This shouldn't happen, but handle it gracefully
                return;
            } else {
                exercise = item.originalBuilderItem as BuilderExercise;
            }

            exercises.push(exercise);
            sectionExercises.set(item.sectionId, exercises);
        }
    });

    // Second pass: build the result maintaining order
    flatItems.forEach((item) => {
        // Skip exercises that belong to sections (they'll be nested)
        if (item.sectionId !== null) return;

        if (item.type === 'section') {
            const originalSection = item.originalBuilderItem as BuilderSection;
            // Use the collected exercises for this section, or empty array if none
            const exercises = sectionExercises.get(item.id) || [];
            result.push({
                ...originalSection,
                exercises,
            });
        } else {
            // Top-level exercise
            const exercise = item.originalBuilderItem as BuilderExercise;
            result.push(exercise);
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
    onDragStart: (sectionId?: string) => void;
    onDragEnd: (sectionId?: string) => void;
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
    onDragStart,
    onDragEnd,
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
        .minDistance(0)
        .shouldCancelWhenOutside(false)
        .onStart(() => {
            'worklet';
            isDragging.value = true;
            draggingIndex.value = index;
            hoverIndex.value = index;
            const sectionId = isSection ? item.id : undefined;
            runOnJS(onDragStart)(sectionId);
            runOnJS(haptics.medium)();
        })
        .onUpdate((event) => {
            'worklet';
            translateY.value = event.translationY;

            // Calculate displacement - requires dragging past half of an item to change position
            // This prevents immediate jumping and makes the drag feel more stable
            const halfItemHeight = ITEM_HEIGHT / 2;
            let displacement = 0;

            if (event.translationY > halfItemHeight) {
                displacement = Math.floor((event.translationY + halfItemHeight) / ITEM_HEIGHT);
            } else if (event.translationY < -halfItemHeight) {
                displacement = Math.ceil((event.translationY - halfItemHeight) / ITEM_HEIGHT);
            }

            let newHoverIndex = index + displacement;
            newHoverIndex = Math.max(0, Math.min(newHoverIndex, totalItems - 1));

            if (hoverIndex.value !== newHoverIndex) {
                hoverIndex.value = newHoverIndex;
                runOnJS(haptics.medium)();
            }
        })
        .onEnd(() => {
            'worklet';
            const finalIndex = hoverIndex.value;
            const startIndex = index;
            const sectionId = isSection ? item.id : undefined;

            // Reset the dragged item position
            translateY.value = 0;
            isDragging.value = false;

            // Notify parent of the completed drag
            if (finalIndex !== startIndex) {
                runOnJS(onDragComplete)(startIndex, finalIndex);
            } else {
                // No change, reset immediately
                draggingIndex.value = -1;
                hoverIndex.value = -1;
            }

            runOnJS(onDragEnd)(sectionId);
            runOnJS(haptics.medium)();
        });

    // Style for the dragged item
    const animatedDragStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: translateY.value },
                { scale: isDragging.value ? 1.05 : 1 },
            ],
            zIndex: isDragging.value ? 9999 : 1,
            elevation: isDragging.value ? 50 : 0,
        };
    });

    // Style for non-dragged items - they shift to make room
    const shiftStyle = useAnimatedStyle(() => {
        // When not dragging, no shift
        if (draggingIndex.value === -1) {
            return { transform: [{ translateY: 0 }] };
        }

        // The dragged item itself doesn't shift
        if (draggingIndex.value === index) {
            return { transform: [{ translateY: 0 }] };
        }

        const draggedFrom = draggingIndex.value;
        const hoveredAt = hoverIndex.value;

        let shift = 0;

        if (draggedFrom < hoveredAt) {
            // Dragging down: shift items between draggedFrom and hoveredAt up
            if (index > draggedFrom && index <= hoveredAt) {
                shift = -ITEM_HEIGHT;
            }
        } else if (draggedFrom > hoveredAt) {
            // Dragging up: shift items between hoveredAt and draggedFrom down
            if (index >= hoveredAt && index < draggedFrom) {
                shift = ITEM_HEIGHT;
            }
        }

        return {
            transform: [{ translateY: withTiming(shift, { duration: 200 }) }],
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
                    <Card style={styles.rowContent}>
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
                    </Card>
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
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);
    const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

    // Shared values for coordinating drag state
    const draggingIndex = useSharedValue(-1);
    const hoverIndex = useSharedValue(-1);

    // Track if changes have been made
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const initialItemsRef = useRef<BuilderItem[]>([]);

    // Dialog states
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    // Initialize items from context (only once on mount)
    useEffect(() => {
        if (reorderItems && reorderItems.length > 0) {
            const items = flattenBuilderItems(reorderItems, collapsedSections);
            setFlatItems(items);
            initialItemsRef.current = reorderItems;
            setHasUnsavedChanges(false);
        }
    }, [reorderItems]);

    // Update collapsed state on sections when it changes
    useEffect(() => {
        if (flatItems.length > 0) {
            setFlatItems(prev => {
                // Update the isCollapsed flag on sections
                // Keep ALL items in state, including exercises in collapsed sections
                return prev.map(item => {
                    if (item.type === 'section') {
                        return {
                            ...item,
                            isCollapsed: collapsedSections.has(item.id),
                        };
                    }
                    return item;
                });
            });
        }
    }, [collapsedSections]);

    const handleToggleSection = useCallback((sectionId: string) => {
        haptics.medium();
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

    // Called when a drag completes
    const handleDragComplete = useCallback((fromIndex: number, toIndex: number) => {
        // Mark as having unsaved changes
        setHasUnsavedChanges(true);

        setFlatItems(prev => {
            const newItems = [...prev];
            const [movedItem] = newItems.splice(fromIndex, 1);

            // Determine section membership based on drop position
            let newSectionId: string | null = null;
            const itemBefore = toIndex > 0 ? newItems[toIndex - 1] : null;

            // Only exercises can change section membership (sections cannot be nested)
            if (movedItem.type === 'exercise') {
                if (itemBefore) {
                    if (itemBefore.type === 'section' && !itemBefore.isCollapsed) {
                        // DRAG INTO: Dropped right after expanded section header
                        newSectionId = itemBefore.id;
                    } else if (itemBefore.type === 'exercise' && itemBefore.sectionId !== null) {
                        // DRAG INTO: Dropped after an exercise that's in a section
                        newSectionId = itemBefore.sectionId;
                    }
                    // DRAG OUT: If itemBefore is top-level exercise, newSectionId stays null
                }
                // DRAG OUT: If dropped at position 0, newSectionId stays null

                // CRITICAL: Create NEW object to trigger React re-render
                // This updates the visual indent immediately
                const updatedItem: FlatItem = {
                    ...movedItem,
                    sectionId: newSectionId,
                };
                newItems.splice(toIndex, 0, updatedItem);
            } else {
                // Sections cannot be nested - just reorder
                newItems.splice(toIndex, 0, movedItem);
            }

            return newItems;
        });

        // Reset drag state
        requestAnimationFrame(() => {
            draggingIndex.value = -1;
            hoverIndex.value = -1;
        });
    }, [draggingIndex, hoverIndex]);

    const handleDragStart = useCallback((sectionId?: string) => {
        setIsScrollEnabled(false);

        // If dragging a section, collapse it
        if (sectionId) {
            setDraggingSectionId(sectionId);
            setCollapsedSections(prev => {
                const next = new Set(prev);
                next.add(sectionId);
                return next;
            });
        }
    }, []);

    const handleDragEnd = useCallback((sectionId?: string) => {
        setIsScrollEnabled(true);

        // If we were dragging a section, expand it back
        if (sectionId && draggingSectionId === sectionId) {
            setCollapsedSections(prev => {
                const next = new Set(prev);
                next.delete(sectionId);
                return next;
            });
            setDraggingSectionId(null);
        }
    }, [draggingSectionId]);

    const handleSave = useCallback(() => {
        // Convert flatItems back to BuilderItems and save
        const builderItems = unflattenToBuilderItems(flatItems);
        triggerReorder(builderItems);
        setHasUnsavedChanges(false);
        router.back();
    }, [flatItems, triggerReorder, router]);

    const handleDiscard = useCallback(() => {
        setShowDiscardDialog(false);
        router.back();
    }, [router]);

    const handleBack = useCallback(() => {
        if (hasUnsavedChanges) {
            setShowDiscardDialog(true);
        } else {
            router.back();
        }
    }, [hasUnsavedChanges, router]);

    const HEADER_HEIGHT = 52;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 }
                    ]}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={isScrollEnabled}
                    keyboardDismissMode="on-drag"
                >
                    {/* Reorderable List */}
                    <View style={styles.listContainer}>
                        {flatItems
                            .map((item, originalIndex) => ({ item, originalIndex }))
                            .filter(({ item }) => {
                                // Only show exercises that are NOT in collapsed sections
                                if (item.type === 'exercise' && item.sectionId) {
                                    return !collapsedSections.has(item.sectionId);
                                }
                                // Always show sections and top-level exercises
                                return true;
                            })
                            .map(({ item, originalIndex }, visualIndex) => (
                                <DraggableRow
                                    key={item.id}
                                    item={item}
                                    index={originalIndex}
                                    totalItems={flatItems.length}
                                    onToggleSection={handleToggleSection}
                                    onDragComplete={handleDragComplete}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                    draggingIndex={draggingIndex}
                                    hoverIndex={hoverIndex}
                                    themeColors={themeColors}
                                />
                            ))}
                    </View>
                </ScrollView>

                <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

                <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
                    <IconButton
                        icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
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
                        color={hasUnsavedChanges ? themeColors.primary : themeColors.mutedText}
                        disabled={!hasUnsavedChanges}
                    />
                </View>

                <Dialog
                    visible={showDiscardDialog}
                    onClose={() => setShowDiscardDialog(false)}
                    title={t('common.discardChanges')}
                    message={t('common.discardChangesMessage')}
                    buttons={[
                        { label: t('common.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                        { label: t('common.discard'), onPress: handleDiscard, variant: 'destructive' }
                    ]}
                />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 8,
        zIndex: 1001,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
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
        paddingVertical: 0,
        paddingHorizontal: 12,
        marginBottom: 0,
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
