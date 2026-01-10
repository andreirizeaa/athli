import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ClipboardCheck } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/dropdown-menu';

export default function ClientQuestionairesScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const iconColor = themeColors.text;

    const handleBackPress = () => {
        router.back();
    };

    const handleAssignQuestionnaire = () => {
        router.push('/modals/client/assign-questionnaire-to-client-modal');
    };

    const handleAddQuestionnaire = () => {
        router.push('/modals/library/add-questionnaire-modal');
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
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('clientDetail.sections.questionnaires')}</Text>
                <DropdownMenuWrapper options={[
                    {
                        label: t('clientDetail.actions.assignQuestionnaire'),
                        icon: { sf: 'checklist', IconComponent: ClipboardCheck },
                        onPress: handleAssignQuestionnaire
                    },
                    {
                        label: t('clientDetail.actions.addQuestionnaire'),
                        icon: { sf: 'plus', IconComponent: Plus },
                        onPress: handleAddQuestionnaire
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
                <Text style={{ color: themeColors.mutedText }}>Questionnaires content coming soon</Text>
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
