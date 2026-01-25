import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';

type CheckInDetailParams = {
  id: string;
  checkInId: string;
  checkInName: string;
};

export default function CheckInDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<CheckInDetailParams>();
  const { colors: themeColors } = useThemePreference();

  const handleBackPress = () => {
    router.back();
  };

  return (
    <ScreenWrapper useImageBackground={false}>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {params.checkInName}
        </Text>
        <View style={{ width: 40 }} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
});
