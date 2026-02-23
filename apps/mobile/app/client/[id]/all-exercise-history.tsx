import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale, PressableOpacity } from 'pressto';
import { Image } from 'expo-image';
import { ChevronLeft, ChevronDown, Dumbbell, TrendingUp, TrendingDown } from 'lucide-react-native';
import { hexToRgba } from '@/utils/colorUtils';
import { SymbolView } from 'expo-symbols';

import { useThemePreference, useColorScheme } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { SearchBar } from '@/components/ui/search-bar';
import { Card } from '@/components/ui/card';
import { ValueLineChart } from '@/components/ui/value-line-chart';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { getExerciseHistory, type UniqueExercise, type HistoryEntry } from '@/services/client/client-training-service';
import { useExerciseThumbnails } from '@/hooks/useExerciseThumbnails';

// Module-level cache for exercise histories to persist across navigation
const exerciseHistoryCache = new Map<string, Map<string, HistoryEntry[]>>();

type AggregationMode = 'avg' | 'min' | 'max';
type MetricField = 'field1' | 'field2';

// Label formatting map (same as exercise-detail)
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

/**
 * Parse a value that may be a range like "8-10" or "7-10-12" and return the average (rounded up),
 * or a Heart Rate Zone like "Zone 1" and return the zone number unchanged.
 * Handles any number of hyphen-separated values (e.g., "7-10", "7-10-12", etc.)
 */
const parseNumericValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (val == null) return 0;
  const str = String(val).trim();
  // Check for Heart Rate Zone format like "Zone 1", "Zone 2", etc.
  // Return the zone number unchanged (no rounding needed for zones)
  const zoneMatch = str.match(/^Zone\s*(\d+)$/i);
  if (zoneMatch) {
    return parseInt(zoneMatch[1], 10);
  }
  // Check for range format like "8-10" or "7-10-12"
  // Calculate average of all parts and round up
  if (str.includes('-')) {
    const parts = str.split('-').map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
    if (parts.length >= 2) {
      const avg = parts.reduce((sum, n) => sum + n, 0) / parts.length;
      return Math.ceil(avg);
    }
  }
  return Number(str) || 0;
};

// Helper to extract value from potentially nested object
const extractValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null) {
    return parseNumericValue(val.completed ?? val.prescribed ?? 0);
  }
  return parseNumericValue(val ?? 0);
};

// Get field info for an exercise's history (supports dual fields)
const getFieldsInfo = (history: HistoryEntry[]): { field1: string; field2: string; isDual: boolean } => {
  let field1Label = '';
  let field2Label = '';

  // Check for trackable fields first
  for (const entry of history) {
    const sets = entry.exercise_data?.sets || [];
    for (const set of sets as any[]) {
      const label1 = set.trackableField1?.label;
      const label2 = set.trackableField2?.label;

      if (label1 && label1 !== 'Optional' && !field1Label) {
        field1Label = label1;
      }
      if (label2 && label2 !== 'Optional' && !field2Label) {
        field2Label = label2;
      }
    }
    if (field1Label && field2Label) break;
  }

  // Fallback to legacy fields
  if (!field1Label && !field2Label) {
    let hasWeight = false, hasReps = false;
    for (const entry of history) {
      const sets = entry.exercise_data?.sets || [];
      for (const set of sets) {
        if (extractValue(set.weight) > 0) hasWeight = true;
        if (extractValue(set.reps) > 0) hasReps = true;
      }
    }
    if (hasWeight && hasReps) {
      field1Label = 'kg';
      field2Label = 'Reps';
    } else if (hasWeight) {
      field1Label = 'kg';
    } else if (hasReps) {
      field1Label = 'Reps';
    }
  }

  return {
    field1: field1Label,
    field2: field2Label,
    isDual: !!(field1Label && field2Label),
  };
};

// Exercise History Card Component
const ExerciseHistoryCard = ({
  exercise,
  history,
  thumbnailUrl,
  onPress,
  onThumbnailPress,
  themeColors,
  isDarkMode,
  t,
}: {
  exercise: UniqueExercise;
  history: HistoryEntry[];
  thumbnailUrl: string | undefined;
  onPress: () => void;
  onThumbnailPress: () => void;
  themeColors: any;
  isDarkMode: boolean;
  t: (key: string) => string;
}) => {
  const [aggregationMode, setAggregationMode] = useState<AggregationMode>('avg');
  const [selectedMetric, setSelectedMetric] = useState<MetricField>('field1');

  const fieldsInfo = useMemo(() => getFieldsInfo(history), [history]);

  // Reset to field1 if not dual field
  useEffect(() => {
    if (!fieldsInfo.isDual) {
      setSelectedMetric('field1');
    }
  }, [fieldsInfo.isDual]);

  // Compute chart data with aggregation
  const chartData = useMemo(() => {
    const dateGroups: Map<string, { sum: number; count: number; min: number; max: number }> = new Map();

    history.forEach((entry) => {
      const sets = entry.exercise_data?.sets || [];
      sets.forEach((set: any) => {
        let value = 0;

        // Handle trackable fields
        if (set.trackableField1 || set.trackableField2) {
          const field1Val = extractValue(set.trackableField1?.completed ?? set.trackableField1?.prescribed);
          const field2Val = extractValue(set.trackableField2?.completed ?? set.trackableField2?.prescribed);

          if (fieldsInfo.isDual) {
            value = selectedMetric === 'field1' ? field1Val : field2Val;
          } else {
            value = field1Val > 0 ? field1Val : field2Val;
          }
        } else {
          // Legacy fields
          const weight = extractValue(set.weight);
          const reps = extractValue(set.reps);

          if (fieldsInfo.isDual) {
            value = selectedMetric === 'field1' ? weight : reps;
          } else {
            value = weight > 0 ? weight : reps;
          }
        }

        if (value > 0) {
          const existing = dateGroups.get(entry.date);
          if (existing) {
            existing.sum += value;
            existing.count++;
            existing.min = Math.min(existing.min, value);
            existing.max = Math.max(existing.max, value);
          } else {
            dateGroups.set(entry.date, { sum: value, count: 1, min: value, max: value });
          }
        }
      });
    });

    return Array.from(dateGroups.entries())
      .map(([date, group]) => {
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
        return { date, value };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [history, selectedMetric, aggregationMode, fieldsInfo.isDual]);

  // Calculate delta
  const delta = useMemo(() => {
    if (chartData.length < 2) return null;
    const firstValue = chartData[0].value;
    const currentValue = chartData[chartData.length - 1].value;
    const diff = currentValue - firstValue;
    const percentage = firstValue !== 0 ? ((diff / firstValue) * 100) : 0;
    if (Math.abs(percentage) === 0) return null;
    return {
      value: Math.abs(percentage),
      isUp: diff > 0,
    };
  }, [chartData]);

  // Get current Y-axis label
  const yAxisLabel = useMemo(() => {
    if (fieldsInfo.isDual) {
      return formatLabel(selectedMetric === 'field1' ? fieldsInfo.field1 : fieldsInfo.field2);
    }
    return formatLabel(fieldsInfo.field1) || 'Progress';
  }, [fieldsInfo, selectedMetric]);

  // Aggregation dropdown options
  const aggregationOptions: DropdownMenuOption[] = useMemo(() => [
    { label: 'Avg', onPress: () => setAggregationMode('avg') },
    { label: 'Min', onPress: () => setAggregationMode('min') },
    { label: 'Max', onPress: () => setAggregationMode('max') },
  ], []);

  const aggregationLabels: Record<AggregationMode, string> = {
    avg: 'Avg',
    min: 'Min',
    max: 'Max',
  };

  // Metric segments for dual fields
  const metricSegments = useMemo(() => {
    if (!fieldsInfo.isDual) return [];
    return [
      { label: formatLabel(fieldsInfo.field1), value: 'field1' as MetricField },
      { label: formatLabel(fieldsInfo.field2), value: 'field2' as MetricField },
    ];
  }, [fieldsInfo]);

  return (
    <PressableScale onPress={onPress} style={styles.cardWrapper}>
      <Card style={styles.exerciseCard}>
        {/* Header: Thumbnail, Name, Delta - matching exercise-builder-card */}
        <View style={styles.cardHeader}>
          <PressableScale onPress={onThumbnailPress}>
            <View style={styles.thumbnailContainer}>
              {thumbnailUrl ? (
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.thumbnail, styles.placeholderThumbnail, { backgroundColor: themeColors.surfacePrimary }]}>
                  <Dumbbell {...({ size: 24, color: themeColors.mutedText } as any)} />
                </View>
              )}
            </View>
          </PressableScale>

          <View style={styles.nameContainer}>
            <Text style={[styles.exerciseName, { color: themeColors.text }]} numberOfLines={2}>
              {exercise.name}
            </Text>
          </View>

          {delta && (
            <View style={[styles.deltaPill, { backgroundColor: hexToRgba(delta.isUp ? '#22c55e' : '#ef4444', 0.15) }]}>
              <PlatformIcon
                sf={delta.isUp ? 'arrow.up.right' : 'arrow.down.right'}
                IconComponent={delta.isUp ? TrendingUp : TrendingDown}
                size={14}
                color={delta.isUp ? '#22c55e' : '#ef4444'}
              />
              <Text style={[styles.deltaText, { color: delta.isUp ? '#22c55e' : '#ef4444' }]}>
                {delta.value.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

        {/* Chart Controls Row */}
        <View style={styles.chartControlsRow}>
          <Text style={[styles.yAxisLabel, { color: themeColors.text }]}>
            {yAxisLabel}
          </Text>
          <DropdownMenuWrapper options={aggregationOptions}>
            <PressableOpacity style={styles.aggregationButton}>
              <Text style={[styles.aggregationText, { color: themeColors.text }]}>
                {aggregationLabels[aggregationMode]}
              </Text>
              {Platform.OS === 'ios' ? (
                <SymbolView name="chevron.down" tintColor={themeColors.mutedText} size={12} type="monochrome" />
              ) : (
                <ChevronDown {...({ size: 12, color: themeColors.mutedText } as any)} />
              )}
            </PressableOpacity>
          </DropdownMenuWrapper>
        </View>

        {/* Chart - directly in card, no nested card */}
        <View style={styles.chartContainer}>
          <ValueLineChart
            data={chartData}
            hideHeader
            noCard
          />
        </View>

        {/* Field Toggle for dual fields */}
        {fieldsInfo.isDual && (
          <View style={styles.fieldToggleContainer}>
            <SegmentedControl
              segments={metricSegments}
              value={selectedMetric}
              onChange={(value) => setSelectedMetric(value as MetricField)}
              backgroundColor={isDarkMode ? themeColors.surfaceSecondary : themeColors.surfacePrimary}
              noPadding
            />
          </View>
        )}

        {/* Footer: Sessions count */}
        <View style={[styles.footerRow, { borderTopColor: themeColors.border }]}>
          <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
            <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
              {history.length} {history.length === 1 ? t('general.session') : t('general.sessions')}
            </Text>
          </View>
        </View>
      </Card>
    </PressableScale>
  );
};

export default function AllExerciseHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const { id } = useLocalSearchParams<{ id: string }>();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Get exercises from store
  const exercises = useClientDetailStore((state) => state.uniqueExercises);
  const isLoadingExercises = useClientDetailStore((state) => state.isLoadingUniqueExercises);
  const coachId = useClientDetailStore((state) => state.coachId);
  const clientId = useClientDetailStore((state) => state.clientId);
  const loadClientData = useClientDetailStore((state) => state.loadClientData);

  // Load client data if navigating directly to this screen
  useEffect(() => {
    if (id && !clientId) {
      loadClientData(id);
    }
  }, [id, clientId, loadClientData]);

  // State for loaded histories
  const [exerciseHistories, setExerciseHistories] = useState<Map<string, HistoryEntry[]>>(new Map());
  const [isLoadingHistories, setIsLoadingHistories] = useState(false);

  // Transform exercises for thumbnail hook
  const exercisesForThumbnails = useMemo(() => {
    return exercises.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      rawThumbnailUrl: ex.rawThumbnailUrl,
    }));
  }, [exercises]);

  const { getThumbnailUrl } = useExerciseThumbnails(exercisesForThumbnails as any);

  // Load all exercise histories with caching
  useEffect(() => {
    const loadHistories = async () => {
      if (!id || !coachId || exercises.length === 0) return;

      // Check if we have cached data for this client
      const cacheKey = `${id}:${coachId}`;
      const cachedData = exerciseHistoryCache.get(cacheKey);

      // If we have cached data and all exercises are covered, use it
      if (cachedData && exercises.every(ex => cachedData.has(ex.id))) {
        setExerciseHistories(cachedData);
        return;
      }

      setIsLoadingHistories(true);

      const historyMap = cachedData || new Map<string, HistoryEntry[]>();

      // Only load exercises that aren't already cached
      const exercisesToLoad = exercises.filter(ex => !historyMap.has(ex.id));

      if (exercisesToLoad.length > 0) {
        await Promise.all(
          exercisesToLoad.map(async (exercise) => {
            try {
              const data = await getExerciseHistory({
                clientId: id,
                coachId,
                exerciseId: exercise.id,
              });
              historyMap.set(exercise.id, data);
            } catch (error) {
              console.error(`Failed to load history for ${exercise.name}:`, error);
              historyMap.set(exercise.id, []);
            }
          })
        );

        // Update cache
        exerciseHistoryCache.set(cacheKey, historyMap);
      }

      setExerciseHistories(historyMap);
      setIsLoadingHistories(false);
    };

    loadHistories();
  }, [id, coachId, exercises]);

  // Filter exercises that have history data and match search
  const exercisesWithData = useMemo(() => {
    const withData = exercises.filter((ex) => {
      const history = exerciseHistories.get(ex.id);
      return history && history.length > 0;
    });
    if (!searchQuery.trim()) return withData;
    const query = searchQuery.toLowerCase();
    return withData.filter((ex) => ex.name.toLowerCase().includes(query));
  }, [exercises, exerciseHistories, searchQuery]);

  const handleBackPress = () => {
    router.back();
  };

  const handleExercisePress = useCallback((exercise: UniqueExercise) => {
    router.push({
      pathname: '/client/[id]/exercise-detail',
      params: {
        id,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
      },
    });
  }, [router, id]);

  const handleThumbnailPress = useCallback((exercise: UniqueExercise) => {
    router.push({
      pathname: '/modals/workout/exercise-details-modal',
      params: {
        name: exercise.name,
        exerciseId: exercise.id,
      },
    });
  }, [router]);

  const isLoading = isLoadingExercises || isLoadingHistories;

  if (isLoading && exercises.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.loadingContainer, { paddingTop: insets.top + HEADER_HEIGHT }]}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />
        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('clientDetail.sections.allExercises')}
          </Text>
          <View style={{ width: 44 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('general.searchPlaceholder')}
          />
        </View>

        {isLoadingHistories ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : exercisesWithData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <PlatformIcon
              sf="dumbbell.fill"
              IconComponent={Dumbbell}
              size={48}
              color={themeColors.mutedText}
            />
            <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
              {t('clientDetail.exercises.emptyTitle')}
            </Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {exercisesWithData.map((exercise) => {
              const history = exerciseHistories.get(exercise.id) || [];
              const thumbnailUrl = getThumbnailUrl(exercise.rawThumbnailUrl);

              return (
                <ExerciseHistoryCard
                  key={exercise.id}
                  exercise={exercise}
                  history={history}
                  thumbnailUrl={thumbnailUrl}
                  onPress={() => handleExercisePress(exercise)}
                  onThumbnailPress={() => handleThumbnailPress(exercise)}
                  themeColors={themeColors}
                  isDarkMode={isDarkMode}
                  t={t}
                />
              );
            })}
          </View>
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
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.allExercises')}
        </Text>
        <View style={{ width: 44 }} />
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  cardWrapper: {
    marginBottom: 0,
  },
  exerciseCard: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 64,
    height: 64,
    backgroundColor: '#f0f0f0',
  },
  placeholderThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    flex: 1,
    marginLeft: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    marginLeft: 8,
  },
  deltaText: {
    ...typography.p3,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 4,
  },
  chartControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  yAxisLabel: {
    ...typography.h5,
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
  chartContainer: {
    marginHorizontal: 0,
  },
  fieldToggleContainer: {
    marginTop: 12,
    paddingHorizontal: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    ...typography.p4,
    fontWeight: '500',
  },
});
