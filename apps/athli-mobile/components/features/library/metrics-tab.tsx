import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Activity } from 'lucide-react-native';
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
const MOCK_METRICS = [
  { id: '1', name: 'Body Weight', unit: 'kg', description: 'Weekly check-in' },
  { id: '2', name: 'Sleep Score', unit: '%', description: 'Daily recovery tracking' },
  { id: '3', name: 'Daily Steps', unit: 'steps', description: 'General activity' },
  { id: '4', name: 'Resting Heart Rate', unit: 'bpm', description: 'Cardiovascular health' },
  { id: '5', name: 'Water Intake', unit: 'ml', description: 'Hydration tracking' },
];

export const MetricsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();

  const filteredMetrics = useMemo(() => {
    if (!searchQuery) return MOCK_METRICS;
    const query = searchQuery.toLowerCase();
    return MOCK_METRICS.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.unit.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleMetricPress = (item: typeof MOCK_METRICS[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/modals/library/add-metric-modal',
      params: {
        editingId: item.id,
        name: item.name,
        unit: item.unit,
        description: item.description,
      },
    });
  };

  const { setClientsSelectCallback } = useModalCallbacks();

  const handleAssign = (item: typeof MOCK_METRICS[0]) => {
    setClientsSelectCallback((selectedClients) => {
      console.log(`Assigned ${item.name} to clients:`, selectedClients.map(c => c.fullName));
    });
    router.push({
      pathname: '/modals/shared/client-list-modal',
      params: {
        title: t('general.assign'),
        buttonText: t('general.assign'),
      }
    });
  };

  const deleteMetric = (id: string) => {
    console.log('Delete metric:', id);
    // In a real app, this would dispatch a delete action
  };

  const handleDelete = useCallback((item: typeof MOCK_METRICS[0]) => {
    Alert.alert(
      `${t('general.delete')} ${item.name}?`,
      t('library.deleteConfirmMessage'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => deleteMetric(item.id)
        },
      ]
    );
  }, [t]);

  if (filteredMetrics.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
          {t('library.sections.empty').replace('sections', 'metrics')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filteredMetrics.map((item, index) => {
        const isLastItem = index === filteredMetrics.length - 1;

        const dropdownOptions: DropdownMenuOption[] = [
          {
            label: t('general.assign'),
            icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
            onPress: () => handleAssign(item),
          },
          {
            label: `${t('general.delete')} Metric`,
            icon: { sf: 'trash', IconComponent: Trash2 },
            destructive: true,
            onPress: () => deleteMetric(item.id),
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
                  onPress={() => handleMetricPress(item)}
                >
                  <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                    <View style={styles.iconContainer}>
                      <PlatformIcon
                        sf="chart.bar.fill"
                        IconComponent={Activity}
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
                          {item.unit}
                        </Text>
                        {item.description && (
                          <>
                            <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                            <Text style={[styles.metaText, { color: themeColors.mutedText }]} numberOfLines={1}>
                              {item.description}
                            </Text>
                          </>
                        )}
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
    // No, workouts-tab didn't use rounded cards for rows, it used separators.
    // "rows like the ... workouts-tab". Workouts tab has separators. Usually that implies edge-to-edge or consistent padding.
    // Looking at workouts-tab styles: rowContent has paddingHorizontal 16. The container has NO padding. The separation line has paddingLeft 72.
    // The previous sections-tab (my update) used styled container. 
    // If workouts-tab is the reference, let me check workouts-tab styles again.
    // WorkoutsTab styles: container: { flex: 1 }, rowContent: { paddingHorizontal: 16, ... }, separatorContainer: { paddingLeft: 72, paddingRight: 16 }.
    // So the list itself is NOT padded.
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
