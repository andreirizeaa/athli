import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SelectionInput, InputBox } from '@/components/ui/form-inputs';
import { useModalCallbacks, useClientDetailStore } from '@/stores';
import { type ClientMetric, logMetric } from '@/services/client/client-metric-service';
import { hexToRgba } from '@/utils/colorUtils';
import { haptics } from '@/utils/haptics';

export default function LogMetricForClientModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { setClientMetricSelectCallback, setDateSelectCallback } = useModalCallbacks();

    const params = useLocalSearchParams<{
        clientId: string;
        preselectedMetricId?: string;
        disabled?: string;
    }>();

    const clientId = params.clientId;
    const preselectedMetricId = params.preselectedMetricId;
    const isMetricSelectionDisabled = params.disabled === 'true';

    // Get metrics and coachId from store
    const metrics = useClientDetailStore((state) => state.metrics);
    const coachId = useClientDetailStore((state) => state.coachId);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    // Form state
    const [selectedMetric, setSelectedMetric] = useState<ClientMetric | null>(null);
    const [value, setValue] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [isSaving, setIsSaving] = useState(false);

    // Pre-select metric if provided
    useEffect(() => {
        if (preselectedMetricId && metrics.length > 0) {
            const metric = metrics.find(
                (m) => m.assignment_id === preselectedMetricId || m.id === preselectedMetricId
            );
            if (metric) {
                setSelectedMetric(metric);
            }
        }
    }, [preselectedMetricId, metrics]);

    const handleBackPress = () => {
        router.back();
    };

    const handleSelectMetricPress = useCallback(() => {
        if (isMetricSelectionDisabled) return;

        setClientMetricSelectCallback((metric: ClientMetric) => {
            setSelectedMetric(metric);
        });
        router.push({
            pathname: '/modals/client/select-client-metric-modal',
            params: { clientId }
        });
    }, [router, setClientMetricSelectCallback, clientId, isMetricSelectionDisabled]);

    const handleSelectDatePress = useCallback(() => {
        setDateSelectCallback((newDate: Date) => {
            setDate(newDate);
        });
        router.push({
            pathname: '/modals/calendar/select-date-modal',
            params: { selectedDate: date.toISOString(), allowFuture: 'false' }
        });
    }, [router, setDateSelectCallback, date]);

    const handleSave = async () => {
        if (!selectedMetric || !value || !clientId || !coachId) return;

        setIsSaving(true);
        try {
            await logMetric({
                assignmentId: selectedMetric.assignment_id,
                value: parseFloat(value),
                date,
                clientId,
                coachId,
            });

            haptics.success();
            await refreshSection('metrics');
            router.back();
        } catch (error) {
            haptics.error();
            Alert.alert(
                t('general.error'),
                t('general.errorSaving')
            );
        } finally {
            setIsSaving(false);
        }
    };

    const isFormValid = useMemo(() => {
        return !!selectedMetric && !!value.trim() && !isSaving;
    }, [selectedMetric, value, isSaving]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header */}
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
                        {
                            paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
                        },
                    ]}
                >
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleBackPress}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {t('clientDetail.actions.logMetricTitle')}
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
                    <SelectionInput
                        label={t('clientDetail.sections.metrics')}
                        value={selectedMetric?.name || null}
                        onPress={handleSelectMetricPress}
                        required
                        disabled={isMetricSelectionDisabled}
                    />

                    <InputBox
                        label={`${t('general.value')}${selectedMetric?.unit ? ` (${selectedMetric.unit})` : ''}`}
                        value={value}
                        onChangeText={(text) => setValue(text.replace(/[^0-9.]/g, ''))}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        required
                    />

                    <SelectionInput
                        label={t('general.date')}
                        value={date.toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        })}
                        onPress={handleSelectDatePress}
                        required
                    />
                </View>
            </KeyboardAwareScrollView>
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
