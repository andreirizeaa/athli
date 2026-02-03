import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { PressableOpacity } from 'pressto';
import { ChevronDown, ChevronLeft, Layers } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore, useColorScheme } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { SettingsOption } from '@/components/ui/settings-option';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ValueLineChart } from '@/components/ui/value-line-chart';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { getExerciseHistory, type HistoryEntry } from '@/services/client/client-training-service';

type AggregationMode = 'avg' | 'min' | 'max';
type MetricField = 'field1' | 'field2';


// Label formatting map
const LABEL_MAP: Record<string, string> = {
  'Optional': '(Optional)',
  'Reps': 'Reps',
  'kg': 'Kg',
  'lbs': 'Lbs',
  'km': 'Km',
  'm': 'Metres',
  'yards': 'Yards',
  'miles': 'Miles',
  'feet': 'Feet',
  'minutes': 'Minutes',
  'seconds': 'Seconds',
  'sec': 'Seconds',
  'None': 'None',
  'Tempo': 'Tempo',
  'RIR': 'RIR',
  'RPE': 'RPE',
  'Heart Rate Zone': 'HR Zone',
  'Calories': 'Calories',
  'Watts': 'Watts',
  'Pace': 'Pace',
  'Speed': 'Speed',
  'Incline': 'Incline',
  'Height': 'Height',
  'RPM': 'RPM',
};

const formatLabel = (value: string): string => {
  return LABEL_MAP[value] || value;
};

const formatCombinationLabel = (combo: string): string => {
  return combo.split(' + ').map(formatLabel).join(' & ');
};

// Helper to extract value from potentially nested object
const extractValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null) {
    return Number(val.completed ?? val.prescribed ?? 0);
  }
  return Number(val ?? 0);
};

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
};

// Format set value for display
const formatSetValue = (set: any): string => {
  const parts: string[] = [];

  if (set.trackableField1) {
    const val = Number(set.trackableField1.completed ?? set.trackableField1.prescribed);
    if (!isNaN(val) && val > 0) {
      parts.push(`${val} ${set.trackableField1.label || ''}`);
    }
  }

  if (set.trackableField2) {
    const val = Number(set.trackableField2.completed ?? set.trackableField2.prescribed);
    if (!isNaN(val) && val > 0) {
      parts.push(`${val} ${set.trackableField2.label || ''}`);
    }
  }

  if (parts.length === 0) {
    const weight = extractValue(set.weight);
    const reps = extractValue(set.reps);
    const distance = extractValue(set.distance);
    const duration = extractValue(set.duration);
    const leftReps = extractValue(set.leftReps);
    const rightReps = extractValue(set.rightReps);

    if (leftReps > 0 || rightReps > 0) {
      const repsStr = `L: ${leftReps} | R: ${rightReps}`;
      if (weight > 0) return `${weight}kg x ${repsStr}`;
      return repsStr;
    }

    if (weight > 0 && reps > 0) return `${weight}kg x ${reps}`;
    if (reps > 0) return `${reps} reps`;
    if (distance > 0 && duration > 0) return `${distance}m x ${duration}s`;
    if (distance > 0) return `${distance}m`;
    if (duration > 0) return `${duration}s`;
  }

  return parts.join(', ') || '-';
};

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const { id, exerciseId, exerciseName } = useLocalSearchParams<{ id: string; exerciseId: string; exerciseName: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const coachId = useClientDetailStore((state) => state.coachId);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCombination, setSelectedCombination] = useState<string>('');
  const [aggregationMode, setAggregationMode] = useState<AggregationMode>('avg');
  const [selectedMetric, setSelectedMetric] = useState<MetricField>('field1');

  // Load exercise history
  useEffect(() => {
    const loadHistory = async () => {
      if (!id || !coachId || !exerciseId) return;
      setIsLoading(true);
      try {
        const data = await getExerciseHistory({
          clientId: id,
          coachId,
          exerciseId,
          exerciseName,
        });
        setHistory(data);
      } catch (error) {
        console.error('Failed to load exercise history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, [id, coachId, exerciseId, exerciseName]);

  // Extract unique label combinations from history
  const labelCombinations = useMemo(() => {
    const combos = new Map<string, { field1: string; field2: string }>();

    history.forEach((entry) => {
      const sets = entry.exercise_data?.sets || [];
      sets.forEach((set: any) => {
        const label1 = set.trackableField1?.label || '';
        const label2 = set.trackableField2?.label || '';

        const validLabel1 = label1 && label1 !== 'Optional' ? label1 : '';
        const validLabel2 = label2 && label2 !== 'Optional' ? label2 : '';

        const displayCombo = [validLabel1, validLabel2].filter(Boolean).join(' + ') || 'Unknown';

        if (!combos.has(displayCombo)) {
          combos.set(displayCombo, { field1: validLabel1, field2: validLabel2 });
        }
      });
    });

    // If no trackable fields found, check legacy fields
    if (combos.size === 0 || (combos.size === 1 && combos.has('Unknown'))) {
      let hasWeight = false, hasReps = false, hasDistance = false, hasDuration = false;
      history.forEach((entry) => {
        const sets = entry.exercise_data?.sets || [];
        sets.forEach((set: any) => {
          const weight = extractValue(set.weight);
          const reps = extractValue(set.reps);
          const distance = extractValue(set.distance);
          const duration = extractValue(set.duration);
          if (weight > 0) hasWeight = true;
          if (reps > 0) hasReps = true;
          if (distance > 0) hasDistance = true;
          if (duration > 0) hasDuration = true;
        });
      });
      combos.clear();
      if (hasWeight && hasReps) combos.set('kg + Reps', { field1: 'kg', field2: 'Reps' });
      else if (hasDistance && hasDuration) combos.set('m + sec', { field1: 'm', field2: 'sec' });
      else if (hasReps) combos.set('Reps', { field1: 'Reps', field2: '' });
      else if (hasWeight) combos.set('kg', { field1: 'kg', field2: '' });
      else if (hasDistance) combos.set('m', { field1: 'm', field2: '' });
      else if (hasDuration) combos.set('sec', { field1: 'sec', field2: '' });
    }

    return combos;
  }, [history]);

  const combinationNames = useMemo(() => Array.from(labelCombinations.keys()), [labelCombinations]);

  // Set default combination when combinations change
  useEffect(() => {
    if (combinationNames.length > 0 && !combinationNames.includes(selectedCombination)) {
      setSelectedCombination(combinationNames[0]);
    }
  }, [combinationNames, selectedCombination]);

  // Build dropdown options
  const dropdownOptions: DropdownMenuOption[] = useMemo(() => {
    return combinationNames.map((combo) => ({
      label: formatCombinationLabel(combo),
      onPress: () => setSelectedCombination(combo),
    }));
  }, [combinationNames]);

  // Get current selection label
  const selectedLabel = useMemo(() => {
    return formatCombinationLabel(selectedCombination);
  }, [selectedCombination]);

  // Get selected fields
  const selectedFields = useMemo(() => {
    return labelCombinations.get(selectedCombination) || { field1: '', field2: '' };
  }, [labelCombinations, selectedCombination]);

  // Check if we have dual fields
  const isDualField = selectedFields.field1 && selectedFields.field2;

  // Reset to field1 if not dual field
  useEffect(() => {
    if (!isDualField) {
      setSelectedMetric('field1');
    }
  }, [isDualField]);

  // Check if set matches the selected combination
  const setMatchesCombination = (set: any): boolean => {
    const label1 = set.trackableField1?.label || '';
    const label2 = set.trackableField2?.label || '';
    const validLabel1 = label1 && label1 !== 'Optional' ? label1 : '';
    const validLabel2 = label2 && label2 !== 'Optional' ? label2 : '';
    const displayCombo = [validLabel1, validLabel2].filter(Boolean).join(' + ') || 'Unknown';

    if (displayCombo === selectedCombination) return true;

    if (!set.trackableField1 && !set.trackableField2) {
      const weight = extractValue(set.weight);
      const reps = extractValue(set.reps);
      const distance = extractValue(set.distance);
      const duration = extractValue(set.duration);

      if (selectedCombination === 'kg + Reps' && weight > 0 && reps > 0) return true;
      if (selectedCombination === 'm + sec' && distance > 0 && duration > 0) return true;
      if (selectedCombination === 'Reps' && reps > 0 && weight <= 0) return true;
      if (selectedCombination === 'kg' && weight > 0 && reps <= 0) return true;
      if (selectedCombination === 'm' && distance > 0 && duration <= 0) return true;
      if (selectedCombination === 'sec' && duration > 0 && distance <= 0) return true;
    }

    return false;
  };

  // Compute chart data
  const chartData = useMemo(() => {
    const dateGroups: Map<string, { sum: number; count: number; min: number; max: number; timestamp: number }> = new Map();

    const addToDateGroup = (dateStr: string, value: number) => {
      const timestamp = new Date(dateStr).getTime();
      const existing = dateGroups.get(dateStr);
      if (existing) {
        existing.sum += value;
        existing.count++;
        existing.min = Math.min(existing.min, value);
        existing.max = Math.max(existing.max, value);
      } else {
        dateGroups.set(dateStr, { sum: value, count: 1, min: value, max: value, timestamp });
      }
    };

    history.forEach((entry) => {
      const sets = entry.exercise_data?.sets || [];
      sets.forEach((set: any) => {
        if (!setMatchesCombination(set)) return;

        // Handle legacy fields
        if (!set.trackableField1 && !set.trackableField2) {
          const weight = extractValue(set.weight);
          const reps = extractValue(set.reps);
          const distance = extractValue(set.distance);
          const duration = extractValue(set.duration);

          if (selectedCombination === 'kg + Reps') {
            const value = selectedMetric === 'field1' ? weight : reps;
            if (value > 0) addToDateGroup(entry.date, value);
            return;
          } else if (selectedCombination === 'm + sec') {
            const value = selectedMetric === 'field1' ? distance : duration;
            if (value > 0) addToDateGroup(entry.date, value);
            return;
          } else if (selectedCombination === 'Reps' && reps > 0) {
            addToDateGroup(entry.date, reps);
            return;
          } else if (selectedCombination === 'kg' && weight > 0) {
            addToDateGroup(entry.date, weight);
            return;
          } else if (selectedCombination === 'm' && distance > 0) {
            addToDateGroup(entry.date, distance);
            return;
          } else if (selectedCombination === 'sec' && duration > 0) {
            addToDateGroup(entry.date, duration);
            return;
          }
        }

        // Handle trackable fields
        const field1Val = Number(set.trackableField1?.completed ?? set.trackableField1?.prescribed);
        const field2Val = Number(set.trackableField2?.completed ?? set.trackableField2?.prescribed);

        let value: number;
        if (isDualField) {
          value = selectedMetric === 'field1' ? field1Val : field2Val;
        } else {
          value = !isNaN(field1Val) && field1Val > 0 ? field1Val : field2Val;
        }

        if (!isNaN(value) && value > 0) {
          addToDateGroup(entry.date, value);
        }
      });
    });

    const dataPoints = Array.from(dateGroups.entries()).map(([dateStr, group]) => {
      let value: number;
      switch (aggregationMode) {
        case 'min':
          value = group.min;
          break;
        case 'max':
          value = group.max;
          break;
        case 'avg':
        default:
          value = Math.round((group.sum / group.count) * 10) / 10;
          break;
      }
      return {
        date: dateStr,
        value,
        timestamp: group.timestamp,
      };
    });

    return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
  }, [history, selectedCombination, selectedMetric, isDualField, aggregationMode]);

  // Group history by workout session
  const groupedHistory = useMemo(() => {
    const groups: Map<string, any> = new Map();

    history.forEach((entry) => {
      const matchingSets = (entry.exercise_data?.sets || []).filter(setMatchesCombination);
      if (matchingSets.length === 0) return;

      const key = `${entry.date}-${entry.workout_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          date: entry.date,
          workoutName: entry.workout_name,
          workoutId: entry.workout_id,
          sets: [],
        });
      }
      groups.get(key)!.sets.push(...matchingSets);
    });

    const result = Array.from(groups.values());
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [history, selectedCombination]);

  const handleBackPress = () => {
    router.back();
  };

  const iconSize = iconSizes.tabBarIcons;
  const iconColor = themeColors.text;

  // Get chart y-axis label
  const chartLabel = useMemo(() => {
    if (isDualField) {
      const value = selectedMetric === 'field1' ? selectedFields.field1 : selectedFields.field2;
      return formatLabel(value);
    }
    return formatLabel(selectedFields.field1) || 'Progress';
  }, [isDualField, selectedMetric, selectedFields]);

  // Aggregation mode labels
  const aggregationLabels: Record<AggregationMode, string> = {
    avg: 'Avg',
    min: 'Min',
    max: 'Max',
  };

  // Aggregation dropdown options
  const aggregationOptions: DropdownMenuOption[] = useMemo(() => [
    { label: 'Avg', onPress: () => setAggregationMode('avg') },
    { label: 'Min', onPress: () => setAggregationMode('min') },
    { label: 'Max', onPress: () => setAggregationMode('max') },
  ], []);

  // Render aggregation dropdown for chart header
  const renderAggregationDropdown = useCallback(() => (
    <DropdownMenuWrapper options={aggregationOptions}>
      <PressableOpacity style={styles.aggregationButton}>
        <Text style={[styles.aggregationText, { color: themeColors.text }]}>
          {aggregationLabels[aggregationMode]}
        </Text>
        {Platform.OS === 'ios' ? (
          <SymbolView name="chevron.down" tintColor={themeColors.mutedText} size={12} type="monochrome" />
        ) : (
          <ChevronDown size={12} color={themeColors.mutedText} />
        )}
      </PressableOpacity>
    </DropdownMenuWrapper>
  ), [aggregationMode, aggregationOptions, themeColors]);

  // Metric segments for dual fields
  const metricSegments = useMemo(() => {
    if (!isDualField) return [];
    return [
      { label: formatLabel(selectedFields.field1), value: 'field1' as MetricField },
      { label: formatLabel(selectedFields.field2), value: 'field2' as MetricField },
    ];
  }, [isDualField, selectedFields]);

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
              {t('progress.noExerciseHistory')}
            </Text>
          </View>
        ) : (
          <>
            {/* Variation selector */}
            {dropdownOptions.length > 1 && (
              <View style={styles.selectContainer}>
                <Card style={styles.variationCard}>
                  <DropdownMenuWrapper options={dropdownOptions}>
                    <SettingsOption
                      icon={
                        Platform.OS === 'ios' ? (
                          <SymbolView name="square.3.layers.3d" tintColor={iconColor} size={iconSize} type="monochrome" />
                        ) : (
                          <Layers size={iconSize} color={iconColor} />
                        )
                      }
                      title={t('progress.variation')}
                      subtitle={selectedLabel}
                      subtitleRight
                      showChevron
                      chevronSize={14}
                      chevronIcon={{ sf: 'chevron.down', IconComponent: ChevronDown }}
                      onPress={() => {}}
                    />
                  </DropdownMenuWrapper>
                </Card>
              </View>
            )}

            {/* Chart */}
            <ValueLineChart
              data={chartData.map((d) => ({ value: d.value, date: d.date }))}
              name={chartLabel}
              renderHeaderRight={renderAggregationDropdown}
              renderFooter={isDualField ? () => (
                <View style={styles.chartFooter}>
                  <SegmentedControl
                    segments={metricSegments}
                    value={selectedMetric}
                    onChange={setSelectedMetric}
                    backgroundColor={isDarkMode ? themeColors.surfaceSecondary : themeColors.surfacePrimary}
                    noPadding
                  />
                </View>
              ) : undefined}
            />

            {/* History section header */}
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: themeColors.text }]}>
                History
              </Text>
              <Text style={[styles.historyCount, { color: themeColors.mutedText }]}>
                {groupedHistory.length} {groupedHistory.length === 1 ? 'session' : 'sessions'}
              </Text>
            </View>

            {/* History cards */}
            {groupedHistory.map((group) => (
              <Card key={`${group.date}-${group.workoutId}`} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <Text style={[styles.historyDate, { color: themeColors.text }]}>
                    {formatDate(group.date)}
                  </Text>
                  <Text
                    style={[styles.historyWorkoutName, { color: themeColors.mutedText }]}
                    numberOfLines={1}
                  >
                    {group.workoutName}
                  </Text>
                </View>
                <Separator style={styles.historySeparator} />
                <View style={styles.setsContainer}>
                  {group.sets.map((set: any, index: number) => (
                    <View key={index} style={styles.setRow}>
                      <Text style={[styles.setNumber, { color: themeColors.mutedText }]}>
                        {index + 1}.
                      </Text>
                      <Text style={[styles.setValue, { color: themeColors.text }]}>
                        {formatSetValue(set)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {exerciseName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 1001,
  },
  headerTitle: {
    ...typography.h5,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  selectContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  variationCard: {
    marginBottom: 0,
    paddingVertical: 4,
  },
  aggregationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  aggregationText: {
    ...typography.p2,
    fontWeight: '600',
  },
  chartFooter: {
    marginTop: 16,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    ...typography.p1,
    textAlign: 'center',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  historyTitle: {
    ...typography.h5,
  },
  historyCount: {
    ...typography.p3,
  },
  historyCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  historyDate: {
    ...typography.p2,
    fontWeight: '600',
  },
  historyWorkoutName: {
    ...typography.p3,
    maxWidth: '50%',
  },
  historySeparator: {
    marginHorizontal: -16,
    marginBottom: 8,
  },
  setsContainer: {
    gap: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumber: {
    ...typography.p3,
    width: 20,
  },
  setValue: {
    ...typography.p2,
    fontVariant: ['tabular-nums'],
  },
});
