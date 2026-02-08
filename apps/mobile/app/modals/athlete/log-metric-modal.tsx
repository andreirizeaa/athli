import React, { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useQueryClient } from '@tanstack/react-query';

import { useThemePreference, useTranslations, useAuth } from '@/stores';
import { typography } from '@/constants/typography';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox } from '@/components/ui/form-inputs';
import { logMetric } from '@/services/client/client-metric-service';
import { hexToRgba } from '@/utils/colorUtils';
import { haptics } from '@/utils/haptics';
import { Dialog } from '@/components/ui/dialog';

export default function AthleteLogMetricModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { clientProfile } = useAuth();

    const params = useLocalSearchParams<{
        assignmentId: string;
        metricName: string;
        date: string;
    }>();

    const [value, setValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    const dateDisplay = useMemo(() => {
        if (!params.date) return '';
        const d = new Date(params.date);
        return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
    }, [params.date]);

    const handleBackPress = () => {
        router.back();
    };

    const handleSave = async () => {
        if (!params.assignmentId || !value || !clientProfile) return;

        setIsSaving(true);
        try {
            await logMetric({
                assignmentId: params.assignmentId,
                value: parseFloat(value),
                date: new Date(params.date),
                clientId: clientProfile.client_id,
                coachId: clientProfile.coach_id,
            });

            haptics.success();
            await queryClient.invalidateQueries({ queryKey: ['athlete-tasks'] });
            router.back();
        } catch (error) {
            haptics.error();
            setShowErrorDialog(true);
        } finally {
            setIsSaving(false);
        }
    };

    const isFormValid = useMemo(() => {
        return !!value.trim() && !isSaving;
    }, [value, isSaving]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={[
                        hexToRgba(themeColors.backgroundSecondary, 1),
                        hexToRgba(themeColors.backgroundSecondary, 0.85),
                        hexToRgba(themeColors.backgroundSecondary, 0.5),
                        hexToRgba(themeColors.backgroundSecondary, 0),
                    ]}
                    locations={[0, 0.5, 0.8, 1]}
                    style={[styles.headerGradient, { height: gradientHeight }]}
                    pointerEvents="none"
                />
                <View
                    style={[
                        styles.header,
                        { paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12 },
                    ]}
                >
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleBackPress}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {params.metricName || t('clientDetail.actions.logMetricTitle')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={isFormValid ? 'primary' : 'default'}
                        disabled={!isFormValid}
                        loading={isSaving}
                    />
                </View>
            </View>

            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.content, { paddingTop: headerHeight + 16 }]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.form}>
                    <InputBox
                        label={t('general.value')}
                        value={value}
                        onChangeText={(text) => setValue(text.replace(/[^0-9.]/g, ''))}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        required
                        autoFocus
                    />

                    <InputBox
                        label={t('general.date')}
                        value={dateDisplay}
                        onChangeText={() => {}}
                        editable={false}
                    />
                </View>
            </KeyboardAwareScrollView>

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={t('general.errorSaving')}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />
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
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    form: {
        gap: 16,
    },
});
