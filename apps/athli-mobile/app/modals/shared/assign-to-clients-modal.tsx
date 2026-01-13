import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, FlatList } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { X, Check } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Separator } from '@/components/ui/separator';
import { hexToRgba } from '@/utils/colorUtils';
import { getClients, type Athlete } from '@/services/coach/coach-client-service';
import { EmptyState } from '@/components/ui/empty-state';

// Fuzzy search function
const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true;

    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    if (textLower.includes(queryLower)) return true;

    let textIndex = 0;
    for (let i = 0; i < queryLower.length; i++) {
        const char = queryLower[i];
        const foundIndex = textLower.indexOf(char, textIndex);
        if (foundIndex === -1) {
            return false;
        }
        textIndex = foundIndex + 1;
    }
    return true;
};

type AssignType = 'workout' | 'habit' | 'checkIn' | 'questionnaire' | 'file' | 'metric' | 'program';

export default function AssignToClientsModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{
        type: AssignType;
        itemIds?: string;
    }>();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

    // Parse item IDs from comma-separated string
    const itemIds = useMemo(() => {
        if (!params.itemIds) return [];
        return params.itemIds.split(',').filter(Boolean);
    }, [params.itemIds]);

    // Fetch clients
    const { data: clients = [], isLoading, isFetching, dataUpdatedAt } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            console.log('[AssignToClientsModal] ❌ FETCHING FROM NETWORK (this should not happen if prefetch worked)');
            const data = await getClients();
            console.log('[AssignToClientsModal] Received clients:', data.length, 'items');
            return data;
        },
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        refetchOnMount: false, // Don't refetch if data exists in cache
        refetchOnWindowFocus: false,
    });

    console.log('[AssignToClientsModal] Query state:', {
        isLoading,
        isFetching,
        hasData: clients.length > 0,
        dataUpdatedAt: dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : 'never',
        cacheStatus: dataUpdatedAt ? 'FROM CACHE ✅' : 'NO CACHE ❌'
    });

    // Filter clients based on search query
    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) {
            return clients;
        }

        return clients.filter((client) => {
            const fullName = client.name.toLowerCase();
            const firstName = client.firstName.toLowerCase();
            const lastName = client.lastName.toLowerCase();
            const query = searchQuery.toLowerCase();

            return (
                fuzzyMatch(fullName, query) ||
                fuzzyMatch(firstName, query) ||
                fuzzyMatch(lastName, query)
            );
        });
    }, [clients, searchQuery]);

    // Get modal title based on type
    const modalTitle = useMemo(() => {
        const typeKey = params.type || 'workout';
        const capitalizedType = typeKey.charAt(0).toUpperCase() + typeKey.slice(1);
        return t(`clientDetail.assignModals.assign${capitalizedType}` as any) || 'Assign to Clients';
    }, [params.type, t]);

    console.log('[AssignToClientsModal] Render:', {
        isLoading,
        totalClients: clients.length,
        filteredClients: filteredClients.length,
        searchQuery
    });

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(() => {
        if (selectedClientIds.size === 0) return;

        // TODO: Implement save functionality
        // Will use selectedClientIds and itemIds to assign items to clients
        handleClose();
    }, [handleClose, selectedClientIds, itemIds]);

    const canSave = selectedClientIds.size > 0;

    const handleClientToggle = useCallback((clientId: string) => {
        setSelectedClientIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(clientId)) {
                newSet.delete(clientId);
            } else {
                newSet.add(clientId);
            }
            return newSet;
        });
    }, []);

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
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {modalTitle}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canSave ? 'primary' : 'default'}
                        disabled={!canSave}
                    />
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <FlatList
                    data={filteredClients}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const isSelected = selectedClientIds.has(item.id);

                        return (
                            <PressableOpacity
                                onPress={() => handleClientToggle(item.id)}
                                style={styles.clientRow}
                            >
                                <View style={styles.avatarContainer}>
                                    <View style={styles.avatarCircle}>
                                        {item.avatarUrl ? (
                                            <Image
                                                source={{ uri: item.avatarUrl }}
                                                style={styles.avatarImage}
                                                contentFit="cover"
                                                contentPosition="center"
                                                cachePolicy="memory-disk"
                                            />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.avatarImage,
                                                    styles.avatarPlaceholder,
                                                    { backgroundColor: themeColors.border },
                                                ]}
                                            />
                                        )}
                                    </View>
                                </View>
                                <View style={styles.clientInfo}>
                                    <Text
                                        style={[styles.clientName, { color: themeColors.text }]}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    {(item.age || item.coachingType) && (
                                        <Text
                                            style={[styles.clientSubtitle, { color: themeColors.mutedText }]}
                                            numberOfLines={1}
                                        >
                                            {[
                                                item.age ? `${item.age} ${t('clients.years')}` : null,
                                                item.coachingType ? (
                                                    item.coachingType === 'in-person'
                                                        ? t('clients.addClientModal.inPerson')
                                                        : item.coachingType === 'online'
                                                            ? t('clients.addClientModal.online')
                                                            : t('clients.addClientModal.hybrid')
                                                ) : null,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </Text>
                                    )}
                                </View>
                                <View
                                    style={[
                                        styles.checkbox,
                                        {
                                            backgroundColor: isSelected ? themeColors.primary : 'transparent',
                                            borderColor: isSelected ? themeColors.primary : themeColors.border,
                                        },
                                    ]}
                                >
                                    {isSelected && (
                                        <Check size={16} color={themeColors.primaryForeground} />
                                    )}
                                </View>
                            </PressableOpacity>
                        );
                    }}
                    ItemSeparatorComponent={() => <Separator style={styles.separator} />}
                    contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16 }]}
                    ListHeaderComponent={
                        <View style={styles.searchContainer}>
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('clients.searchPlaceholder')}
                            />
                        </View>
                    }
                    ListEmptyComponent={
                        isLoading ? (
                            <EmptyState message={t('general.loading') || 'Loading...'} />
                        ) : (
                            <EmptyState message={t('clients.empty')} />
                        )
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
    clientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    avatarContainer: {
        marginLeft: 16,
        marginRight: 12,
    },
    avatarCircle: {
        width: 54,
        height: 54,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    avatarImage: {
        width: 54,
        height: 54,
        borderRadius: 8,
    },
    avatarPlaceholder: {
        backgroundColor: '#e0e0e0',
    },
    clientInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    clientName: {
        ...typography.p1,
        fontWeight: '600',
        marginBottom: 4,
    },
    clientSubtitle: {
        ...typography.p3,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
        marginRight: 16,
    },
    separator: {
        marginLeft: 82, // 16 (padding) + 54 (avatar) + 12 (gap)
        marginRight: 16,
    },
});
