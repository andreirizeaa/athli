import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Platform, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { PressableOpacity, PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { hexToRgba } from '@/utils/colorUtils';
import { useModalCallbacks } from '@/contexts/modal-callbacks';

// Mock Exercise Data from exercise-search.ts
export type Exercise = {
    exerciseId: string;
    name: string;
    imageUrl: string;
    equipments: string[];
    bodyParts: string[];
    exerciseType: string;
    targetMuscles: string[];
};

const MOCK_EXERCISES: Exercise[] = [
    {
        exerciseId: 'K6NnTv0',
        name: 'Bench Press',
        imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop',
        equipments: ['Barbell'],
        bodyParts: ['Chest'],
        exerciseType: 'weight_reps',
        targetMuscles: ['Pectoralis Major'],
    },
    {
        exerciseId: 'U0uPZBq_main',
        name: 'Squat',
        imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=2069&auto=format&fit=crop',
        equipments: ['Barbell'],
        bodyParts: ['Legs'],
        exerciseType: 'weight_reps',
        targetMuscles: ['Quadriceps'],
    },
    {
        exerciseId: 'QD32SbB',
        name: 'Deadlift',
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2069&auto=format&fit=crop',
        equipments: ['Barbell'],
        bodyParts: ['Back'],
        exerciseType: 'weight_reps',
        targetMuscles: ['Lower Back'],
    },
    {
        exerciseId: 'pdm4AfV',
        name: 'Overhead Press',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2069&auto=format&fit=crop',
        equipments: ['Barbell'],
        bodyParts: ['Shoulders'],
        exerciseType: 'weight_reps',
        targetMuscles: ['Deltoids'],
    },
    {
        exerciseId: 'SebLXCG',
        name: 'Pull Up',
        imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=1974&auto=format&fit=crop',
        equipments: ['Pull-up Bar'],
        bodyParts: ['Back'],
        exerciseType: 'reps',
        targetMuscles: ['Latissimus Dorsi'],
    },
];

export default function AddExerciseToBuilderModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { multiple, title } = useLocalSearchParams<{ multiple?: string, title?: string }>();
    const isMultiple = multiple === 'true';

    const { triggerExerciseSelect, triggerExercisesSelect } = useModalCallbacks();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const handleClose = () => {
        router.back();
    };

    const handleSelectExercise = (exercise: Exercise) => {
        if (isMultiple) {
            setSelectedIds(prev =>
                prev.includes(exercise.exerciseId)
                    ? prev.filter(id => id !== exercise.exerciseId)
                    : [...prev, exercise.exerciseId]
            );
        } else {
            triggerExerciseSelect(exercise);
            router.back();
        }
    };

    const handleConfirmSelection = () => {
        const selectedExercises = MOCK_EXERCISES.filter(ex => selectedIds.includes(ex.exerciseId));
        triggerExercisesSelect(selectedExercises);
        router.back();
    };

    const filteredExercises = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return MOCK_EXERCISES;

        return MOCK_EXERCISES.filter(ex =>
            ex.name.toLowerCase().includes(query) ||
            ex.bodyParts.some(bp => bp.toLowerCase().includes(query)) ||
            ex.equipments.some(eq => eq.toLowerCase().includes(query))
        );
    }, [searchQuery]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderExerciseItem = ({ item }: { item: Exercise }) => {
        const selectedIndex = selectedIds.indexOf(item.exerciseId);
        const isSelected = selectedIndex !== -1;

        const handleThumbnailPress = () => {
            router.push({
                pathname: '/modals/workout/exercise-details-modal',
                params: { name: item.name }
            });
        };

        return (
            <PressableOpacity
                onPress={() => handleSelectExercise(item)}
                style={styles.exerciseItem}
            >
                <PressableScale onPress={handleThumbnailPress}>
                    <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.thumbnail}
                        contentFit="cover"
                        transition={200}
                    />
                </PressableScale>
                <View style={styles.infoContainer}>
                    <Text style={[styles.exerciseName, { color: themeColors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                </View>
                {isMultiple && (
                    <View style={[
                        styles.checkbox,
                        { borderColor: isSelected ? themeColors.primary : themeColors.border },
                        isSelected && { backgroundColor: themeColors.primary },
                    ]}>
                        {isSelected && (
                            <Text style={[styles.selectionNumber, { color: themeColors.primaryForeground }]}>
                                {selectedIndex + 1}
                            </Text>
                        )}
                    </View>
                )}
            </PressableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Header */}
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
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
                        },
                    ]}
                >
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleClose}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {title || (isMultiple ? 'Add Exercises' : 'Add Exercise')}
                    </Text>
                    {isMultiple ? (
                        <IconButton
                            icon={{ sf: 'checkmark', IconComponent: Check }}
                            onPress={handleConfirmSelection}
                            size="md"
                            variant={selectedIds.length > 0 ? 'primary' : 'default'}
                            disabled={selectedIds.length === 0}
                        />
                    ) : (
                        <View style={{ width: 44 }} />
                    )}
                </View>
            </View>

            <View style={styles.content}>
                <FlatList
                    data={filteredExercises}
                    keyExtractor={(item) => item.exerciseId}
                    renderItem={renderExerciseItem}
                    ItemSeparatorComponent={() => <Separator style={styles.separator} />}
                    contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16 }]}
                    ListHeaderComponent={
                        <View style={styles.searchContainer}>
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('general.searchPlaceholder')}
                            />
                        </View>
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </View>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    title: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    listContent: {
        paddingBottom: 40,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    thumbnail: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        marginLeft: 16,
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    exerciseName: {
        ...typography.p1,
        fontWeight: '600',
    },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        marginRight: 16,
    },
    selectionNumber: {
        ...typography.p1,
        fontSize: 12,
        fontWeight: '700',
    },
    separator: {
        marginLeft: 76, // 16 (padding) + 48 (thumb) + 12 (gap)
        marginRight: 16,
    },
});
