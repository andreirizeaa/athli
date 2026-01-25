import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { Card } from '@/components/ui/card';

export type SelectionInputProps = {
    label: string;
    value: string | null;
    onPress: () => void;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
};

export const SelectionInput = ({
    label,
    value,
    onPress,
    placeholder = 'Select...',
    required,
    disabled = false,
}: SelectionInputProps) => {
    const { colors: themeColors } = useThemePreference();

    return (
        <PressableOpacity onPress={onPress} enabled={!disabled}>
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
});
