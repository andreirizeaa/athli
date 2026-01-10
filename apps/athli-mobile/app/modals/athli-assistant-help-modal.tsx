import React from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';

export default function AthliAssistantHelpModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const iconColor = themeColors.text;

    const handleClose = () => {
        router.back();
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.pageBackground }]}>
            {/* Header */}
            <View style={[styles.header, {
                paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20,
                backgroundColor: themeColors.pageBackground
            }]}>
                <IconButton
                    icon={{ sf: 'xmark', IconComponent: X }}
                    onPress={handleClose}
                    size="md"
                    color={iconColor}
                />
                <Text style={[styles.title, { color: themeColors.text }]}>{t('clientDetail.assistant.helpTitle')}</Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Help content can go here */}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    headerRightPlaceholder: {
        width: 44,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
});
