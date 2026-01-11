import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Archive } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { PressableOpacity } from 'pressto';

type ArchivedItemProps = {
  onPress: () => void;
};

export const ArchivedItem = ({ onPress }: ArchivedItemProps) => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  return (
    <PressableOpacity onPress={onPress} style={styles.rowWrapper}>
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
          <Text style={[styles.archivedText, { color: themeColors.mutedText }]}>
            {t('chats.archived.title')}
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
    </PressableOpacity>
  );
};

const styles = StyleSheet.create({
  rowWrapper: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 2,
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
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  archivedText: {
    ...typography.p3,
    fontWeight: '600',
  },
  separatorContainer: {
    paddingLeft: 84, // 16 (content paddingHorizontal) + 56 (icon width) + 12 (marginRight)
    paddingRight: 16,
  },
  separator: {
    height: 0.5,
  },
});
