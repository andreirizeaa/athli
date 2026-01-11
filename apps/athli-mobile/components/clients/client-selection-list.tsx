import React, { useCallback, useState, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { Check } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { Separator } from '@/components/separator';
import type { Client } from '@/services/client-service';

type ClientSelectionListProps = {
    clients: Client[];
    isLoading?: boolean;
    selectedClientIds: Set<string>;
    onSelectionChange: (selectedIds: Set<string>) => void;
    ListHeaderComponent?: React.ReactElement | null;
};

export const ClientSelectionList = ({
    clients,
    isLoading,
    selectedClientIds,
    onSelectionChange,
    ListHeaderComponent,
}: ClientSelectionListProps) => {
    const { colors: themeColors } = useThemePreference();

    const handlePress = useCallback((clientId: string) => {
        const newSelected = new Set(selectedClientIds);
        if (newSelected.has(clientId)) {
            newSelected.delete(clientId);
        } else {
            newSelected.add(clientId);
        }
        onSelectionChange(newSelected);
    }, [selectedClientIds, onSelectionChange]);

    const renderItem = useCallback(({ item }: { item: Client }) => {
        const isSelected = selectedClientIds.has(item.id);

        return (
            <PressableOpacity
                style={styles.clientItem}
                onPress={() => handlePress(item.id)}
            >
                <View style={styles.avatarContainer}>
                    {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    ) : (
                        <View
                            style={[
                                styles.avatar,
                                styles.avatarPlaceholder,
                                { backgroundColor: themeColors.border },
                            ]}
                        />
                    )}
                </View>
                <Text style={[styles.clientName, { color: themeColors.text }]} numberOfLines={1}>
                    {item.fullName}
                </Text>
                <View style={[
                    styles.radioOuter,
                    { borderColor: isSelected ? themeColors.primary : themeColors.border },
                    isSelected && { backgroundColor: themeColors.primary },
                ]}>
                    {isSelected && (
                        <Check {...({ size: 12, color: themeColors.primaryForeground, strokeWidth: 3 } as any)} />
                    )}
                </View>
            </PressableOpacity>
        );
    }, [selectedClientIds, themeColors, handlePress]);

    const renderSeparator = useCallback(() => (
        <Separator style={styles.separator} />
    ), []);


    return (
        <View style={styles.container}>
            <FlashList<Client>
                data={clients}
                renderItem={renderItem}
                ItemSeparatorComponent={renderSeparator}
                ListHeaderComponent={ListHeaderComponent}
                // @ts-ignore - estimatedItemSize is a valid FlashList prop but types may be outdated
                estimatedItemSize={60}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    clientItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        backgroundColor: '#e0e0e0',
    },
    clientName: {
        ...typography.p2,
        flex: 1,
        fontWeight: '500',
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    separator: {
        marginLeft: 56, // 44 (avatar) + 12 (margin)
    },
});
