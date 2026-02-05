import React, { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, Repeat } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Separator } from '@/components/ui/separator';
import { useModalCallbacks, useClientDetailStore } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { type ClientHabit } from '@/services/client/client-habit-service';

export default function SelectClientHabitModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { triggerClientHabitSelect } = useModalCallbacks();

    const params = useLocalSearchParams<{ clientId: string }>();

    const [searchQuery, setSearchQuery] = useState('');

    // Get habits from the client detail store (already loaded)
    const habits = useClientDetailStore((state) => state.habits);

    const handleClose = () => {
        router.back();
    };

    const handleSelectHabit = (habit: ClientHabit) => {
        triggerClientHabitSelect(habit);
        router.back();
    };

    const filteredHabits = useMemo(() => {
        if (!searchQuery.trim()) {
            return habits;
        }

        const query = searchQuery.toLowerCase().trim();
        return habits.filter((habit) =>
            fuzzyMatch(habit.name.toLowerCase(), query) ||
            (habit.description && fuzzyMatch(habit.description.toLowerCase(), query))
        );
    }, [habits, searchQuery]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderItem = ({ item }: { item: ClientHabit }) => (
        <PressableOpacity
            style={styles.habitRow}
            onPress={() => handleSelectHabit(item)}
        >
            <View style={[styles.habitIconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
                <PlatformIcon
                    sf="repeat"
                    IconComponent={Repeat}
                    size={20}
                    color={themeColors.primary}
                />
            </View>
            <View style={styles.habitInfo}>
                <Text style={[styles.habitName, { color: themeColors.text }]}>{item.name}</Text>
                {item.description && (
                    <Text style={[styles.habitDescription, { color: themeColors.mutedText }]} numberOfLines={1}>
                        {item.description}
                    </Text>
                )}
                <Text style={[styles.habitPeriod, { color: themeColors.mutedText }]}>
                    {item.period === 'daily' ? t('general.daily') : t('general.weekly')}
                    {item.amount ? ` · ${item.amount} ${item.unit}` : ''}
                </Text>
            </View>
            <ChevronRight {...({ size: 18, color: themeColors.mutedText } as any)} />
        </PressableOpacity>
    );

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
                        {t('clientDetail.selectHabit.title')}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>
            </View>

            <View style={styles.content}>
                <FlashList
                    data={filteredHabits}
                    keyExtractor={(item) => item.assignment_id}
                    renderItem={renderItem}
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
                    ListEmptyComponent={
                        <EmptyState message={t('clientDetail.habits.emptyTitle')} />
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
    habitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    habitIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
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
    habitPeriod: {
        ...typography.p3,
        fontWeight: '500',
        marginTop: 2,
    },
    separator: {
        marginLeft: 68,
        marginRight: 16,
    },
});
