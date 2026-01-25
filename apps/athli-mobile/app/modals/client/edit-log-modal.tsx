import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Check, Trash2 } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { InputBox } from '@/components/ui/form-inputs/input-box';
import { IconButton } from '@/components/ui/icon-button';
import { updateMetricLog, deleteMetricLog } from '@/services/client/client-metric-service';
import { updateHabitLog, deleteHabitLog } from '@/services/client/client-habit-service';
import { Dialog } from '@/components/ui/dialog';

export default function EditLogModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();

    const params = useLocalSearchParams<{
        logId: string;
        value: string;
        date: string;
        clientId: string;
        isHabit?: string;
        status?: string;
        assignmentId: string;
    }>();

    const coachId = useClientDetailStore((state) => state.coachId);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    const isHabit = params.isHabit === 'true';
    const initialValue = params.value || '';
    const [value, setValue] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const hasChanged = useMemo(() => {
        return value !== initialValue;
    }, [value, initialValue]);

    const isEmpty = useMemo(() => {
        return value.trim() === '';
    }, [value]);

    const handleClose = useCallback(() => {
        router.back();
    }, [router]);

    const handleDeleteConfirm = useCallback(async () => {
        setShowDeleteDialog(false);
        setIsDeleting(true);
        haptics.medium();

        try {
            if (isHabit) {
                await deleteHabitLog(params.logId, params.clientId, coachId || '');
                await refreshSection('habits');
            } else {
                await deleteMetricLog(params.logId, params.clientId, coachId || '');
                await refreshSection('metrics');
            }

            haptics.success();
            router.back();
        } catch (error) {
            haptics.error();
            setErrorMessage(t('general.errorDeleting'));
            setShowErrorDialog(true);
        } finally {
            setIsDeleting(false);
        }
    }, [isHabit, params, coachId, refreshSection, router, t]);

    const handleDelete = useCallback(() => {
        setShowDeleteDialog(true);
    }, []);

    const handleSave = useCallback(async () => {
        if ((!hasChanged && !isEmpty) || isSaving || isDeleting) return;

        // If value is empty, trigger delete instead
        if (isEmpty) {
            handleDelete();
            return;
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
            setErrorMessage(t('clientDetail.editLog.invalidValue'));
            setShowErrorDialog(true);
            return;
        }

        setIsSaving(true);
        haptics.medium();

        try {
            if (isHabit) {
                await updateHabitLog({
                    logId: params.logId,
                    status: (params.status as 'completed' | 'skipped' | 'partial') || 'completed',
                    value: numValue,
                    clientId: params.clientId,
                    coachId: coachId || '',
                });
                await refreshSection('habits');
            } else {
                await updateMetricLog({
                    logId: params.logId,
                    value: numValue,
                    clientId: params.clientId,
                    coachId: coachId || '',
                });
                await refreshSection('metrics');
            }

            haptics.success();
            router.back();
        } catch (error) {
            haptics.error();
            setErrorMessage(t('general.errorSaving'));
            setShowErrorDialog(true);
        } finally {
            setIsSaving(false);
        }
    }, [hasChanged, isEmpty, isSaving, isDeleting, value, isHabit, params, coachId, refreshSection, router, t, handleDelete]);

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header */}
            <View style={styles.header}>
                <IconButton
                    icon={{ sf: 'xmark', IconComponent: X }}
                    onPress={handleClose}
                    size="md"
                    color={themeColors.text}
                    disabled={isSaving || isDeleting}
                />

                <Text style={[styles.title, { color: themeColors.text }]}>
                    {formatDate(params.date)}
                </Text>

                <IconButton
                    icon={{ sf: 'checkmark', IconComponent: Check }}
                    onPress={handleSave}
                    size="md"
                    variant={(hasChanged || isEmpty) && !isSaving && !isDeleting ? 'primary' : 'default'}
                    disabled={!(hasChanged || isEmpty) || isSaving || isDeleting}
                    loading={isSaving || (isDeleting && isEmpty)}
                    loadingColor={themeColors.primary}
                />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <InputBox
                    label={t('general.value')}
                    value={value}
                    onChangeText={setValue}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    autoFocus
                />

                {/* Delete Icon Button */}
                <View style={styles.deleteRow}>
                    {isDeleting ? (
                        <View style={styles.deleteLoading}>
                            <ActivityIndicator size="small" color="#EF4444" />
                        </View>
                    ) : (
                        <IconButton
                            icon={{ sf: 'trash', IconComponent: Trash2 }}
                            onPress={handleDelete}
                            size="md"
                            color="#EF4444"
                            disabled={isSaving || isDeleting}
                        />
                    )}
                </View>
            </View>

            <Dialog
                visible={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                title={t('clientDetail.editLog.deleteTitle')}
                message={t('clientDetail.editLog.deleteMessage')}
                buttons={[
                    { label: t('general.cancel'), onPress: () => setShowDeleteDialog(false), variant: 'secondary' },
                    { label: t('general.delete'), onPress: handleDeleteConfirm, variant: 'destructive' },
                ]}
            />

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={errorMessage}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16,
    },
    title: {
        ...typography.h6,
        textAlign: 'center',
    },
    content: {
        paddingHorizontal: 16,
        gap: 12,
    },
    deleteRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    deleteLoading: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
