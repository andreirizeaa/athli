import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';

export default function AssignMetricToClientModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState('');

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(() => {
        // TODO: Implement save functionality
        handleClose();
    }, [handleClose]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Fixed Header with gradient */}
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
                        {t('clientDetail.assignModals.assignMetric')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        color={themeColors.text}
                    />
                </View>
            </View>

            {/* Content */}
            <View style={[styles.content, { paddingTop: headerHeight + 16 }]}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={t('general.searchPlaceholder')}
                    style={styles.searchBar}
                />
                <View style={styles.placeholderContainer}>
                    <Text style={{ color: themeColors.mutedText }}>
                        {t('clientDetail.assignModals.placeholder')}
                    </Text>
                </View>
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
        paddingHorizontal: 16,
    },
    searchBar: {
        marginBottom: 16,
    },
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
