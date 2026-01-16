import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ClipboardCheck, ChevronRight } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';

export default function ClientCheckInsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get check-ins from store (already loaded by parent screen)
  const checkIns = useClientDetailStore((state) => state.checkIns);
  const isLoadingForms = useClientDetailStore((state) => state.isLoadingForms);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignCheckIn = () => {
    router.push(`/modals/shared/assign-to-clients-modal?type=checkIn&clientId=${id}`);
  };

  const handleAddCheckIn = () => {
    router.push(`/modals/library/add-check-in-modal?clientId=${id}`);
  };

  const handleCheckInPress = (checkInId: string) => {
    router.push(`/modals/client/check-in-detail-modal?clientId=${id}&checkInId=${checkInId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return themeColors.success;
      case 'pending':
        return themeColors.warning || '#F5A623';
      case 'overdue':
        return themeColors.error;
      default:
        return themeColors.mutedText;
    }
  };

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
          {t('clientDetail.sections.checkIns')}
        </Text>
        <DropdownMenuWrapper
          options={[
            {
              label: t('clientDetail.actions.assignCheckIn'),
              icon: { sf: 'checklist', IconComponent: ClipboardCheck },
              onPress: handleAssignCheckIn,
            },
            {
              label: t('clientDetail.actions.addCheckIn'),
              icon: { sf: 'plus', IconComponent: Plus },
              onPress: handleAddCheckIn,
            },
          ]}
        >
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={() => {}}
            size="md"
            color={iconColor}
          />
        </DropdownMenuWrapper>
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
        >
          {checkIns.map((checkIn) => (
            <View key={checkIn.id || checkIn.assignment_id}>
              <PressableScale onPress={() => handleCheckInPress(checkIn.id || checkIn.assignment_id)}>
                <View style={styles.checkInItem}>
                  <View
                    style={[styles.checkInIconContainer, { backgroundColor: `${themeColors.primary}15` }]}
                  >
                    <PlatformIcon
                      sf="checkmark.circle"
                      IconComponent={ClipboardCheck}
                      size={24}
                      color={themeColors.primary}
                    />
                  </View>
                  <View style={styles.checkInInfo}>
                    <Text style={[styles.checkInName, { color: themeColors.text }]} numberOfLines={1}>
                      {checkIn.name || checkIn.title}
                    </Text>
                    <View style={styles.checkInMeta}>
                      {checkIn.status && (
                        <Text
                          style={[
                            styles.checkInStatus,
                            { color: getStatusColor(checkIn.status) },
                          ]}
                        >
                          {checkIn.status}
                        </Text>
                      )}
                      {checkIn.due_date && (
                        <Text style={[styles.checkInDate, { color: themeColors.mutedText }]}>
                          {formatDate(checkIn.due_date)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                </View>
              </PressableScale>
              <Separator />
            </View>
          ))}
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
  checkInItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  checkInIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInInfo: {
    flex: 1,
    gap: 4,
  },
  checkInName: {
    ...typography.p1,
    fontWeight: '500',
  },
  checkInMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkInStatus: {
    ...typography.p3,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  checkInDate: {
    ...typography.p3,
  },
});
