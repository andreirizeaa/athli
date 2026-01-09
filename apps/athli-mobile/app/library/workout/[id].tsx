import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { ChevronLeft, Check, Repeat, Plus, Dumbbell, Layers } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/dropdown-menu';
import { PressableScale } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mock workout data - this would come from a service in production
const MOCK_WORKOUTS: Record<string, { id: string; name: string; description: string; type: string; difficulty: string }> = {
    'workout-1': {
        id: 'workout-1',
        name: 'Full Body Strength Training',
        description: 'A comprehensive full body workout focusing on compound movements and progressive overload.',
        type: 'weightlifting',
        difficulty: 'intermediate',
    },
    'workout-2': {
        id: 'workout-2',
        name: 'HIIT Cardio Blast',
        description: 'High intensity interval training for maximum calorie burn.',
        type: 'hiit',
        difficulty: 'advanced',
    },
};

export default function WorkoutDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();

    const [workout, setWorkout] = useState<typeof MOCK_WORKOUTS[string] | null>(null);

    useEffect(() => {
        if (id) {
            setWorkout(MOCK_WORKOUTS[id] || null);
        }
    }, [id]);

    const handleBackPress = () => {
        if (router.canGoBack()) {
            router.back();
        }
    };

    const handleSave = () => {
        if (!workout) return;
        // TODO: Implement save functionality
        console.log('Saving workout:', workout?.id);
        handleBackPress();
    };

    const canComplete = !!workout;

    const handleReorder = () => {
        // TODO: Implement reorder functionality
        console.log('Reorder clicked');
    };

    const handleAddExercise = () => {
        router.push('/modals/workout/add-exercise-to-builder-modal');
    };

    const handleAddSection = () => {
        router.push('/modals/workout/add-section-to-builder-modal');
    };

    const addOptions: DropdownMenuOption[] = [
        {
            label: 'Add Exercise',
            icon: { sf: 'dumbbell.fill', IconComponent: Dumbbell },
            onPress: handleAddExercise,
        },
        {
            label: 'Add Section',
            icon: { sf: 'square.stack.3d.down.right.fill', IconComponent: Layers },
            onPress: handleAddSection,
        },
    ];

    const insets = useSafeAreaInsets();

    const BottomBar = (
        <View style={[
            styles.bottomBarContainer,
            {
                backgroundColor: themeColors.pageBackground,
                paddingBottom: insets.bottom,
                height: 80 + insets.bottom,
                borderTopColor: themeColors.border,
            }
        ]}>
            <View style={styles.bottomBarContent}>
                <View style={styles.buttonWrapper}>
                    <PressableScale
                        style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}
                        onPress={handleReorder}
                    >
                        <Repeat {...({ size: 18, color: themeColors.text, style: styles.buttonIcon } as any)} />
                        <Text style={[styles.actionButtonText, { color: themeColors.text }]}>Reorder</Text>
                    </PressableScale>
                </View>

                <View style={styles.buttonWrapper}>
                    <DropdownMenuWrapper options={addOptions}>
                        <View style={[styles.actionButton, { backgroundColor: themeColors.iconButton }]}>
                            <Plus {...({ size: 18, color: themeColors.text, style: styles.buttonIcon } as any)} />
                            <Text style={[styles.actionButtonText, { color: themeColors.text }]}>Add</Text>
                        </View>
                    </DropdownMenuWrapper>
                </View>
            </View>
        </View>
    );

    return (
        <ScreenWrapper
            scrollable={true}
            contentContainerStyle={styles.scrollContent}
            overlay={BottomBar}
        >
            {/* Header - Centered title layout that scrolls with content */}
            <View style={styles.header}>
                <IconButton
                    icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
                    onPress={handleBackPress}
                    size="md"
                    color={themeColors.text}
                />
                <Text
                    style={[styles.title, { color: themeColors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {workout?.name || t('library.workout.loading')}
                </Text>
                <IconButton
                    icon={{ sf: 'checkmark', IconComponent: Check }}
                    onPress={handleSave}
                    size="md"
                    variant={canComplete ? 'primary' : 'default'}
                    disabled={!canComplete}
                />
            </View>

            {/* Page Content */}
            <View style={styles.content}>
                {!workout && (
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('library.workout.notFound')}
                    </Text>
                )}
                {/* Content area is currently empty as requested */}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 56,
    },
    title: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    emptyText: {
        ...typography.p2,
        textAlign: 'center',
        marginTop: 32,
    },
    bottomBarContainer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        // Top edge shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 10,
    },
    bottomBarContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    buttonWrapper: {
        flex: 1,
    },
    actionButton: {
        width: '100%',
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // Match icon button feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    actionButtonText: {
        ...typography.p1,
        fontWeight: '600',
    },
    buttonIcon: {
        marginRight: 8,
    },
});
