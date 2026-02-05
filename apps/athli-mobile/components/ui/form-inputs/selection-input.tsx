import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { Card } from '@/components/ui/card';
import { haptics } from '@/utils/haptics';

export type SelectionInputProps = {
    label: string;
    value: string | null;
    onPress: () => void;
    onClear?: () => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    clearable?: boolean;
};

export const SelectionInput = ({
    label,
    value,
    onPress,
    onClear,
    placeholder = 'Select...',
    required,
    disabled = false,
    clearable = true,
}: SelectionInputProps) => {
    const { colors: themeColors } = useThemePreference();
    const showClearButton = clearable && value !== null && onClear;

    const handleClear = () => {
        haptics.medium();
        onClear?.();
    };

    const cardContent = (
        <Card variant="form">
            {label.length > 0 && (
                <View style={styles.labelRow}>
                    <Text style={[styles.inputBoxLabel, { color: themeColors.mutedText }]}>
                        {label}
                    </Text>
                    {required && <Text style={styles.requiredAsterisk}>*</Text>}
                </View>
            )}
            <View style={styles.inputRow}>
                <Text
                    style={[
                        styles.inputBoxValue,
                        { color: value ? themeColors.text : themeColors.mutedText },
                    ]}
                >
                    {value || placeholder}
                </Text>
                <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
            </View>
        </Card>
    );

    if (showClearButton) {
        return (
            <View style={styles.clearableRow}>
                <View style={styles.inputContainer}>
                    <PressableOpacity onPress={onPress} enabled={!disabled}>
                        {cardContent}
                    </PressableOpacity>
                </View>
                <PressableOpacity onPress={handleClear}>
                    <SquircleView
                        cornerSmoothing={1}
                        style={[
                            styles.clearButton,
                            {
                                backgroundColor: 'transparent',
                                borderColor: themeColors.border,
                            },
                        ]}
                    >
                        <Trash2 size={20} />
                    </SquircleView>
                </PressableOpacity>
            </View>
        );
    }

    return (
        <PressableOpacity onPress={onPress} enabled={!disabled}>
            {cardContent}
        </PressableOpacity>
    );
};

const styles = StyleSheet.create({
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    inputBoxLabel: {
        ...typography.p4,
    },
    requiredAsterisk: {
        ...typography.p4,
        color: '#EF4444',
        marginLeft: 2,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 28,
    },
    inputBoxValue: {
        ...typography.p1,
        flex: 1,
    },
    clearableRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    inputContainer: {
        flex: 1,
    },
    clearButton: {
        width: 52,
        height: 70,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
