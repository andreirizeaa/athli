import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Archive, UserMinus } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { Card } from '@/components/ui/card';
import { SettingsOption } from '@/components/ui/settings-option';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';
import { getClients, type Client } from '@/services/client-service';

export default function ClientSettingsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const iconColor = themeColors.text;
    const iconSize = iconSizes.listIcons;

    const [client, setClient] = useState<Client | null>(null);

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
        const clientName = client?.fullName || '';
        Alert.alert(
            `${t('clientDetail.settings.archivePrefix') || 'Archive'} ${clientName}?`,
            t('clientDetail.settings.archiveClientMessage'),
            [
                { text: t('general.cancel'), style: 'cancel' },
                { text: t('clientDetail.settings.archiveClient'), style: 'destructive', onPress: () => { } }
            ]
        );
    };

    const handleDeleteClient = () => {
        const clientName = client?.fullName || '';
        Alert.alert(
            `${t('clientDetail.settings.deletePrefix') || 'Delete'} ${clientName}?`,
            t('clientDetail.settings.deleteClientMessage'),
            [
                { text: t('general.cancel'), style: 'cancel' },
                { text: t('clientDetail.settings.deleteClient'), style: 'destructive', onPress: () => { } }
            ]
        );
    };

    return (
        <ScreenWrapper contentContainerStyle={styles.scrollContent}>
            <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
                <IconButton
                    icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
                    onPress={handleBackPress}
                    size="sm"
                    color={iconColor}
                />
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                    {t('clientDetail.settings.title')}
                </Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

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
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingBottom: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 4,
        paddingBottom: 8,
        paddingHorizontal: 16,
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
