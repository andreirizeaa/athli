import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { PressableOpacity, PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { hexToRgba } from '@/utils/colorUtils';
import { useModalCallbacks } from '@/stores';

// Mock Exercise Data from exercise-search.ts
export type Exercise = {
    exerciseId: string;
    name: string;
    imageUrl: string;
    equipments: string[];
    bodyParts: string[];
    exerciseType: string;
    targetMuscles: string[];
    secondaryMuscles: string[];
    videoUrl: string;
    keywords: string[];
    overview: string;
    instructions: string[];
    exerciseTips: string[];
    variations: string[];
    relatedExerciseIds: string[];
};

export const MOCK_EXERCISES: Exercise[] = [
    {
        exerciseId: 'K6NnTv0',
        name: 'Bench Press',
        imageUrl: '/demo-img.png',
        equipments: ['Barbell'],
        bodyParts: ['Chest'],
        exerciseType: 'weight_reps',
        targetMuscles: ['Pectoralis Major Clavicular Head'],
        secondaryMuscles: ['Deltoid Anterior', 'Pectoralis Major Clavicular Head', 'Triceps Brachii'],
        videoUrl: '/demo-video.mp4',
        keywords: [
            'Chest workout with barbell',
            'Barbell bench press exercise',
            'Strength training for chest',
            'Upper body workout with barbell',
            'Barbell chest exercises',
            'Bench press for chest muscles',
            'Building chest muscles with bench press',
            'Chest strengthening with barbell',
            'Bench press workout routine',
            'Barbell exercises for chest muscle growth',
        ],
        overview:
            'The Bench Press is a classic strength training exercise that primarily targets the chest, shoulders, and triceps, contributing to upper body muscle development. It is suitable for anyone, from beginners to professional athletes, looking to improve their upper body strength and muscular endurance. Individuals may want to incorporate bench press into their routine for its effectiveness in enhancing physical performance, promoting bone health, and improving body composition.',
        instructions: [
            'Grip the barbell with your hands slightly wider than shoulder-width apart, palms facing your feet, and lift it off the rack, holding it straight over your chest with your arms fully extended.',
            'Slowly lower the barbell down to your chest while keeping your elbows at a 90-degree angle.',
            'Once the barbell touches your chest, push it back up to the starting position while keeping your back flat on the bench.',
            'Repeat this process for the desired number of repetitions, always maintaining control of the barbell and ensuring your form is correct.',
        ],
        exerciseTips: [
            'Avoid Arching Your Back: One common mistake is excessively arching the back during the lift. This can lead to lower back injuries. Your lower back should have a natural arch, but it should not be overly exaggerated. Your butt, shoulders, and head should maintain contact with the bench at all times.',
            'Controlled Movement: Avoid the temptation to lift the barbell too quickly. A controlled, steady lift is more effective and reduces the risk of injury. Lower the bar to your mid-chest slowly, pause briefly, then push it back up without locking your elbows at the top.',
            "Don't Lift Alone: Always have a spotter when lifting heavy weights to ensure safety.",
        ],
        variations: [
            'Decline Bench Press: This variation is performed on a decline bench to target the lower part of the chest.',
            'Close-Grip Bench Press: This variation focuses on the triceps and the inner part of the chest by placing the hands closer together on the bar.',
            'Dumbbell Bench Press: This variation uses dumbbells instead of a barbell, allowing for a greater range of motion and individual arm movement.',
            'Reverse-Grip Bench Press: This variation is performed by flipping your grip so that your palms face towards you, targeting the upper chest and triceps.',
        ],
        relatedExerciseIds: [
            'U0uPZBq_main',
            'QD32SbB',
            'pdm4AfV',
            'SebLXCG',
            'T3JogV7',
            'hiWPEs1',
            'Y5ppDdt',
            'C8OV7Pv',
            'r3tQt3U',
            'dCSgT7N',
        ],
    },
    {
        exerciseId: 'U0uPZBq_main',
        name: 'Squat',
        imageUrl: '/demo-img.png',
        equipments: ['Barbell'],
        bodyParts: ['Legs'],
        exerciseType: 'weight_reps',
        targetMuscles: ['Quadriceps'],
        secondaryMuscles: ['Glutes', 'Hamstrings', 'Calves'],
        videoUrl: '/demo-video.mp4',
        keywords: [
            'Leg workout with barbell',
            'Barbell squat exercise',
            'Strength training for legs',
            'Lower body workout with barbell',
            'Barbell leg exercises',
            'Squat for leg muscles',
            'Building leg muscles with squat',
            'Leg strengthening with barbell',
            'Squat workout routine',
            'Barbell exercises for leg muscle growth',
        ],
        overview:
            "The Squat is a fundamental compound exercise that targets the quadriceps, glutes, and hamstrings. It's essential for building lower body strength and improving functional movement patterns.",
        instructions: [
            'Stand with your feet shoulder-width apart, toes slightly pointed out.',
            'Hold the barbell across your upper back, keeping your chest up and core engaged.',
            'Lower your body by bending your knees and hips, as if sitting back into a chair.',
            'Descend until your thighs are parallel to the floor, then drive through your heels to return to the starting position.',
        ],
        exerciseTips: [
            'Keep your chest up and back straight throughout the movement.',
            "Ensure your knees track over your toes and don't cave inward.",
            'Drive through your heels, not your toes, when standing up.',
        ],
        variations: [
            'Front Squat: Hold the barbell in front of your shoulders.',
            'Goblet Squat: Hold a dumbbell or kettlebell at chest level.',
            'Bulgarian Split Squat: Single-leg variation with rear foot elevated.',
        ],
        relatedExerciseIds: ['K6NnTv0', 'QD32SbB', 'pdm4AfV'],
    },
    {
        exerciseId: 'QD32SbB',
        name: 'Deadlift',
        imageUrl: '/demo-img.png',
        equipments: ['Barbell'],
        bodyParts: ['Back'],
        exerciseType: 'weight_reps',
        targetMuscles: ['Erector Spinae'],
        secondaryMuscles: ['Glutes', 'Hamstrings', 'Lats'],
        videoUrl: '/demo-video.mp4',
        keywords: [
            'Back workout with barbell',
            'Barbell deadlift exercise',
            'Strength training for back',
            'Posterior chain workout',
            'Barbell back exercises',
            'Deadlift for back muscles',
            'Building back muscles with deadlift',
            'Back strengthening with barbell',
            'Deadlift workout routine',
            'Barbell exercises for back muscle growth',
        ],
        overview:
            "The Deadlift is a compound exercise that primarily targets the posterior chain, including the back, glutes, and hamstrings. It's one of the most effective exercises for building overall strength.",
        instructions: [
            'Stand with your feet hip-width apart, with the barbell over the middle of your feet.',
            'Bend at the hips and knees to grip the bar, keeping your back straight and chest up.',
            'Drive through your heels and extend your hips and knees to lift the bar.',
            'Keep the bar close to your body as you stand up, then lower it back down with control.',
        ],
        exerciseTips: [
            'Maintain a neutral spine throughout the movement.',
            'Keep the bar close to your body - it should almost drag up your legs.',
            'Engage your lats by pulling your shoulders back before lifting.',
        ],
        variations: [
            'Romanian Deadlift: Focuses more on the hamstrings with less knee bend.',
            'Sumo Deadlift: Wider stance targets inner thighs more.',
            'Trap Bar Deadlift: Uses a hexagonal bar for a more upright position.',
        ],
        relatedExerciseIds: ['K6NnTv0', 'U0uPZBq_main', 'pdm4AfV'],
    },
    {
        exerciseId: 'pdm4AfV',
        name: 'Overhead Press',
        imageUrl: '/demo-img.png',
        equipments: ['Barbell'],
        bodyParts: ['Shoulders'],
        exerciseType: 'weight_reps',
        targetMuscles: ['Deltoid Anterior'],
        secondaryMuscles: ['Triceps Brachii', 'Core'],
        videoUrl: '/demo-video.mp4',
        keywords: [
            'Shoulder workout with barbell',
            'Barbell overhead press exercise',
            'Strength training for shoulders',
            'Upper body workout with barbell',
            'Barbell shoulder exercises',
            'Overhead press for shoulder muscles',
            'Building shoulder muscles with press',
            'Shoulder strengthening with barbell',
            'Overhead press workout routine',
            'Barbell exercises for shoulder muscle growth',
        ],
        overview:
            "The Overhead Press is a compound exercise that targets the shoulders and triceps while also engaging the core for stability. It's excellent for building upper body strength and improving shoulder mobility.",
        instructions: [
            'Stand with your feet shoulder-width apart, holding the barbell at shoulder height.',
            'Grip the bar slightly wider than shoulder-width, with your palms facing forward.',
            'Press the bar straight up overhead, keeping your core tight and avoiding arching your back excessively.',
            'Lower the bar back to shoulder height with control.',
        ],
        exerciseTips: [
            'Keep your core engaged throughout the movement to protect your lower back.',
            'Press the bar in a straight line, not forward or backward.',
            "Don't use leg drive - this should be a strict press.",
        ],
        variations: [
            'Push Press: Uses leg drive to help press the weight overhead.',
            'Seated Overhead Press: Removes leg drive and focuses purely on upper body.',
            'Dumbbell Overhead Press: Allows for independent arm movement.',
        ],
        relatedExerciseIds: ['K6NnTv0', 'U0uPZBq_main', 'QD32SbB'],
    },
    {
        exerciseId: 'SebLXCG',
        name: 'Pull Up',
        imageUrl: '/demo-img.png',
        equipments: ['Pull-up Bar'],
        bodyParts: ['Back'],
        exerciseType: 'reps',
        targetMuscles: ['Latissimus Dorsi'],
        secondaryMuscles: ['Biceps', 'Rhomboids', 'Rear Deltoids'],
        videoUrl: '/demo-video.mp4',
        keywords: [
            'Back workout with bodyweight',
            'Pull up exercise',
            'Strength training for back',
            'Bodyweight back exercises',
            'Pull up for back muscles',
            'Building back muscles with pull ups',
            'Back strengthening with bodyweight',
            'Pull up workout routine',
            'Bodyweight exercises for back muscle growth',
        ],
        overview:
            "The Pull Up is a bodyweight exercise that primarily targets the latissimus dorsi, biceps, and upper back. It's an excellent exercise for building upper body pulling strength.",
        instructions: [
            'Hang from a pull-up bar with your palms facing away from you, hands slightly wider than shoulder-width.',
            'Pull your body up until your chin clears the bar.',
            'Lower yourself back down with control until your arms are fully extended.',
            'Repeat for the desired number of repetitions.',
        ],
        exerciseTips: [
            'Keep your core engaged and avoid swinging your legs.',
            'Focus on pulling with your back muscles, not just your arms.',
            'Full range of motion is important - go all the way up and all the way down.',
        ],
        variations: [
            'Chin Up: Palms face toward you, targets biceps more.',
            'Wide Grip Pull Up: Wider grip emphasizes the lats more.',
            'Assisted Pull Up: Use a resistance band or machine for assistance.',
        ],
        relatedExerciseIds: ['K6NnTv0', 'QD32SbB', 'T3JogV7'],
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
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header */}
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={[
                        hexToRgba(themeColors.backgroundSecondary, 1),
                        hexToRgba(themeColors.backgroundSecondary, 0.85),
                        hexToRgba(themeColors.backgroundSecondary, 0.5),
                        hexToRgba(themeColors.backgroundSecondary, 0),
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
                <FlashList
                    data={filteredExercises}
                    keyExtractor={(item) => item.exerciseId}
                    estimatedItemSize={64}
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
