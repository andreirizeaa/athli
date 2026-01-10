import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ClipboardCheck, CheckCircle } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/dropdown-menu';

export default function ClientHabitsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const iconColor = themeColors.text;

    const handleBackPress = () => {
        router.back();
    };

    const handleAssignHabit = () => {
        router.push('/modals/client/assign-habit-to-client-modal');
    };

    const handleAddHabit = () => {
        router.push('/modals/library/add-habit-modal');
    };

    const handleLogHabit = () => {
        router.push('/modals/client/log-habit-for-client-modal');
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
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('clientDetail.sections.habits')}</Text>
                <DropdownMenuWrapper options={[
                    {
                        label: t('clientDetail.actions.assignHabit'),
                        icon: { sf: 'checklist', IconComponent: ClipboardCheck },
                        onPress: handleAssignHabit
                    },
                    {
                        label: t('clientDetail.actions.addHabit'),
                        icon: { sf: 'plus', IconComponent: Plus },
                        onPress: handleAddHabit
                    },
                    {
                        label: t('clientDetail.actions.logHabit'),
                        icon: { sf: 'checkmark.circle', IconComponent: CheckCircle },
                        onPress: handleLogHabit
                    }
                ]}>
                    <IconButton
                        icon={{ sf: 'plus', IconComponent: Plus }}
                        onPress={() => { }}
                        size="md"
                        color={iconColor}
                    />
                </DropdownMenuWrapper>
            </View>
            <View style={styles.content}>
                <Text style={{ color: themeColors.mutedText }}>{t('clientDetail.habitsPlaceholder')}</Text>
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
