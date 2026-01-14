import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ChevronRight } from 'lucide-react-native';

import { FlashList } from '@shopify/flash-list';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';

// Mock injuries data
const MOCK_INJURIES = [
  { id: '1', title: 'Left Achilles Tendonitis (Mild)', date: '2025-11-10' },
  { id: '2', title: 'Old lower back strain (Recovered, needs warm-up)', date: '2024-05-20' },
];

type Injury = {
  id: string;
  title: string;
  date: string | null;
};

export default function ClientInjuriesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  const iconColor = themeColors.text;

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handleAddInjury = () => {
    haptics.medium();
    router.push({
      pathname: '/modals/client/add-client-injury-modal',
      params: { id },
    });
  };

  const handleInjuryPress = (injuryId: string) => {
    haptics.medium();
    router.push({
      pathname: '/modals/client/edit-client-injury-modal',
      params: { id, injuryId },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderInjury = ({ item, index }: { item: Injury; index: number }) => (
    <View>
      {index > 0 && <Separator style={styles.separator} />}
      <PressableScale onPress={() => handleInjuryPress(item.id)}>
        <View style={styles.injuryItem}>
          <View style={styles.injuryContent}>
            <Text style={[styles.injuryTitle, { color: themeColors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            {item.date && (
              <Text style={[styles.injuryDate, { color: themeColors.mutedText }]}>
                {formatDate(item.date)}
              </Text>
            )}
          </View>
          <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
        </View>
      </PressableScale>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('clientDetail.overview.injuries')}
          </Text>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={handleAddInjury}
            size="md"
            color={iconColor}
          />
        </View>

        {/* Injuries List */}
        <FlashList
          data={MOCK_INJURIES}
          renderItem={renderInjury}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState message={t('clientDetail.overview.noInjuries')} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenWrapper>
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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  injuryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  injuryContent: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  injuryTitle: {
    ...typography.p2,
    fontWeight: '500',
  },
  injuryDate: {
    ...typography.p4,
  },
  separator: {
    marginHorizontal: 16,
  },
});
