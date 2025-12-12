import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Archive } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';

type ArchivedItemProps = {
  onPress: () => void;
};

export const ArchivedItem = ({ onPress }: ArchivedItemProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <Pressable onPress={onPress}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <PlatformIcon
            sf="archivebox"
            IconComponent={Archive}
            size={iconSizes.listIcons}
            color={themeColors.mutedText}
          />
        </View>
        <View style={styles.textContainer}>
          <Text
            style={[styles.archivedText, { color: themeColors.mutedText }]}
          >
            Archived
          </Text>
        </View>
      </View>
      <View style={styles.separatorContainer}>
        <View
          style={[
            styles.separator,
            {
              backgroundColor: themeColors.mutedText,
              opacity: 0.3,
            },
          ]}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -12,
    marginBottom: -8,
  },
  iconContainer: {
    marginRight: 12,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  archivedText: {
    ...typography.p4,
    fontWeight: '700',
  },
  separatorContainer: {
    paddingLeft: 84, // 16 (content paddingHorizontal) + 56 (icon width) + 12 (marginRight)
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
