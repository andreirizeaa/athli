import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { PressableOpacity } from 'pressto';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { Card } from '@/components/ui/card';
import { haptics } from '@/utils/haptics';

type DropdownInputProps = {
    label: string;
    value: string;
    placeholder?: string;
    onPress: () => void;
    onClear?: () => void;
    optional?: boolean;
    required?: boolean;
    clearable?: boolean;
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
    clearable = false,
    style,
}: DropdownInputProps) => {
    const { colors: themeColors } = useThemePreference();
    const hasValue = value.trim() !== '';
    const showClearButton = clearable && hasValue && onClear;

    const handleClear = () => {
        haptics.medium();
        onClear?.();
    };

    const cardContent = (
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
    );

    if (showClearButton) {
        return (
            <View style={styles.clearableRow}>
                <View style={styles.inputContainer}>
                    <PressableOpacity onPress={onPress}>
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
                        <Trash2 size={20} color={themeColors.text} />
                    </SquircleView>
                </PressableOpacity>
            </View>
        );
    }

    return (
        <PressableOpacity onPress={onPress}>
            {cardContent}
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
