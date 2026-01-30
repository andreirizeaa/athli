import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Dumbbell, BarChart3, Zap, Settings2, Play } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { PressableOpacity } from 'pressto';

import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { hexToRgba } from '@/utils/colorUtils';
import { getExerciseById } from '@/services/musclewiki-service';
import { getExerciseById as getCoachExerciseById } from '@/services/coach/coach-exercise-service';
import { useExerciseLookup, type Exercise } from '@/hooks/useAllExercises';
import { useSingleThumbnail } from '@/hooks/useExerciseThumbnails';

// Simple inline badge component
const InfoBadge = ({
    children,
    icon: Icon,
    themeColors,
    variant = 'outline',
}: {
    children: React.ReactNode;
    icon?: React.ComponentType<{ size: number; color: string }>;
    themeColors: any;
    variant?: 'outline' | 'secondary';
}) => {
    const isOutline = variant === 'outline';
    return (
        <View style={[
            styles.badge,
            isOutline
                ? { borderColor: themeColors.primary, borderWidth: 1 }
                : { backgroundColor: `${themeColors.mutedText}20` }
        ]}>
            {Icon && <Icon size={12} color={isOutline ? themeColors.primary : themeColors.mutedText} />}
            <Text style={[
                styles.badgeText,
                { color: isOutline ? themeColors.primary : themeColors.mutedText }
            ]}>
                {children}
            </Text>
        </View>
    );
};

export default function ExerciseDetailsModal() {
    const { name, exerciseId, musclewikiId, isCustom } = useLocalSearchParams<{
        name: string;
        exerciseId?: string;
        musclewikiId?: string;
        isCustom?: string;
    }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { findExerciseById } = useExerciseLookup();

    // Check if this is a custom exercise
    const isCustomExercise = isCustom === 'true';

    // Try to find exercise from cache first
    const cachedExercise = useMemo(() => {
        if (exerciseId && !isCustomExercise) {
            return findExerciseById(exerciseId);
        }
        return undefined;
    }, [exerciseId, findExerciseById, isCustomExercise]);

    // Fetch MuscleWiki exercise if not in cache
    const { data: musclewikiExercise, isLoading: isLoadingMusclewiki } = useQuery({
        queryKey: ['exercise', musclewikiId || exerciseId],
        queryFn: () => getExerciseById(musclewikiId || exerciseId!),
        enabled: !!(musclewikiId || exerciseId) && !cachedExercise && !isCustomExercise,
        staleTime: 30 * 60 * 1000, // 30 minutes
    });

    // Fetch custom coach exercise if it's a custom exercise
    const { data: coachExercise, isLoading: isLoadingCoach } = useQuery({
        queryKey: ['coach-exercise', exerciseId],
        queryFn: () => getCoachExerciseById(exerciseId!),
        enabled: isCustomExercise && !!exerciseId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Transform coach exercise to unified format for display
    const exercise: Exercise | null = useMemo(() => {
        if (cachedExercise) {
            return cachedExercise;
        }

        if (musclewikiExercise) {
            return {
                exerciseId: musclewikiExercise.musclewikiId || musclewikiExercise.id,
                musclewikiId: musclewikiExercise.musclewikiId,
                name: musclewikiExercise.name,
                imageUrl: '',
                rawThumbnailUrl: musclewikiExercise.thumbnailUrl,
                equipments: musclewikiExercise.category ? [musclewikiExercise.category] : [],
                bodyParts: musclewikiExercise.targetMuscles?.slice(0, 1) || [],
                exerciseType: 'weight_reps',
                targetMuscles: musclewikiExercise.targetMuscles || [],
                secondaryMuscles: [
                    ...(musclewikiExercise.synergistMuscles || []),
                    ...(musclewikiExercise.stabilizerMuscles || []),
                ],
                videoUrl: '',
                keywords: [],
                overview: '',
                instructions: musclewikiExercise.instructions || [],
                exerciseTips: musclewikiExercise.tips || [],
                variations: [],
                relatedExerciseIds: [],
                difficulty: musclewikiExercise.difficulty,
                force: musclewikiExercise.force,
                mechanic: musclewikiExercise.mechanic,
                category: musclewikiExercise.category,
                source: 'musclewiki',
            };
        }

        if (coachExercise) {
            return {
                exerciseId: coachExercise.id,
                name: coachExercise.name,
                imageUrl: '',
                equipments: [],
                bodyParts: [],
                exerciseType: 'weight_reps',
                targetMuscles: coachExercise.muscle_group || [],
                secondaryMuscles: [],
                videoUrl: coachExercise.video_link || '',
                keywords: [],
                overview: coachExercise.description || '',
                instructions: coachExercise.description ? [coachExercise.description] : [],
                exerciseTips: [],
                variations: [],
                relatedExerciseIds: [],
                difficulty: coachExercise.difficulty,
                category: coachExercise.category,
                source: 'custom',
            };
        }

        return null;
    }, [cachedExercise, musclewikiExercise, coachExercise]);

    const isLoading = isLoadingMusclewiki || isLoadingCoach;

    // Get thumbnail URL for the exercise
    const rawThumbnailUrl = exercise?.rawThumbnailUrl || cachedExercise?.rawThumbnailUrl || musclewikiExercise?.thumbnailUrl;
    const { thumbnailUrl, isLoading: isThumbnailLoading } = useSingleThumbnail(rawThumbnailUrl);

    // Get musclewiki ID for video modal
    const musclewikiIdForVideo = exercise?.musclewikiId || cachedExercise?.musclewikiId || musclewikiExercise?.musclewikiId || exerciseId;

    const handleClose = () => {
        router.back();
    };

    const handleOpenVideoModal = () => {
        router.push({
            pathname: '/modals/workout/exercise-video-modal',
            params: {
                name: name || exercise?.name || '',
                exerciseId: exerciseId || '',
                musclewikiId: musclewikiIdForVideo || '',
                isCustom: isCustomExercise ? 'true' : 'false',
                videoLink: coachExercise?.video_link || '',
            },
        });
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Fixed Header with gradient */}
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
                </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.content,
                    { paddingTop: headerHeight + 16 }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="on-drag"
            >
                {/* Title Section */}
                <Text style={[styles.pageTitle, { color: themeColors.text }]}>
                    {name || exercise?.name || t('library.exerciseDetails')}
                </Text>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={themeColors.primary} />
                    </View>
                ) : (
                    <>
                        {/* Video Thumbnail Section */}
                        <View style={styles.videoSection}>
                            <PressableOpacity
                                onPress={handleOpenVideoModal}
                                style={[styles.videoContainer, { backgroundColor: themeColors.surfacePrimary }]}
                            >
                                {isThumbnailLoading ? (
                                    <View style={styles.videoPlaceholder}>
                                        <ActivityIndicator size="large" color={themeColors.primary} />
                                    </View>
                                ) : thumbnailUrl ? (
                                    <>
                                        <Image
                                            source={{ uri: thumbnailUrl }}
                                            style={styles.thumbnail}
                                            contentFit="cover"
                                        />
                                        {/* Play button overlay */}
                                        <View style={styles.playButtonOverlay}>
                                            <View style={styles.playButton}>
                                                <Play size={20} color="#000" fill="#000" />
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.videoPlaceholder}>
                                        <View style={[styles.playButton, { backgroundColor: themeColors.primary }]}>
                                            <Play size={24} color="#FFF" fill="#FFF" />
                                        </View>
                                        <Text style={[styles.tapToPlayText, { color: themeColors.mutedText }]}>
                                            {t('library.tapToPlayVideo')}
                                        </Text>
                                    </View>
                                )}
                            </PressableOpacity>
                            {/* Attribution for MuscleWiki */}
                            {!isCustomExercise && (
                                <Text style={[styles.attribution, { color: themeColors.mutedText }]}>
                                    Powered by MuscleWiki
                                </Text>
                            )}
                        </View>

                        {/* Badges Section */}
                        {exercise && (
                            <View style={styles.badgesContainer}>
                                {exercise.category && (
                                    <InfoBadge
                                        icon={Dumbbell}
                                        themeColors={themeColors}
                                    >
                                        {exercise.category}
                                    </InfoBadge>
                                )}
                                {exercise.difficulty && (
                                    <InfoBadge
                                        icon={BarChart3}
                                        themeColors={themeColors}
                                    >
                                        {exercise.difficulty}
                                    </InfoBadge>
                                )}
                                {exercise.force && (
                                    <InfoBadge
                                        icon={Zap}
                                        themeColors={themeColors}
                                    >
                                        {exercise.force}
                                    </InfoBadge>
                                )}
                                {exercise.mechanic && (
                                    <InfoBadge
                                        icon={Settings2}
                                        themeColors={themeColors}
                                    >
                                        {exercise.mechanic}
                                    </InfoBadge>
                                )}
                            </View>
                        )}

                        {/* Instructions Section */}
                        {exercise?.instructions && exercise.instructions.length > 0 && (
                            <Card style={styles.instructionsCard}>
                                <View style={styles.instructionsHeader}>
                                    <Text style={[styles.instructionsHeaderText, { color: themeColors.text }]}>
                                        {t('library.instructions')}
                                    </Text>
                                </View>
                                <View style={[styles.instructionsDivider, { backgroundColor: themeColors.border }]} />
                                <View style={styles.instructionsContent}>
                                    {exercise.instructions.map((step, index) => (
                                        <View key={index} style={styles.instructionItem}>
                                            <View style={[styles.stepNumber, { backgroundColor: `${themeColors.primary}20` }]}>
                                                <Text style={[styles.stepNumberText, { color: themeColors.primary }]}>
                                                    {index + 1}
                                                </Text>
                                            </View>
                                            <Text style={[styles.instructionText, { color: themeColors.mutedText }]}>
                                                {step}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </Card>
                        )}

                        {/* Muscles Section */}
                        {exercise && (exercise.targetMuscles?.length > 0 || exercise.secondaryMuscles?.length > 0) && (
                            <Card style={styles.instructionsCard}>
                                <View style={styles.instructionsHeader}>
                                    <Text style={[styles.instructionsHeaderText, { color: themeColors.text }]}>
                                        {t('library.muscles')}
                                    </Text>
                                </View>
                                <View style={[styles.instructionsDivider, { backgroundColor: themeColors.border }]} />
                                <View style={styles.instructionsContent}>
                                    {[...(exercise.targetMuscles || []), ...(exercise.secondaryMuscles || [])].map((muscle, index) => (
                                        <View key={muscle} style={styles.instructionItem}>
                                            <View style={[styles.stepNumber, { backgroundColor: `${themeColors.primary}20` }]}>
                                                <Text style={[styles.stepNumberText, { color: themeColors.primary }]}>
                                                    {index + 1}
                                                </Text>
                                            </View>
                                            <Text style={[styles.instructionText, { color: themeColors.mutedText }]}>
                                                {muscle}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </Card>
                        )}

                        {/* Tips Section */}
                        {exercise?.exerciseTips && exercise.exerciseTips.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                                    {t('library.tips')}
                                </Text>
                                <View style={styles.tipsList}>
                                    {exercise.exerciseTips.map((tip, index) => (
                                        <View key={index} style={styles.tipItem}>
                                            <Text style={[styles.tipBullet, { color: themeColors.primary }]}>•</Text>
                                            <Text style={[styles.tipText, { color: themeColors.mutedText }]}>
                                                {tip}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Overview/Description (for custom exercises) */}
                        {exercise?.overview && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                                    {t('library.description')}
                                </Text>
                                <Text style={[styles.overviewText, { color: themeColors.mutedText }]}>
                                    {exercise.overview}
                                </Text>
                            </View>
                        )}

                        {/* Empty state */}
                        {!exercise && !isLoading && (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                                    {t('library.exerciseNotFound')}
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
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
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    pageTitle: {
        ...typography.h4,
        fontWeight: '700',
        marginBottom: 20,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoSection: {
        marginBottom: 20,
    },
    videoContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 12,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    playButtonOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    tapToPlayText: {
        ...typography.p3,
    },
    attribution: {
        ...typography.p4,
        marginTop: 8,
    },
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    badgeText: {
        ...typography.p4,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        ...typography.h6,
        fontWeight: '600',
        marginBottom: 12,
    },
    instructionsCard: {
        paddingHorizontal: 0,
        paddingVertical: 0,
        marginBottom: 24,
    },
    instructionsHeader: {
        padding: 16,
    },
    instructionsHeaderText: {
        ...typography.p1,
        fontWeight: '600',
    },
    instructionsDivider: {
        height: 1,
    },
    instructionsContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
        gap: 12,
    },
    instructionItem: {
        flexDirection: 'row',
        gap: 12,
    },
    stepNumber: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumberText: {
        ...typography.p3,
        fontWeight: '600',
    },
    instructionText: {
        ...typography.p2,
        flex: 1,
        lineHeight: 22,
    },
    tipsList: {
        gap: 8,
    },
    tipItem: {
        flexDirection: 'row',
        gap: 8,
    },
    tipBullet: {
        ...typography.p2,
    },
    tipText: {
        ...typography.p2,
        flex: 1,
    },
    overviewText: {
        ...typography.p2,
        lineHeight: 22,
    },
    emptyContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyText: {
        ...typography.p1,
    },
});
