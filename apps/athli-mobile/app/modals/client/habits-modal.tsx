import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Text, Platform, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Search, ChevronRight } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { SearchBar } from '@/components/search-bar';
import { defaultHabits, type DefaultHabit } from '@/constants/habits';
import { Separator } from '@/components/separator';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import { hexToRgba } from '@/utils/colorUtils';

export default function HabitsModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const { triggerHabitSelect } = useModalCallbacks();

    const [searchQuery, setSearchQuery] = useState('');

    const handleClose = () => {
        router.back();
    };

    const handleSelectHabit = (habit: DefaultHabit) => {
        triggerHabitSelect(habit);
        router.back();
    };

    const filteredHabits = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const results: { section: string; habits: DefaultHabit[] }[] = [];

        defaultHabits.forEach(section => {
            const matches = section.habits.filter(h =>
                h.name.toLowerCase().includes(query)
            );
            if (matches.length > 0) {
                results.push({ section: section.label, habits: matches });
            }
        });

        return results;
    }, [searchQuery]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderItem = ({ item }: { item: { section: string; habits: DefaultHabit[] } }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.mutedText }]}>{item.section}</Text>
            <View style={[styles.listContainer, { backgroundColor: themeColors.surfaceSecondary }]}>
                {item.habits.map((habit, index) => (
                    <React.Fragment key={habit.name}>
                        {index > 0 && <Separator />}
                        <PressableOpacity
                            style={styles.habitRow}
                            onPress={() => handleSelectHabit(habit)}
                        >
                            <View style={styles.habitInfo}>
                                <Text style={[styles.habitName, { color: themeColors.text }]}>{habit.name}</Text>
                                {habit.description && (
                                    <Text style={[styles.habitDescription, { color: themeColors.mutedText }]} numberOfLines={1}>
                                        {habit.description}
                                    </Text>
                                )}
                            </View>
                            <ChevronRight {...({ size: 18, color: themeColors.mutedText } as any)} />
                        </PressableOpacity>
                    </React.Fragment>
                ))}
            </View>
        </View>
    );

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
                        {t('clientDetail.sections.habits')}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>
            </View>

            <View style={[styles.content]}>
                <FlatList
                    data={filteredHabits}
                    keyExtractor={(item) => item.section}
                    renderItem={renderItem}
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
    section: {
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        ...typography.p4,
        marginBottom: 8,
        marginLeft: 4,
    },
    listContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    habitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    habitInfo: {
        flex: 1,
    },
    habitName: {
        ...typography.p1,
        fontWeight: '500',
    },
    habitDescription: {
        ...typography.p3,
        marginTop: 2,
    },
});
