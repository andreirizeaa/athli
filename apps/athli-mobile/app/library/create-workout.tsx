import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';

export default function CreateWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSave = () => {
    // TODO: Implement save workout functionality
    router.back();
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.pageBackground }]}>
      <View
        style={[
          styles.safeArea,
          {
            paddingTop: insets.top,
            paddingBottom: 0,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
          <IconButton
            icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.title, { color: themeColors.text }]}>
            {params.name || t('library.createPages.workout')}
          </Text>
          <IconButton
            icon={{ sf: 'checkmark', IconComponent: Check }}
            onPress={handleSave}
            size="md"
            color={themeColors.primary}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* TODO: Add workout creation form */}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});

