import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { IconButton } from '@/components/icon-button';
import { ScreenWrapper } from '@/components/screen-wrapper';

export default function ClientQuestionairesScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const iconColor = themeColors.text;

    const handleBackPress = () => {
        router.back();
    };

    const handlePlusPress = () => {
        // TODO: Handle plus press
    };

    return (
        <ScreenWrapper>
            <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
                <IconButton
                    icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
                    onPress={handleBackPress}
                    size="md"
                    color={iconColor}
                />
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Questionaires</Text>
                <IconButton
                    icon={{ sf: 'plus', IconComponent: Plus }}
                    onPress={handlePlusPress}
                    size="md"
                    color={iconColor}
                />
            </View>
            <View style={styles.content}>
                <Text style={{ color: themeColors.mutedText }}>Questionaires content coming soon</Text>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 4,
        paddingBottom: 8,
        paddingHorizontal: 16,
    },
    headerTitle: {
        ...typography.h5,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 8,
    },
    headerRightPlaceholder: {
        width: 44,
    },
    content: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
});
