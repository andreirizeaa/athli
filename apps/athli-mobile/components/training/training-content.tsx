import React from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ellipsis } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { FilledButton } from '@/components/buttons/filled-button';

type TrainingContentProps = {
  date: Date;
  onClose?: () => void;
};

export const TrainingContent = ({ date, onClose }: TrainingContentProps) => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const screenWidth = Dimensions.get('window').width;

  // Mock user avatar - in the future, this will come from user service/context
  const userAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces';

  const handleEllipsisPress = () => {
    // TODO: Implement ellipsis menu
  };

  const handleBeginSession = () => {
    // TODO: Implement begin session
  };

  return (
    <View style={styles.container}>
      {/* First row: Avatar on left, ellipsis on right */}
      <View style={styles.firstRow}>
        {userAvatar ? (
          <ExpoImage source={{ uri: userAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: themeColors.border }]} />
        )}
        <IconButton
          icon={{ sf: 'ellipsis', IconComponent: Ellipsis }}
          onPress={handleEllipsisPress}
          size="md"
          style={styles.ellipsisButton}
        />
      </View>

      {/* Second row: Begin session button */}
      <View style={styles.secondRow}>
        <FilledButton
          label={t('training.beginSession')}
          onPress={handleBeginSession}
          style={styles.beginSessionButton}
          textStyle={styles.beginSessionButtonText}
        />
      </View>

      {/* Divider */}
      <View style={[styles.dividerContainer, { width: screenWidth }]}>
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  firstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  ellipsisButton: {
    borderRadius: 22,
  },
  secondRow: {
    marginBottom: 8,
  },
  beginSessionButton: {
    width: '100%',
    borderRadius: 12,
  },
  beginSessionButtonText: {
    fontWeight: '700',
  },
  dividerContainer: {
    marginTop: 8,
    marginBottom: 16,
    marginLeft: -16,
    marginRight: -16,
  },
  divider: {
    width: '100%',
    height: 1,
  },
});
