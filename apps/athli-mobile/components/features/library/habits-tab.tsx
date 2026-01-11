import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/contexts/useLibraryTab';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { UserPlus, Trash2 } from 'lucide-react-native';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

// Mock data
const MOCK_HABITS = [
  { id: '1', name: 'Drink Water', amount: '2000', unit: 'ml', period: 'daily' },
  { id: '2', name: 'Read Book', amount: '30', unit: 'min', period: 'daily' },
  { id: '3', name: 'Meditate', amount: '15', unit: 'min', period: 'daily' },
  { id: '4', name: 'Weekly Review', amount: '1', unit: 'time', period: 'weekly' },
];

export const HabitsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();

  const filteredHabits = useMemo(() => {
    if (!searchQuery) return MOCK_HABITS;
    const query = searchQuery.toLowerCase();
    return MOCK_HABITS.filter(
      (item) =>
        item.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleHabitPress = (item: typeof MOCK_HABITS[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-habit-modal',
      params: {
        editingId: item.id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        period: item.period,
      },
    });
  };

  const { setClientsSelectCallback } = useModalCallbacks();

  const handleAssign = (item: typeof MOCK_HABITS[0]) => {
    setClientsSelectCallback((selectedClients) => {
      console.log(`Assigned ${item.name} to clients:`, selectedClients.map(c => c.fullName));
      // Here you would normally call a service to assign the habit
    });
    router.push({
      pathname: '/modals/shared/client-list-modal',
      params: {
        title: t('general.assign'),
        buttonText: t('general.assign'),
      }
    });
  };

  const deleteHabit = (id: string) => {
    console.log('Delete habit:', id);
    // In a real app, this would dispatch a delete action
  };

  const handleDelete = useCallback((item: typeof MOCK_HABITS[0]) => {
    Alert.alert(
      `${t('general.delete')} ${item.name}?`,
      t('library.deleteConfirmMessage'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => deleteHabit(item.id)
        },
      ]
    );
  }, [t]);

  if (filteredHabits.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
          {t('library.sections.empty').replace('sections', 'habits')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filteredHabits.map((item, index) => {
        const isLastItem = index === filteredHabits.length - 1;

        const dropdownOptions: DropdownMenuOption[] = [
          {
            label: t('general.assign'),
            icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
            onPress: () => handleAssign(item),
          },
          {
            label: `${t('general.delete')} Habit`,
            icon: { sf: 'trash', IconComponent: Trash2 },
            destructive: true,
            onPress: () => deleteHabit(item.id),
          }
        ];

        return (
          <View key={item.id}>
            <SwipeableRow
              onDelete={() => handleDelete(item)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${item.name}?`}
            >
              <ContextMenuWrapper options={dropdownOptions}>
                <PressableOpacity
                  style={styles.rowWrapper}
                  onPress={() => handleHabitPress(item)}
                >
                  <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                    <View style={styles.iconContainer}>
                      <PlatformIcon
                        sf="checkmark.circle.fill"
                        IconComponent={CheckCircle}
                        size={24}
                        color={themeColors.text}
                      />
                    </View>
                    <View style={styles.textContent}>
                      <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                          {item.amount} {item.unit}
                        </Text>
                        <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                          {item.period === 'daily' ? t('library.addHabit.daily') : t('library.addHabit.weekly')}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                  </View>
                </PressableOpacity>
              </ContextMenuWrapper>
            </SwipeableRow>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
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
    paddingLeft: 72,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...typography.p2,
    textAlign: 'center',
  },
});
