import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { PressableOpacity } from 'pressto';
import { ChevronRight } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { Card } from '@/components/ui/card';

type DropdownInputProps = {
    label: string;
    value: string;
    placeholder?: string;
    onPress: () => void;
    onClear?: () => void;
    optional?: boolean;
    required?: boolean;
    style?: ViewStyle;
};

export const DropdownInput = ({
    label,
    value,
    placeholder = '',
    onPress,
    onClear,
    optional = false,
    required = false,
    style,
}: DropdownInputProps) => {
    const { colors: themeColors } = useThemePreference();
    const hasValue = value.trim() !== '';

    return (
        <PressableOpacity onPress={onPress}>
            <Card variant="form" style={style}>
                <View style={styles.labelRow}>
                    <View style={styles.labelWithAsterisk}>
                        <Text style={[styles.label, { color: themeColors.mutedText }]}>
                            {label}
                        </Text>
                        {required && <Text style={styles.requiredAsterisk}>*</Text>}
                    </View>
                    {optional && (
                        <Text style={[styles.optionalLabel, { color: themeColors.mutedText }]}>
                            Optional
                        </Text>
                    )}
                </View>
                <View style={styles.valueRow}>
                    <Text
                        style={[
                            styles.value,
                            { color: hasValue ? themeColors.text : themeColors.mutedText },
                        ]}
                        numberOfLines={0}
                    >
                        {hasValue ? value : placeholder}
                    </Text>
                    <View style={styles.chevronContainer}>
                        <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                    </View>
                </View>
            </Card>
        </PressableOpacity>
    );
};

const styles = StyleSheet.create({
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    labelWithAsterisk: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        ...typography.p4,
    },
    requiredAsterisk: {
        ...typography.p4,
        color: '#EF4444',
        marginLeft: 2,
    },
    optionalLabel: {
        ...typography.p4,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    value: {
        ...typography.p1,
        flex: 1,
        flexShrink: 1,
    },
    chevronContainer: {
        flexShrink: 0,
        paddingTop: 2,
    },
});
