import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Platform, StyleSheet, Text, View, LayoutChangeEvent, TextInput, ScrollView } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, ChevronRight, ChevronDown } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { SECTION_TYPES, type SectionType } from '@/constants/training';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput } from '@/components/ui/form-inputs';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { type BuilderSection } from '@/components/features/workout/workout-schema';

// Saved sections would come from a service in production
const SAVED_SECTIONS: { id: string; name: string; sectionType: SectionType; exerciseCount: number; duration?: string; rounds?: string }[] = [];

type TabKey = 'saved' | 'new';

export default function AddSectionToBuilderModal() {
    const router = useRouter();
    const { primaryColor, colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { triggerSectionSelect } = useModalCallbacks();

    const [selectedTab, setSelectedTab] = useState<TabKey>('saved');
    const underlinePosition = useSharedValue(0);
    const underlineWidth = useSharedValue(0);
    const tabLayoutsRef = useRef<{ [key: string]: { x: number; width: number } }>({});

    // Form state for New tab
    const [sectionName, setSectionName] = useState('');
    const [sectionType, setSectionType] = useState<SectionType>('regular');
    const [duration, setDuration] = useState('');
    const [rounds, setRounds] = useState('');
    const [notes, setNotes] = useState('');

    // Search state for Saved tab
    const [searchQuery, setSearchQuery] = useState('');

    // Tabs - Saved first, New second
    const tabs: { key: TabKey; label: string }[] = [
        { key: 'saved', label: t('library.addSection.tabs.saved') },
        { key: 'new', label: t('library.addSection.tabs.new') },
    ];

    // Filter saved sections based on search query
    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) {
            return SAVED_SECTIONS;
        }
        const query = searchQuery.toLowerCase().trim();
        return SAVED_SECTIONS.filter(
            (section) =>
                section.name.toLowerCase().includes(query) ||
                section.sectionType.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const UNDERLINE_EXTRA_WIDTH = 8;

    // Form validation for New tab
    const canComplete = useMemo(() => {
        return sectionName.trim().length > 0;
    }, [sectionName]);

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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    const handleSelectSavedSection = useCallback((savedSection: typeof SAVED_SECTIONS[0]) => {
        // Create a copy of the saved section with a new ID
        const section: BuilderSection = {
            id: `section-${Date.now()}`,
            type: 'section',
            name: savedSection.name,
            sectionType: savedSection.sectionType,
            duration: savedSection.sectionType === 'amrap' ? savedSection.duration : undefined,
            rounds: savedSection.sectionType === 'timed' || savedSection.sectionType === 'circuits' ? savedSection.rounds : undefined,
            exercises: [], // Exercises would be loaded from the saved section
        };

        triggerSectionSelect(section);
        router.dismiss();
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
        };

        triggerSectionSelect(section);
        router.dismiss();
    }, [sectionName, sectionType, duration, rounds, notes, triggerSectionSelect, router]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;

    const sectionTypeOptions = useMemo(() =>
        SECTION_TYPES.map((type) => ({
            value: type.value,
            label: type.label,
            subtitle: type.description,
        }))
        , []);

    const getSectionTypeLabel = () => {
        const found = SECTION_TYPES.find(t => t.value === sectionType);
        return found?.label || sectionType;
    };

    const getSectionDetails = (section: typeof SAVED_SECTIONS[0]) => {
        const type = SECTION_TYPES.find(t => t.value === section.sectionType)?.label || section.sectionType;
        let details = type;
        if (section.sectionType === 'amrap' && section.duration) {
            details += ` • ${section.duration}m`;
        } else if ((section.sectionType === 'timed' || section.sectionType === 'circuits') && section.rounds) {
            details += ` • ${section.rounds} rounds`;
        }
        details += ` • ${section.exerciseCount} exercises`;
        return details;
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
                            placeholder={t('library.addSection.searchPlaceholder')}
                        />

                        {/* Saved Sections List */}
                        {filteredSections.length === 0 ? (
                            <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                                {t('library.addSection.noSectionsFound')}
                            </Text>
                        ) : (
                            <Card style={{ backgroundColor: themeColors.surfaceSecondary }}>
                                {filteredSections.map((section, index) => (
                                    <React.Fragment key={section.id}>
                                        {index > 0 && <Separator />}
                                        <PressableOpacity
                                            style={styles.sectionRow}
                                            onPress={() => handleSelectSavedSection(section)}
                                        >
                                            <View style={styles.sectionInfo}>
                                                <Text style={[styles.sectionName, { color: themeColors.text }]}>
                                                    {section.name}
                                                </Text>
                                                <Text
                                                    style={[styles.sectionDetails, { color: themeColors.mutedText }]}
                                                    numberOfLines={1}
                                                >
                                                    {getSectionDetails(section)}
                                                </Text>
                                            </View>
                                            <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                                        </PressableOpacity>
                                    </React.Fragment>
                                ))}
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

                        <View style={[styles.card, { backgroundColor: themeColors.surfaceSecondary }]}>
                            <DropdownMenuWrapper options={sectionTypeOptions.map(opt => ({
                                label: opt.label,
                                subtitle: opt.subtitle,
                                onPress: () => setSectionType(opt.value as SectionType)
                            }))}>
                                <View style={styles.fieldRow}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>{t('library.section.type')}</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={styles.dropdownValueRow}>
                                        <Text style={[styles.dropdownValue, { color: themeColors.text }]}>
                                            {getSectionTypeLabel()}
                                        </Text>
                                        <ChevronDown {...({ size: 14, color: themeColors.mutedText } as any)} />
                                    </View>
                                </View>
                            </DropdownMenuWrapper>

                            {sectionType === 'amrap' && (
                                <>
                                    <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                    <View style={styles.fieldRow}>
                                        <View style={styles.labelContainer}>
                                            <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>{t('library.section.duration')}</Text>
                                            <Text style={styles.requiredAsterisk}>*</Text>
                                        </View>
                                        <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                            <TextInput
                                                value={duration}
                                                onChangeText={setDuration}
                                                placeholder="0"
                                                placeholderTextColor={themeColors.mutedText}
                                                keyboardType="number-pad"
                                                style={[styles.dropdownValue, { color: themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
                                            />
                                            <Text style={[styles.dropdownValue, { color: themeColors.mutedText }]}>m</Text>
                                        </View>
                                    </View>
                                </>
                            )}

                            {(sectionType === 'timed' || sectionType === 'circuits') && (
                                <>
                                    <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                    <View style={styles.fieldRow}>
                                        <View style={styles.labelContainer}>
                                            <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>{t('library.section.rounds')}</Text>
                                            <Text style={styles.requiredAsterisk}>*</Text>
                                        </View>
                                        <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                            <TextInput
                                                value={rounds}
                                                onChangeText={setRounds}
                                                placeholder="0"
                                                placeholderTextColor={themeColors.mutedText}
                                                keyboardType="number-pad"
                                                style={[styles.dropdownValue, { color: themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
                                            />
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

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
    },
    tabsWrapper: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginBottom: 16,
        marginHorizontal: -16, // Full width
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
    emptyText: {
        ...typography.p2,
        textAlign: 'center',
        marginTop: 24,
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    sectionInfo: {
        flex: 1,
        marginRight: 12,
    },
    sectionName: {
        ...typography.p1,
        fontWeight: '500',
    },
    sectionDetails: {
        ...typography.p3,
        marginTop: 2,
    },
    formContent: {
        gap: 16,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    fieldLabel: {
        ...typography.p4,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requiredAsterisk: {
        ...typography.p4,
        color: '#EF4444',
        marginLeft: 2,
    },
    dropdownValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dropdownValue: {
        ...typography.p2,
    },
});
