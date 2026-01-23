import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { PressableOpacity } from 'pressto';
import { ChevronRight, X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';

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
    const showClearButton = hasValue && onClear;

    return (
        <PressableOpacity
            style={[
                styles.container,
                { backgroundColor: themeColors.surfacePrimary },
                style,
            ]}
            onPress={onPress}
        >
            <View style={styles.content}>
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
                    {showClearButton ? (
                        <View style={styles.clearButtonContainer}>
                            <PressableOpacity
                                style={styles.clearButton}
                                onPress={onClear}
                                hitSlop={8}
                            >
                                <View style={[styles.clearButtonIcon, { backgroundColor: themeColors.mutedText }]}>
                                    <X {...({ size: 12, color: themeColors.backgroundTertiary, strokeWidth: 3 } as any)} />
                                </View>
                            </PressableOpacity>
                        </View>
                    ) : (
                        <View style={styles.chevronContainer}>
                            <ChevronRight {...({ size: 20, color: themeColors.mutedText } as any)} />
                        </View>
                    )}
                </View>
            </View>
        </PressableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
    },
    content: {
        flex: 1,
    },
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
    clearButtonContainer: {
        flexShrink: 0,
        paddingTop: 2,
    },
    chevronContainer: {
        flexShrink: 0,
        paddingTop: 2,
    },
    clearButton: {
        // No margin needed, using gap in parent
    },
    clearButtonIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
