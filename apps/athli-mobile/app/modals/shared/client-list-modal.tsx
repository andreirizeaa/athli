import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, UserPlus, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { SearchBar } from '@/components/ui/search-bar';
import { ClientSelectionList } from '@/components/features/clients/client-selection-list';
import { type Client } from '@/services/client-service';
import { IconButton } from '@/components/ui/icon-button';
import { hexToRgba } from '@/utils/colorUtils';
import { FilledButton } from '@/components/ui/buttons';

// TODO: Replace with actual TanStack Query hook: const { data: clients, isLoading } = useClients()
// Mock data to mimic TanStack Query behavior
import { MOCK_CLIENTS } from '@/constants/mock-clients';

export default function ClientListModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { triggerClientsSelect } = useModalCallbacks();
    const params = useLocalSearchParams<{
        title?: string;
        buttonText?: string;
    }>();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

    // TODO: Replace with TanStack Query: const { data: clients, isLoading } = useClients()
    // For now, use mock data directly (simulates cached TanStack Query data)
    const clients = MOCK_CLIENTS;
    const isLoading = false;

    const modalTitle = params.title || t('calendar.newSession.selectClient');
    const actionButtonText = params.buttonText || t('general.done');

    // Filter clients based on search query
    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) {
            return clients;
        }
        const query = searchQuery.toLowerCase();
        return clients.filter(
            (client: Client) =>
                client.firstName.toLowerCase().includes(query) ||
                client.lastName.toLowerCase().includes(query) ||
                client.fullName.toLowerCase().includes(query)
        );
    }, [clients, searchQuery]);

    const handleAction = useCallback(() => {
        if (selectedClientIds.size === 0) {
            Alert.alert(t('general.error'), t('clients.selectAtLeastOne'));
            return;
        }

        const selectedClients = clients.filter((c: Client) => selectedClientIds.has(c.id));
        triggerClientsSelect(selectedClients);
        router.back();
    }, [selectedClientIds, clients, triggerClientsSelect, router, t]);

    const handleClose = () => {
        router.back();
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

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
                    <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
                        {modalTitle}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleAction}
                        size="md"
                        variant={selectedClientIds.size > 0 ? 'primary' : 'default'}
                        disabled={selectedClientIds.size === 0}
                    />
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* Loading or Client List */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={themeColors.primary} />
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        <ClientSelectionList
                            clients={filteredClients}
                            selectedClientIds={selectedClientIds}
                            onSelectionChange={setSelectedClientIds}
                            ListHeaderComponent={
                                <View style={[styles.searchContainer, { paddingTop: headerHeight + 16 }]}>
                                    <SearchBar
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        placeholder={t('chats.newChat.searchPlaceholder')}
                                    />
                                </View>
                            }
                        />
                    </View>
                )}
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
    headerPlaceholder: {
        width: 44,
        height: 44,
    },
    content: {
        flex: 1,
    },
    listContainer: {
        flex: 1,
    },
    searchContainer: {
        paddingBottom: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    bottomContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
    },
});
