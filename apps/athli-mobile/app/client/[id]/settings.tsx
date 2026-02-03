import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dialog } from '@/components/ui/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Archive, UserMinus } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { Card } from '@/components/ui/card';
import { SettingsOption } from '@/components/ui/settings-option';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';
import { getClients, type Client } from '@/services/client-service';

export default function ClientSettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const HEADER_HEIGHT = 52;
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const iconColor = themeColors.text;
    const iconSize = iconSizes.listIcons;

    const [client, setClient] = useState<Client | null>(null);
    const [showArchiveDialog, setShowArchiveDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    useEffect(() => {
        const loadClient = async () => {
            try {
                const clients = await getClients();
                const foundClient = clients.find((c) => c.id === id);
                setClient(foundClient || null);
            } catch (error) {
                console.error('Failed to load client:', error);
            }
        };
        if (id) loadClient();
    }, [id]);

    const handleBackPress = () => {
        router.back();
    };

    const handleArchiveClient = () => {
        setShowArchiveDialog(true);
    };

    const handleDeleteClient = () => {
        setShowDeleteDialog(true);
    };

    return (
        <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contentContainer}>
                    <Card>
                        <SettingsOption
                            icon={
                                <PlatformIcon
                                    sf="archivebox"
                                    IconComponent={Archive}
                                    size={iconSize}
                                    color={iconColor}
                                />
                            }
                            title={t('clientDetail.settings.archiveClient')}
                            onPress={handleArchiveClient}
                            showChevron
                        />
                        <Separator />
                        <SettingsOption
                            icon={
                                <PlatformIcon
                                    sf="person.badge.minus"
                                    IconComponent={UserMinus}
                                    size={iconSize}
                                    color={iconColor}
                                />
                            }
                            title={t('clientDetail.settings.deleteClient')}
                            onPress={handleDeleteClient}
                            showChevron
                        />
                    </Card>
                </View>
            </ScrollView>

            <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

            <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
                <IconButton
                    icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
                    onPress={handleBackPress}
                    size="md"
                    color={iconColor}
                />
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                    {t('clientDetail.settings.title')}
                </Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            <Dialog
                visible={showArchiveDialog}
                onClose={() => setShowArchiveDialog(false)}
                title={`${t('clientDetail.settings.archivePrefix') || 'Archive'} ${client?.name || ''}?`}
                message={t('clientDetail.settings.archiveClientMessage')}
                buttons={[
                    {
                        label: t('general.cancel'),
                        onPress: () => setShowArchiveDialog(false),
                        variant: 'secondary',
                    },
                    {
                        label: t('clientDetail.settings.archiveClient'),
                        onPress: () => {
                            setShowArchiveDialog(false);
                            // TODO: Implement archive logic
                        },
                        variant: 'destructive',
                    },
                ]}
            />

            <Dialog
                visible={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                title={`${t('clientDetail.settings.deletePrefix') || 'Delete'} ${client?.name || ''}?`}
                message={t('clientDetail.settings.deleteClientMessage')}
                buttons={[
                    {
                        label: t('general.cancel'),
                        onPress: () => setShowDeleteDialog(false),
                        variant: 'secondary',
                    },
                    {
                        label: t('clientDetail.settings.deleteClient'),
                        onPress: () => {
                            setShowDeleteDialog(false);
                            // TODO: Implement delete logic
                        },
                        variant: 'destructive',
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 8,
        zIndex: 1001,
    },
    headerTitle: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
    },
    headerRightPlaceholder: {
        width: 36,
    },
    contentContainer: {
        paddingHorizontal: 16,
        marginTop: 16,
    },
});
