import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/ui/icon-button';

export default function AddProgramModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const handleClose = () => {
        if (router.canGoBack()) {
            router.back();
        }
    };

    const handleSave = () => {
        // TODO: Implement save functionality
        if (router.canGoBack()) {
            router.back();
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20,
                        backgroundColor: themeColors.background,
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
                    {t('library.addProgram.title')}
                </Text>
                <IconButton
                    icon={{ sf: 'checkmark', IconComponent: Check }}
                    onPress={handleSave}
                    size="md"
                    color={themeColors.mutedText}
                    disabled={true}
                    style={{ opacity: 0.5 }}
                />
            </View>

            {/* Content - Blank for now */}
            <View style={styles.content} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderTopWidth: 0,
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
        paddingTop: 8,
    },
});
