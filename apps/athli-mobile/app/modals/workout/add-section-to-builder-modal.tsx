import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Platform, StyleSheet, Text, View, LayoutChangeEvent, ActivityIndicator } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, ChevronRight } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useQuery } from '@tanstack/react-query';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { SECTION_TYPES, type SectionType } from '@athli/shared-types';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput, SectionTypeSelect } from '@/components/ui/form-inputs';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { hexToRgba } from '@/utils/colorUtils';
import { type BuilderSection } from '@/components/features/workout/workout-schema';
import { getSections, getSectionById } from '@/services/coach/coach-section-service';
import { getExerciseById as getMuscleWikiExerciseById } from '@/services/musclewiki-service';

type TabKey = 'saved' | 'new';

export default function AddSectionToBuilderModal() {
    const router = useRouter();
    const { primaryColor, colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { triggerSectionSelect } = useModalCallbacks();
    const coachProfile = useCoachProfileStore((state) => state.profile);
    const isAuthenticated = !!coachProfile;

    const [selectedTab, setSelectedTab] = useState<TabKey>('saved');
    const underlinePosition = useSharedValue(0);
    const underlineWidth = useSharedValue(0);
    const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});
    const [isLoadingSection, setIsLoadingSection] = useState(false);

    // Form state for New tab
    const [sectionName, setSectionName] = useState('');
    const [sectionType, setSectionType] = useState<SectionType>('regular');
    const [duration, setDuration] = useState('');
    const [rounds, setRounds] = useState('');
    const [notes, setNotes] = useState('');
    // Tabata/HIIT fields
    const [workSec, setWorkSec] = useState('');
    const [restSec, setRestSec] = useState('');
    // EMOM fields
    const [intervalSec, setIntervalSec] = useState('');
    const [durationMin, setDurationMin] = useState('');

    // Search state for Saved tab
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch sections from API
    const { data: sections = [] } = useQuery({
        queryKey: ['sections'],
        queryFn: getSections,
        enabled: isAuthenticated,
        staleTime: 0,
        refetchOnMount: 'always',
    });

    // Tabs - Saved first, New second
    const tabs: { key: TabKey; label: string }[] = [
        { key: 'saved', label: t('library.addSection.tabs.saved') },
        { key: 'new', label: t('library.addSection.tabs.new') },
    ];

    // Filter saved sections based on search query
    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) {
            return sections;
        }
        const query = searchQuery.toLowerCase().trim();
        return sections.filter(
            (section) =>
                section.program.toLowerCase().includes(query) ||
                section.sectionType.toLowerCase().includes(query)
        );
    }, [sections, searchQuery]);

    const UNDERLINE_EXTRA_WIDTH = 8;

    // Form validation for New tab
    const canComplete = useMemo(() => {
        const trimmedName = sectionName.trim();

        // Name is mandatory
        let formValid = trimmedName.length > 0;

        // Additional validation for section-specific fields
        if (sectionType === 'amrap') {
            const durationNum = parseInt(duration);
            formValid = formValid && duration.trim().length > 0 && !isNaN(durationNum) && durationNum > 0;
        }

        if (sectionType === 'circuits') {
            const roundsNum = parseInt(rounds);
            formValid = formValid && rounds.trim().length > 0 && !isNaN(roundsNum) && roundsNum > 0;
        }

        // Tabata/HIIT validation
        if (sectionType === 'tabata' || sectionType === 'hiit') {
            const workSecNum = parseInt(workSec);
            const restSecNum = parseInt(restSec);
            const roundsNum = parseInt(rounds);
            formValid = formValid &&
                workSec.trim().length > 0 && !isNaN(workSecNum) && workSecNum > 0 &&
                restSec.trim().length > 0 && !isNaN(restSecNum) && restSecNum >= 0 &&
                rounds.trim().length > 0 && !isNaN(roundsNum) && roundsNum > 0;
        }

        // EMOM validation
        if (sectionType === 'emom') {
            const intervalSecNum = parseInt(intervalSec);
            const durationMinNum = parseInt(durationMin);
            formValid = formValid &&
                intervalSec.trim().length > 0 && !isNaN(intervalSecNum) && intervalSecNum > 0 &&
                durationMin.trim().length > 0 && !isNaN(durationMinNum) && durationMinNum > 0;
        }

        return formValid;
    }, [sectionName, sectionType, duration, rounds, workSec, restSec, intervalSec, durationMin]);

    const animateUnderline = (tabKey: TabKey) => {
        const layout = tabLayoutsRef.current[tabKey];
        if (layout) {
            underlinePosition.value = withTiming(layout.x - UNDERLINE_EXTRA_WIDTH / 2, {
                duration: 300,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            });
            underlineWidth.value = withTiming(layout.width + UNDERLINE_EXTRA_WIDTH, {
                duration: 300,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
            });
        }
    };

    const handleTabPress = (tabKey: TabKey) => {
        if (selectedTab !== tabKey) {
            haptics.medium();
            setSelectedTab(tabKey);
        }
    };

    // Animate underline when selectedTab changes
    useEffect(() => {
        if (selectedTab) {
            animateUnderline(selectedTab);
        }
    }, [selectedTab]);

    const handleTabLayout = (tabKey: TabKey, event: LayoutChangeEvent) => {
        const { width, x } = event.nativeEvent.layout;
        tabLayoutsRef.current[tabKey] = { x, width };

        // Initialize underline position on first layout
        if (tabKey === selectedTab && underlineWidth.value === 0) {
            underlinePosition.value = x - UNDERLINE_EXTRA_WIDTH / 2;
            underlineWidth.value = width + UNDERLINE_EXTRA_WIDTH;
        }
    };

    const animatedUnderlineStyle = useAnimatedStyle(() => ({
        width: underlineWidth.value,
        transform: [{ translateX: underlinePosition.value }],
    }));

    const handleClose = () => {
        router.back();
    };

    // Handle selecting a saved section
    const handleSelectSavedSection = useCallback(async (savedSection: typeof sections[0]) => {
        setIsLoadingSection(true);
        try {
            // Fetch the full section data with exercises
            const sectionData = await getSectionById(savedSection.id);

            // Extract section from the response
            const sectionItems = sectionData.section_data?.items || [];
            const sectionItem = sectionItems.find((item: any) => item.itemType === 'section');

            if (!sectionItem) {
                console.error('No section data found');
                setIsLoadingSection(false);
                return;
            }

            const data = sectionItem.data;
            const sectionType = data.type as SectionType;

            // Collect all unique exercise IDs from section data
            const collectExerciseIds = (sectionData: any): string[] => {
                const ids = new Set<string>();
                const exercises = sectionData.exercises || [];
                exercises.forEach((exOrGroup: any) => {
                    // Handle direct exercise (amrap/timed)
                    if (exOrGroup.prescribedExerciseId) {
                        ids.add(exOrGroup.prescribedExerciseId);
                        (exOrGroup.alternatives || []).forEach((altId: string) => ids.add(altId));
                    }
                    // Handle exercise group (regular/tabata/hiit/emom)
                    if (exOrGroup.exercises) {
                        exOrGroup.exercises.forEach((ex: any) => {
                            if (ex.prescribedExerciseId) {
                                ids.add(ex.prescribedExerciseId);
                                (ex.alternatives || []).forEach((altId: string) => ids.add(altId));
                            }
                        });
                    }
                });
                return Array.from(ids);
            };

            const exerciseIds = collectExerciseIds(data);
            
            // Pre-fetch all exercise details from MuscleWiki API
            const exerciseDetailsMap = new Map<string, { name: string; imageUrl: string; exerciseType: string }>();
            const fetchPromises = exerciseIds.map(async (id) => {
                try {
                    const exercise = await getMuscleWikiExerciseById(id);
                    if (exercise) {
                        exerciseDetailsMap.set(id, {
                            name: exercise.name,
                            imageUrl: exercise.imageUrl,
                            exerciseType: exercise.exerciseType,
                        });
                    } else {
                        exerciseDetailsMap.set(id, {
                            name: 'Unknown Exercise',
                            imageUrl: '',
                            exerciseType: 'weight_reps',
                        });
                    }
                } catch (err) {
                    console.warn(`Failed to fetch exercise ${id}:`, err);
                    exerciseDetailsMap.set(id, {
                        name: 'Unknown Exercise',
                        imageUrl: '',
                        exerciseType: 'weight_reps',
                    });
                }
            });
            await Promise.all(fetchPromises);

            // Helper to get exercise details from pre-fetched map
            const getExerciseDetails = (exerciseId: string) => {
                const details = exerciseDetailsMap.get(exerciseId);
                return details || {
                    name: 'Unknown Exercise',
                    imageUrl: '',
                    exerciseType: 'weight_reps',
                };
            };

            const normalizeHeartRateZone = (value: string, columnType: string) => {
                if (columnType === 'Heart Rate Zone' && value) {
                    return value.replace('Zone ', '');
                }
                return value;
            };

            const mapSetType = (type: string): 'R' | 'W' | 'F' | 'D' => {
                switch (type) {
                    case 'warmUp': return 'W';
                    case 'failure': return 'F';
                    case 'dropset': return 'D';
                    default: return 'R';
                }
            };

            // Transform exercises based on section type
            let exercises: any[] = [];

            if (sectionType === 'amrap') {
                // AMRAP: flat array of exercises
                exercises = (data.exercises || []).map((ex: any, idx: number) => {
                    const exerciseDetails = getExerciseDetails(ex.prescribedExerciseId);
                    const transformedAlternatives = (ex.alternatives || []).map((altId: string) => {
                        const altExercise = getExerciseDetails(altId);
                        return {
                            id: altId,
                            exerciseId: altId,
                            name: altExercise.name,
                            imageUrl: altExercise.imageUrl,
                            exerciseType: altExercise.exerciseType,
                        };
                    });

                    const column1Type = ex.column1Label || 'Reps';
                    const column2Type = ex.column2Label || 'kg';

                    const singleSet = {
                        id: 'set-1',
                        setNumber: 1,
                        column1: normalizeHeartRateZone(ex.trackableField1?.prescribed || '', column1Type),
                        column2: normalizeHeartRateZone(ex.trackableField2?.prescribed || '', column2Type),
                        type: 'R' as const,
                        rest: ex.restSec ? ex.restSec.toString() : undefined,
                    };

                    return {
                        id: `${ex.prescribedExerciseId}-${Date.now()}-${idx}`,
                        exerciseId: ex.prescribedExerciseId || '',
                        name: exerciseDetails.name,
                        imageUrl: exerciseDetails.imageUrl,
                        exerciseType: ex.exerciseType || exerciseDetails.exerciseType,
                        sets: [singleSet],
                        column1Type,
                        column2Type,
                        notes: ex.notes || '',
                        alternatives: transformedAlternatives,
                        tempo: ex.tempo || '',
                        eachSide: ex.eachSide || false,
                        isSupersetNext: ex.supersetId ? true : false,
                        supersetGroupId: ex.supersetId || null,
                        setRestSec: ex.restSec || undefined,
                    };
                });
            } else if (sectionType === 'tabata' || sectionType === 'hiit' || sectionType === 'emom') {
                // Tabata/HIIT/EMOM: exercise groups with single set
                let exerciseIndex = 0;
                exercises = (data.exercises || []).flatMap((group: any) =>
                    (group.exercises || []).map((ex: any) => {
                        const exerciseDetails = getExerciseDetails(ex.prescribedExerciseId);
                        const transformedAlternatives = (ex.alternatives || []).map((altId: string) => {
                            const altExercise = getExerciseDetails(altId);
                            return {
                                id: altId,
                                exerciseId: altId,
                                name: altExercise.name,
                                imageUrl: altExercise.imageUrl,
                                exerciseType: altExercise.exerciseType,
                            };
                        });

                        const column1Type = ex.column1Label || 'Reps';
                        const column2Type = ex.column2Label || 'kg';
                        const set = ex.set || { setNumber: 1, type: 'normal', trackableField1: {}, trackableField2: {} };

                        const exercise = {
                            id: `${ex.prescribedExerciseId}-${Date.now()}-${exerciseIndex}`,
                            exerciseId: ex.prescribedExerciseId || '',
                            name: exerciseDetails.name,
                            imageUrl: exerciseDetails.imageUrl,
                            exerciseType: exerciseDetails.exerciseType,
                            sets: [{
                                id: 'set-1',
                                setNumber: set.setNumber || 1,
                                column1: normalizeHeartRateZone(set.trackableField1?.prescribed || '', column1Type),
                                column2: normalizeHeartRateZone(set.trackableField2?.prescribed || '', column2Type),
                                type: mapSetType(set.type),
                                rest: set.restSec ? set.restSec.toString() : undefined,
                            }],
                            column1Type,
                            column2Type,
                            notes: ex.notes || '',
                            alternatives: transformedAlternatives,
                            tempo: ex.tempo || '',
                            eachSide: ex.eachSide || false,
                            isSupersetNext: ex.supersetId ? true : false,
                            supersetGroupId: ex.supersetId || null,
                            setRestSec: set.restSec || undefined,
                        };
                        exerciseIndex++;
                        return exercise;
                    })
                );
            } else {
                // Regular/Auxiliary: exercise groups with sets arrays
                let exerciseIndex = 0;
                exercises = (data.exercises || []).flatMap((group: any) =>
                    (group.exercises || []).map((ex: any) => {
                        const exerciseDetails = getExerciseDetails(ex.prescribedExerciseId);
                        const transformedAlternatives = (ex.alternatives || []).map((altId: string) => {
                            const altExercise = getExerciseDetails(altId);
                            return {
                                id: altId,
                                exerciseId: altId,
                                name: altExercise.name,
                                imageUrl: altExercise.imageUrl,
                                exerciseType: altExercise.exerciseType,
                            };
                        });

                        const column1Type = ex.column1Label || 'Reps';
                        const column2Type = ex.column2Label || 'kg';
                        const firstSetRestSec = ex.sets?.[0]?.restSec;

                        const exercise = {
                            id: `${ex.prescribedExerciseId}-${Date.now()}-${exerciseIndex}`,
                            exerciseId: ex.prescribedExerciseId || '',
                            name: exerciseDetails.name,
                            imageUrl: exerciseDetails.imageUrl,
                            exerciseType: exerciseDetails.exerciseType,
                            sets: (ex.sets || []).map((set: any, idx: number) => ({
                                id: `set-${idx}`,
                                setNumber: set.setNumber || idx + 1,
                                column1: normalizeHeartRateZone(set.trackableField1?.prescribed || '', column1Type),
                                column2: normalizeHeartRateZone(set.trackableField2?.prescribed || '', column2Type),
                                type: mapSetType(set.type),
                                rest: set.restSec ? set.restSec.toString() : undefined,
                            })),
                            column1Type,
                            column2Type,
                            notes: ex.notes || '',
                            alternatives: transformedAlternatives,
                            tempo: ex.tempo || '',
                            eachSide: ex.eachSide || false,
                            isSupersetNext: ex.supersetId ? true : false,
                            supersetGroupId: ex.supersetId || null,
                            setRestSec: firstSetRestSec || undefined,
                        };
                        exerciseIndex++;
                        return exercise;
                    })
                );
            }

            // Fix isSupersetNext based on adjacent exercises' supersetGroupId
            const fixedExercises = exercises.map((ex, idx) => {
                const nextEx = idx < exercises.length - 1 ? exercises[idx + 1] : null;
                const isSupersetNext = nextEx && ex.supersetGroupId && ex.supersetGroupId === nextEx.supersetGroupId;
                return { ...ex, isSupersetNext: isSupersetNext || false };
            });

            // Create the builder section with transformed exercises
            const section: BuilderSection = {
                id: `section-${Date.now()}`,
                type: 'section',
                name: data.name,
                sectionType: sectionType,
                duration: sectionType === 'amrap' && data.durationSec ? String(Math.round(data.durationSec / 60)) : undefined,
                rounds: (sectionType === 'tabata' || sectionType === 'hiit' || sectionType === 'circuits') && data.rounds ? String(data.rounds) : undefined,
                notes: data.notes || undefined,
                exercises: fixedExercises,
                // Tabata/HIIT fields
                workSec: (sectionType === 'tabata' || sectionType === 'hiit') && data.workSec ? String(data.workSec) : undefined,
                restSec: (sectionType === 'tabata' || sectionType === 'hiit') && data.restSec !== undefined ? String(data.restSec) : undefined,
                // EMOM fields
                intervalSec: sectionType === 'emom' && data.intervalSec ? String(data.intervalSec) : undefined,
                durationMin: sectionType === 'emom' && data.durationMin ? String(data.durationMin) : undefined,
            };

            triggerSectionSelect(section);
            router.dismiss();
        } catch (error) {
            console.error('Error loading section:', error);
        } finally {
            setIsLoadingSection(false);
        }
    }, [triggerSectionSelect, router]);

    // Handle creating a new section
    const handleCreate = useCallback(() => {
        if (!sectionName.trim()) return;

        const section: BuilderSection = {
            id: `section-${Date.now()}`,
            type: 'section',
            name: sectionName.trim(),
            sectionType: sectionType,
            duration: duration || undefined,
            rounds: rounds || undefined,
            notes: notes || undefined,
            exercises: [],
            // Tabata/HIIT fields
            workSec: workSec || undefined,
            restSec: restSec || undefined,
            // EMOM fields
            intervalSec: intervalSec || undefined,
            durationMin: durationMin || undefined,
        };

        triggerSectionSelect(section);
        router.dismiss();
    }, [sectionName, sectionType, duration, rounds, notes, workSec, restSec, intervalSec, durationMin, triggerSectionSelect, router]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;

    const getSectionTypeLabel = (type: SectionType) => {
        return SECTION_TYPES.find((t) => t.value === type)?.label || type;
    };

    const getSectionTypeInfo = (section: typeof sections[0]) => {
        if (section.sectionType === 'amrap' && section.duration) {
            return `${Math.round(section.duration / 60)}m`;
        }
        if ((section.sectionType === 'tabata' || section.sectionType === 'hiit') && section.rounds) {
            return `${section.rounds} ${section.rounds === 1 ? 'round' : 'rounds'}`;
        }
        if (section.sectionType === 'emom' && section.duration) {
            return `${section.duration}m`;
        }
        return null;
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
                    style={[styles.headerGradient, { height: headerHeight + 12 }]}
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
                        {t('library.addSection.title')}
                    </Text>
                    {selectedTab === 'new' ? (
                        <IconButton
                            icon={{ sf: 'checkmark', IconComponent: Check }}
                            onPress={handleCreate}
                            size="md"
                            variant={canComplete ? 'primary' : 'default'}
                            disabled={!canComplete}
                        />
                    ) : (
                        <View style={{ width: 44 }} />
                    )}
                </View>
            </View>

            {/* Scrollable Content */}
            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: headerHeight }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                bottomOffset={40}
            >
                {/* Tab Bar */}
                <View style={[styles.tabsWrapper, { borderBottomColor: themeColors.border }]}>
                    <View style={styles.tabsContainer}>
                        {tabs.map((tab) => {
                            const isSelected = selectedTab === tab.key;
                            return (
                                <View
                                    key={tab.key}
                                    style={styles.tabContainer}
                                    onLayout={(event) => handleTabLayout(tab.key, event)}
                                >
                                    <PressableOpacity
                                        style={styles.tab}
                                        onPress={() => handleTabPress(tab.key)}
                                    >
                                        <Text
                                            style={[
                                                styles.tabText,
                                                {
                                                    color: isSelected ? themeColors.text : themeColors.mutedText,
                                                    fontWeight: isSelected ? '700' : '600',
                                                },
                                            ]}
                                        >
                                            {tab.label}
                                        </Text>
                                    </PressableOpacity>
                                </View>
                            );
                        })}

                        {/* Animated underline */}
                        <Animated.View
                            style={[
                                styles.animatedUnderline,
                                { backgroundColor: primaryColor },
                                animatedUnderlineStyle,
                            ]}
                        />
                    </View>
                </View>

                {/* Conditional Content */}
                {selectedTab === 'saved' ? (
                    <>
                        {/* Search Bar */}
                        <SearchBar
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder={t('library.searchPlaceholders.sections')}
                        />

                        {/* Loading State */}
                        {isLoadingSection ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={primaryColor} />
                                <Text style={[styles.loadingText, { color: themeColors.mutedText }]}>
                                    {t('library.section.loadingSection')}
                                </Text>
                            </View>
                        ) : filteredSections.length === 0 ? (
                            <EmptyState message={t('library.empty.sections')} />
                        ) : (
                            <Card variant="form">
                                {filteredSections.map((item, index) => {
                                    const typeInfo = getSectionTypeInfo(item);
                                    return (
                                        <React.Fragment key={item.id}>
                                            {index > 0 && <Separator />}
                                            <PressableOpacity
                                                style={styles.sectionRow}
                                                onPress={() => handleSelectSavedSection(item)}
                                            >
                                                <View style={styles.sectionInfo}>
                                                    <Text style={[styles.sectionName, { color: themeColors.text }]} numberOfLines={1}>
                                                        {item.program}
                                                    </Text>
                                                    <View style={styles.sectionMeta}>
                                                        <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                                                            {getSectionTypeLabel(item.sectionType as SectionType)}
                                                        </Text>
                                                        {typeInfo && (
                                                            <>
                                                                <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                                                                <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                                                                    {typeInfo}
                                                                </Text>
                                                            </>
                                                        )}
                                                        <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                                                        <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                                                            {item.totalExercises === 0
                                                                ? 'Empty'
                                                                : `${item.totalExercises} ${item.totalExercises === 1 ? t('library.exercise') : t('library.exercises')}`
                                                            }
                                                        </Text>
                                                    </View>
                                                </View>
                                                <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                                            </PressableOpacity>
                                        </React.Fragment>
                                    );
                                })}
                            </Card>
                        )}
                    </>
                ) : (
                    /* New Section Form */
                    <View style={styles.formContent}>
                        <InputBox
                            label={t('library.section.name')}
                            value={sectionName}
                            onChangeText={setSectionName}
                            placeholder={t('library.section.namePlaceholder')}
                            required
                            autoFocus
                        />

                        <SectionTypeSelect
                            sectionType={sectionType}
                            onSectionTypeChange={(newType) => {
                                setSectionType(newType);
                                // Set default values based on section type
                                if (newType === 'tabata') {
                                    setWorkSec('20');
                                    setRestSec('10');
                                    setRounds('8');
                                } else if (newType === 'hiit') {
                                    setWorkSec('40');
                                    setRestSec('20');
                                    setRounds('10');
                                } else if (newType === 'emom') {
                                    setIntervalSec('60');
                                    setDurationMin('10');
                                } else if (newType === 'circuits') {
                                    setRounds('3');
                                }
                            }}
                            duration={duration}
                            onDurationChange={setDuration}
                            rounds={rounds}
                            onRoundsChange={setRounds}
                            workSec={workSec}
                            onWorkSecChange={setWorkSec}
                            restSec={restSec}
                            onRestSecChange={setRestSec}
                            intervalSec={intervalSec}
                            onIntervalSecChange={setIntervalSec}
                            durationMin={durationMin}
                            onDurationMinChange={setDurationMin}
                            metadataErrors={{
                                durationError: false,
                                roundsError: false,
                                workSecError: false,
                                restSecError: false,
                                intervalSecError: false,
                                durationMinError: false,
                            }}
                            required
                        />

                        <TextAreaInput
                            label={t('library.section.notes')}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder={t('library.section.notesPlaceholder')}
                            numberOfLines={4}
                            minHeight={80}
                        />
                    </View>
                )}
            </KeyboardAwareScrollView>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        gap: 16,
    },
    tabsWrapper: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginBottom: 16,
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    tabsContainer: {
        flexDirection: 'row',
        flex: 1,
        position: 'relative',
    },
    tabContainer: {
        flex: 1,
    },
    tab: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    tabText: {
        ...typography.p1,
    },
    animatedUnderline: {
        position: 'absolute',
        bottom: 0,
        height: 3,
        borderRadius: 1.5,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
        gap: 16,
    },
    loadingText: {
        ...typography.p2,
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    sectionInfo: {
        flex: 1,
        marginRight: 12,
    },
    sectionName: {
        ...typography.p1,
        fontWeight: '500',
    },
    sectionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        marginTop: 2,
    },
    metaText: {
        ...typography.p3,
    },
    metaDot: {
        ...typography.p3,
    },
    formContent: {
        gap: 16,
    },
});
