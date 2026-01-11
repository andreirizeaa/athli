import React from 'react';
import type { JSX } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Platform, StyleSheet, Text, View, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';

type PlatformIconProps = {
    sf: string;
    IconComponent: LucideIcon;
    size?: number;
    color?: string;
};

const PlatformIcon = ({ sf, IconComponent, size = 24, color = '#000000' }: PlatformIconProps) => {
    if (Platform.OS === 'ios') {
        return <SymbolView name={sf as any} tintColor={color} size={size} type="monochrome" />;
    }
    return <IconComponent {...({ size, color } as any)} />;
};

export interface ListRowItemProps {
    icon: JSX.Element;
    title: string;
    subtitle?: string;
    subtitleRight?: boolean;
    onPress?: (event: GestureResponderEvent) => void;
    showChevron?: boolean;
    style?: object;
    chevronSize?: number;
}

export function ListRowItem({ icon, title, subtitle, subtitleRight, onPress, showChevron, style, chevronSize }: ListRowItemProps) {
    const { colors: themeColors } = useThemePreference();

    const handleOptionPress = (event: GestureResponderEvent) => {
        if (!onPress) {
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(event);
    };

    return (
        <Pressable
            style={({ pressed }) => [
                styles.row,
                {
                    backgroundColor: pressed ? themeColors.surfaceSecondary : 'transparent',
                    opacity: 1 // Reset opacity since we're using background color
                },
                style,
            ]}
            onPress={onPress ? handleOptionPress : undefined}
        >
            <View style={styles.iconContainer}>{icon}</View>
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
                {subtitle && !subtitleRight && (
                    <Text style={[styles.subtitle, { color: themeColors.mutedText }]}>{subtitle}</Text>
                )}
            </View>
            {subtitle && subtitleRight && (
                <View style={styles.subtitleRightContainer}>
                    <Text style={[styles.subtitleRight, { color: themeColors.mutedText }]}>{subtitle}</Text>
                </View>
            )}
            {showChevron && (
                <View style={styles.chevronContainer}>
                    <PlatformIcon sf="chevron.right" IconComponent={ChevronRight} size={chevronSize || iconSizes.extraSmallIcons} color={themeColors.mutedText} />
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12, // Increased padding for better touch target in lists
        paddingHorizontal: 4, // Add horizontal padding
    },
    iconContainer: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12, // Increased margin
    },
    textContainer: {
        flex: 1,
    },
    subtitleRightContainer: {
        marginRight: 4,
    },
    chevronContainer: {
        marginLeft: 4,
    },
    title: {
        ...typography.p1,
    },
    subtitle: {
        ...typography.p6,
        marginTop: 2,
    },
    subtitleRight: {
        ...typography.p6,
    },
});
