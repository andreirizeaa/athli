import React from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { useThemePreference } from '@/contexts/useColorScheme';
import { typography, iconSizes } from '@/constants/typography';
import { PlatformIcon } from '@/components/platform-icon';
import { FilledButton } from '@/components/buttons/filled-button';

export default function EditClientDetailsModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    handleClose();
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20,
            backgroundColor: themeColors.background,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: themeColors.surfaceSecondary }]}
          activeOpacity={0.7}
          onPress={handleClose}
        >
          <PlatformIcon
            sf="xmark"
            IconComponent={X}
            size={iconSizes.navigationChevrons}
            color={themeColors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeColors.text }]}>Edit details</Text>
        <View style={styles.closeButton} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Content will go here */}
      </View>

      {/* Save Button */}
      <View style={styles.buttonContainer}>
        <FilledButton label="Save" onPress={handleSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    alignItems: 'center',
  },
});
