import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, ClipboardCheck, CheckCircle, ChevronRight } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';

export default function ClientHabitsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get habits from store (already loaded by parent screen)
  const habits = useClientDetailStore((state) => state.habits);
  const isLoadingHabits = useClientDetailStore((state) => state.isLoadingHabits);

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignHabit = () => {
    router.push(`/modals/client/assign-habit-to-client-modal?clientId=${id}` as any);
  };

  const handleAddHabit = () => {
    router.push(`/modals/library/add-habit-modal?clientId=${id}` as any);
  };

  const handleLogHabit = () => {
    router.push(`/modals/client/log-habit-for-client-modal?clientId=${id}` as any);
  };

  const handleHabitPress = (habitId: string) => {
    router.push(`/client/${id}/habit-detail?habitId=${habitId}` as any);
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
          {t('clientDetail.sections.habits')}
        </Text>
        <DropdownMenuWrapper
          options={[
            {
              label: t('clientDetail.actions.assignHabit'),
              icon: { sf: 'checklist', IconComponent: ClipboardCheck },
              onPress: handleAssignHabit,
            },
            {
              label: t('clientDetail.actions.addHabit'),
              icon: { sf: 'plus', IconComponent: Plus },
              onPress: handleAddHabit,
            },
            {
              label: t('clientDetail.actions.logHabit'),
              icon: { sf: 'checkmark.circle', IconComponent: CheckCircle },
              onPress: handleLogHabit,
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
      {isLoadingHabits && habits.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : habits.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <PlatformIcon sf="checkmark.circle.fill" IconComponent={CheckCircle} size={48} color={themeColors.mutedText} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            {t('clientDetail.habits.emptyTitle')}
          </Text>
          <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
            {t('clientDetail.habits.emptyDescription')}
          </Text>
        </View>
      ) : (
        /* Habits list */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {habits.map((habit, index) => {
            const isLastItem = index === habits.length - 1;
            return (
              <View key={habit.id || habit.assignment_id}>
                <PressableScale onPress={() => handleHabitPress(habit.assignment_id || habit.id)}>
                  <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>
                    <View style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                      <PlatformIcon
                        sf="checkmark.circle.fill"
                        IconComponent={CheckCircle}
                        size={24}
                        color={themeColors.text}
                      />
                    </View>
                    <View style={styles.textContent}>
                      <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                        {habit.name}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                          {habit.amount} {habit.unit}
                        </Text>
                        <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                          {habit.period === 'daily' ? t('general.daily') : t('general.weekly')}
                        </Text>
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
                {isLastItem && <View style={{ height: 24 }} />}
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
  metaDot: {
    marginHorizontal: 6,
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
