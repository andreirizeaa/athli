import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ChevronRight, Heart } from 'lucide-react-native';

import { FlashList } from '@shopify/flash-list';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { EmptyState } from '@/components/ui/empty-state';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/ui/platform-icon';
import type { AthleteInjury } from '@/services/client/client-service';

export default function ClientInjuriesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();

  // Get injuries from store (already loaded by parent screen)
  const injuries = useClientDetailStore((state) => state.injuries);
  const isLoading = useClientDetailStore((state) => state.isLoading);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

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

  const getSeverityColor = (severity: string | undefined) => {
    switch (severity?.toLowerCase()) {
      case 'severe':
        return themeColors.error;
      case 'moderate':
        return themeColors.warning || '#F5A623';
      case 'mild':
      default:
        return themeColors.success;
    }
  };

  const renderInjury = ({ item, index }: { item: AthleteInjury; index: number }) => (
    <View>
      {index > 0 && <Separator style={styles.separator} />}
      <PressableScale onPress={() => handleInjuryPress(item.id)}>
        <View style={styles.injuryItem}>
          <View style={[styles.injuryIconContainer, { backgroundColor: `${getSeverityColor(item.severity)}15` }]}>
            <PlatformIcon
              sf="heart"
              IconComponent={Heart}
              size={20}
              color={getSeverityColor(item.severity)}
            />
          </View>
          <View style={styles.injuryContent}>
            <Text style={[styles.injuryTitle, { color: themeColors.text }]} numberOfLines={2}>
              {item.injury}
            </Text>
            <View style={styles.injuryMeta}>
              {item.severity && (
                <Text style={[styles.injurySeverity, { color: getSeverityColor(item.severity) }]}>
                  {item.severity}
                </Text>
              )}
              {item.date_of_injury && (
                <Text style={[styles.injuryDate, { color: themeColors.mutedText }]}>
                  {formatDate(item.date_of_injury)}
                </Text>
              )}
            </View>
          </View>
          <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
        </View>
      </PressableScale>
    </View>
  );

  // Loading state
  if (isLoading && injuries.length === 0) {
    return (
      <ScreenWrapper>
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
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

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
          data={injuries}
          renderItem={renderInjury}
          keyExtractor={(item) => item.id}
          estimatedItemSize={80}
          ListEmptyComponent={<EmptyState message={t('clientDetail.overview.noInjuries')} />}
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
  headerPlaceholder: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 40,
  },
  injuryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  injuryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  injuryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  injurySeverity: {
    ...typography.p4,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  injuryDate: {
    ...typography.p4,
  },
  separator: {
    marginHorizontal: 16,
  },
});
