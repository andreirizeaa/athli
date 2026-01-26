import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ClipboardCheck, ChevronRight, Calendar } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { PlatformIcon } from '@/components/ui/platform-icon';

export default function ClientCheckInsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get check-ins from store (already loaded by parent screen)
  const checkIns = useClientDetailStore((state) => state.checkIns);
  const isLoadingForms = useClientDetailStore((state) => state.isLoadingForms);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignCheckIn = () => {
    router.push(`/modals/shared/assign-to-clients-modal?type=checkIn&clientId=${id}` as any);
  };

  const handleCheckInPress = (checkIn: typeof checkIns[0]) => {
    router.push({
      pathname: '/client/[id]/check-in-detail',
      params: {
        id,
        checkInId: checkIn.id,
        checkInName: checkIn.name,
      },
    } as any);
  };

  return (
    <ScreenWrapper useImageBackground={false}>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.checkIns')}
        </Text>
        <IconButton
          icon={{ sf: 'plus', IconComponent: Plus }}
          onPress={handleAssignCheckIn}
          size="md"
          color={iconColor}
        />
      </View>

      {/* Loading state */}
      {isLoadingForms && checkIns.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : checkIns.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <PlatformIcon
            sf="checkmark.circle"
            IconComponent={ClipboardCheck}
            size={48}
            color={themeColors.mutedText}
          />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            {t('clientDetail.checkIns.emptyTitle')}
          </Text>
          <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
            {t('clientDetail.checkIns.emptyDescription')}
          </Text>
        </View>
      ) : (
        /* Check-ins list */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {checkIns.map((checkIn, index) => {
            const isLastItem = index === checkIns.length - 1;
            return (
              <View key={checkIn.id}>
                <PressableScale
                  style={styles.rowWrapper}
                  onPress={() => handleCheckInPress(checkIn)}
                >
                  <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
                    <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                      <PlatformIcon
                        sf="calendar.badge.clock"
                        IconComponent={Calendar}
                        size={24}
                        color={themeColors.text}
                      />
                    </SquircleView>
                    <View style={styles.textContent}>
                      <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                        {checkIn.name}
                      </Text>
                      <View style={styles.metaRow}>
                        {checkIn.schedule && (
                          <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                            {checkIn.schedule}
                          </Text>
                        )}
                      </View>
                    </View>
                    <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                  </View>
                </PressableScale>

                {!isLastItem && (
                  <View style={styles.separatorContainer}>
                    <View
                      style={[
                        styles.separator,
                        { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                      ]}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.p2,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
