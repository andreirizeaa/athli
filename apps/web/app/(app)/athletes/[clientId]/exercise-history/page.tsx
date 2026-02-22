'use client';
import { useTranslations } from 'next-intl';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { Search, X, ArrowUpDown, TrendingUp, HelpCircle, Play, Loader2, LayoutGrid, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/general/utils';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getExerciseHistory, type UniqueExercise, type HistoryEntry } from '@/api/client/client-training-service';
import { useClientProfileContext } from '../client-profile-context';
import { EmptyGridState } from '@/components/app/empty-grid-state';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VideoModal } from '@/components/training/builder/video-modal';
import { getExerciseById, type Exercise } from '@/api/exercise/exercise-search';
import { useExerciseThumbnails } from '@/hooks/use-exercise-thumbnails';
import { useFeatureAccess } from '@/lib/permissions/feature-gate';

// Screenshot preview component for upgrade prompt
function ScreenshotPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setDims({ w: el.offsetWidth, h: el.offsetHeight });
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const { w, h } = dims;
  const r = 8;

  return (
    <div ref={containerRef} className="relative">
      {w > 0 && h > 0 && (
        <svg
          className="pointer-events-none absolute top-0 left-0 z-10"
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          fill="none"
        >
          <defs>
            <linearGradient id="border-grad-exercise-history" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="rgb(192,132,252)" />
              <stop offset="100%" stopColor="rgb(165,180,252)" />
            </linearGradient>
          </defs>
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-exercise-history)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [0, -1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.rect
            x={1.5}
            y={1.5}
            width={w - 3}
            height={h - 3}
            rx={r}
            ry={r}
            pathLength={1}
            stroke="url(#border-grad-exercise-history)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="0.15 0.85"
            animate={{ strokeDashoffset: [-0.5, -1.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </svg>
      )}
      <img
        src="/app-screenshots/client/exercise-history/light.png"
        alt="Exercise history feature preview"
        className="block w-full h-auto rounded-lg border dark:hidden"
      />
      <img
        src="/app-screenshots/client/exercise-history/dark.png"
        alt="Exercise history feature preview"
        className="hidden w-full h-auto rounded-lg border dark:block"
      />
    </div>
  );
}

// Helper functions

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

const extractValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null) {
    return parseNumericValue(val.completed ?? val.prescribed ?? 0);
  }
  return parseNumericValue(val ?? 0);
};

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

const ClientProgressPage = () => {
  const t = useTranslations();
  const params = useParams<{ clientId: string; contactId: string }>();
  const router = useRouter();
  const isInbox = !!params.contactId;

  const { user } = useUserProfile();
  const { uniqueExercises: exercises, athlete } = useClientProfileContext();
  const { hasAccess: hasExerciseHistoryAccess, isLoading: isLoadingAccess } = useFeatureAccess('exercise_history');

  // Load exercise thumbnails
  const { getThumbnailUrl } = useExerciseThumbnails(exercises);

  // UI state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [isViewAll, setIsViewAll] = useState<boolean>(true);

  // Data state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [allExerciseHistories, setAllExerciseHistories] = useState<Map<string, HistoryEntry[]>>(new Map());
  const [isLoadingAllHistories, setIsLoadingAllHistories] = useState<boolean>(false);
  const [gridFieldSelections, setGridFieldSelections] = useState<Map<string, 'field1' | 'field2'>>(new Map());

  // Chart controls
  const [selectedCombination, setSelectedCombination] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<'field1' | 'field2'>('field1');
  const [aggregationMode, setAggregationMode] = useState<'avg' | 'min' | 'max'>('avg');
  const [sortAsc, setSortAsc] = useState(false);

  // Exercise details dialog state
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [exerciseDialogData, setExerciseDialogData] = useState<Exercise | null>(null);
  const [isLoadingExerciseDetails, setIsLoadingExerciseDetails] = useState(false);

  const handleThumbnailClick = async (exercise: UniqueExercise, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoadingExerciseDetails(true);
    setExerciseDialogOpen(true);

    try {
      const fullExercise = await getExerciseById(exercise.id);
      setExerciseDialogData(fullExercise);
    } catch (error) {
      console.error('Failed to load exercise details:', error);
      setExerciseDialogData(null);
    } finally {
      setIsLoadingExerciseDetails(false);
    }
  };

  // Load history when exercise is selected
  useEffect(() => {
    const loadHistory = async () => {
      if (!selectedExerciseId || !athlete?.id || !user?.id) {
        setHistory([]);
        return;
      }
      setIsLoadingHistory(true);
      try {
        const data = await getExerciseHistory({
          clientId: athlete.id,
          coachId: user.id,
          exerciseId: selectedExerciseId,
        });
        setHistory(data);
      } catch (error) {
        console.error('Failed to load exercise history:', error);
        setHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [selectedExerciseId, athlete?.id, user?.id]);

  // Load all exercise histories when in View All mode
  useEffect(() => {
    const loadAllHistories = async () => {
      if (!isViewAll || !athlete?.id || !user?.id || exercises.length === 0) {
        return;
      }
      // Skip if already loaded
      if (allExerciseHistories.size === exercises.length) {
        return;
      }
      setIsLoadingAllHistories(true);
      try {
        const historyMap = new Map<string, HistoryEntry[]>();
        await Promise.all(
          exercises.map(async (exercise) => {
            try {
              const data = await getExerciseHistory({
                clientId: athlete.id,
                coachId: user.id,
                exerciseId: exercise.id,
              });
              historyMap.set(exercise.id, data);
            } catch (error) {
              console.error(`Failed to load history for ${exercise.name}:`, error);
              historyMap.set(exercise.id, []);
            }
          })
        );
        setAllExerciseHistories(historyMap);
      } catch (error) {
        console.error('Failed to load all exercise histories:', error);
      } finally {
        setIsLoadingAllHistories(false);
      }
    };
    loadAllHistories();
  }, [isViewAll, athlete?.id, user?.id, exercises]);

  // Filter exercises by search
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return exercises;
    }
    const query = searchQuery.toLowerCase();
    return exercises.filter((exercise) =>
      exercise.name.toLowerCase().includes(query)
    );
  }, [searchQuery, exercises]);

  // Get selected exercise
  const selectedExercise = useMemo(() => {
    return exercises.find((e) => e.id === selectedExerciseId);
  }, [exercises, selectedExerciseId]);

  // Extract unique label combinations from history
  const labelCombinations = useMemo(() => {
    const combos = new Map<string, { field1: string; field2: string }>();
    history.forEach((entry) => {
      const sets = entry.exercise_data?.sets || [];
      sets.forEach((set) => {
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
    if (combos.size === 0 || (combos.size === 1 && combos.has('Unknown'))) {
      let hasWeight = false, hasReps = false, hasDistance = false, hasDuration = false;
      history.forEach((entry) => {
        const sets = entry.exercise_data?.sets || [];
        sets.forEach((set) => {
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

  useEffect(() => {
    if (combinationNames.length > 0 && !combinationNames.includes(selectedCombination)) {
      setSelectedCombination(combinationNames[0]);
    }
  }, [combinationNames, selectedCombination]);

  const selectedFields = useMemo(() => {
    return labelCombinations.get(selectedCombination) || { field1: '', field2: '' };
  }, [labelCombinations, selectedCombination]);

  const isDualField = selectedFields.field1 && selectedFields.field2;

  useEffect(() => {
    if (!isDualField) {
      setSelectedMetric('field1');
    }
  }, [isDualField]);

  const yAxisLabel = useMemo(() => {
    if (isDualField) {
      const value = selectedMetric === 'field1' ? selectedFields.field1 : selectedFields.field2;
      return formatLabel(value);
    }
    return formatLabel(selectedFields.field1) || 'Value';
  }, [isDualField, selectedMetric, selectedFields]);

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

  const groupedHistory = useMemo(() => {
    const groups: Map<string, any> = new Map();
    history.forEach((entry) => {
      const matchingSets = (entry.exercise_data?.sets || []).filter(setMatchesCombination);

      if (matchingSets.length === 0) return;

      const key = `${entry.date}-${entry.workout_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          ...entry,
          exercises: [],
        });
      }
      groups.get(key)!.exercises.push({
        ...entry,
        exercise_data: {
          ...entry.exercise_data,
          sets: matchingSets
        }
      });
    });

    const result = Array.from(groups.values()).map(group => ({
      date: group.date,
      workoutName: group.workout_name,
      workoutId: group.workout_id,
      exercises: group.exercises
    }));

    return result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
  }, [history, sortAsc, selectedCombination]);

  const statsCards = useMemo(() => {
    const labelCounts: Record<string, { sum: number; count: number; max: number }> = {};

    history.forEach((entry) => {
      const sets = entry.exercise_data?.sets || [];
      sets.forEach((set) => {
        if (!setMatchesCombination(set)) return;

        let processedTrackableField = false;

        [set.trackableField1, set.trackableField2].forEach((field) => {
          if (!field?.label || field.label === 'Optional') return;
          const val = parseNumericValue(field.completed ?? field.prescribed ?? 0);
          if (isNaN(val) || val <= 0) return;

          processedTrackableField = true;
          if (!labelCounts[field.label]) {
            labelCounts[field.label] = { sum: 0, count: 0, max: 0 };
          }
          labelCounts[field.label].sum += val;
          labelCounts[field.label].count++;
          labelCounts[field.label].max = Math.max(labelCounts[field.label].max, val);
        });

        if (!processedTrackableField) {
          const weight = extractValue(set.weight);
          const reps = extractValue(set.reps);
          const distance = extractValue(set.distance);
          const duration = extractValue(set.duration);

          if (weight > 0) {
            if (!labelCounts['kg']) labelCounts['kg'] = { sum: 0, count: 0, max: 0 };
            labelCounts['kg'].sum += weight;
            labelCounts['kg'].count++;
            labelCounts['kg'].max = Math.max(labelCounts['kg'].max, weight);
          }
          if (reps > 0) {
            if (!labelCounts['Reps']) labelCounts['Reps'] = { sum: 0, count: 0, max: 0 };
            labelCounts['Reps'].sum += reps;
            labelCounts['Reps'].count++;
            labelCounts['Reps'].max = Math.max(labelCounts['Reps'].max, reps);
          }
          if (distance > 0) {
            if (!labelCounts['m']) labelCounts['m'] = { sum: 0, count: 0, max: 0 };
            labelCounts['m'].sum += distance;
            labelCounts['m'].count++;
            labelCounts['m'].max = Math.max(labelCounts['m'].max, distance);
          }
          if (duration > 0) {
            if (!labelCounts['sec']) labelCounts['sec'] = { sum: 0, count: 0, max: 0 };
            labelCounts['sec'].sum += duration;
            labelCounts['sec'].count++;
            labelCounts['sec'].max = Math.max(labelCounts['sec'].max, duration);
          }
        }
      });
    });

    return Object.entries(labelCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([label, stats]) => {
        const avg = stats.sum / stats.count;
        const shouldRound = label === 'Reps' || label === 'sec' || label === 'seconds';
        return {
          label: `Avg ${formatLabel(label)}`,
          value: stats.count > 0 ? (shouldRound ? `${Math.round(avg)}` : `${avg.toFixed(1)}`) : '-',
        };
      });
  }, [history, selectedCombination]);

  const chartData = useMemo(() => {
    const dateGroups: Map<string, { sum: number; count: number; min: number; max: number; timestamp: number; dateLabel: string }> = new Map();

    const addToDateGroup = (dateStr: string, value: number) => {
      const timestamp = new Date(dateStr).getTime();
      const dateLabel = format(new Date(dateStr), 'MMM d');
      const existing = dateGroups.get(dateStr);
      if (existing) {
        existing.sum += value;
        existing.count++;
        existing.min = Math.min(existing.min, value);
        existing.max = Math.max(existing.max, value);
      } else {
        dateGroups.set(dateStr, { sum: value, count: 1, min: value, max: value, timestamp, dateLabel });
      }
    };

    history.forEach((entry) => {
      const sets = entry.exercise_data?.sets || [];
      sets.forEach((set) => {
        const label1 = set.trackableField1?.label || '';
        const label2 = set.trackableField2?.label || '';

        const validLabel1 = label1 && label1 !== 'Optional' ? label1 : '';
        const validLabel2 = label2 && label2 !== 'Optional' ? label2 : '';
        const displayCombo = [validLabel1, validLabel2].filter(Boolean).join(' + ') || 'Unknown';

        let matchesCombo = displayCombo === selectedCombination;

        if (!set.trackableField1 && !set.trackableField2) {
          const weight = extractValue(set.weight);
          const reps = extractValue(set.reps);
          const distance = extractValue(set.distance);
          const duration = extractValue(set.duration);

          if (selectedCombination === 'kg + Reps' && weight > 0 && reps > 0) {
            const value = selectedMetric === 'field1' ? weight : reps;
            addToDateGroup(entry.date, value);
            return;
          } else if (selectedCombination === 'm + sec' && distance > 0 && duration > 0) {
            const value = selectedMetric === 'field1' ? distance : duration;
            addToDateGroup(entry.date, value);
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

        if (!matchesCombo) return;

        const field1Val = parseNumericValue(set.trackableField1?.completed ?? set.trackableField1?.prescribed);
        const field2Val = parseNumericValue(set.trackableField2?.completed ?? set.trackableField2?.prescribed);

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

    const dataPoints = Array.from(dateGroups.values()).map(group => {
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
        date: group.dateLabel,
        value,
        timestamp: group.timestamp
      };
    });

    return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
  }, [history, selectedCombination, selectedMetric, isDualField, aggregationMode]);

  const chartConfig: ChartConfig = {
    value: {
      label: yAxisLabel,
      color: 'var(--primary)',
    },
  };

  // Helper to get available fields for an exercise (for grid view toggle)
  const getExerciseFields = (exerciseId: string): { field1: string; field2: string } | null => {
    const exerciseHistory = allExerciseHistories.get(exerciseId) || [];
    let field1Label = '';
    let field2Label = '';

    for (const entry of exerciseHistory) {
      const sets = entry.exercise_data?.sets || [];
      for (const set of sets) {
        // Check trackable fields
        if (set.trackableField1?.label && set.trackableField1.label !== 'Optional') {
          field1Label = set.trackableField1.label;
        }
        if (set.trackableField2?.label && set.trackableField2.label !== 'Optional') {
          field2Label = set.trackableField2.label;
        }
        // Fallback to weight/reps
        if (!field1Label && !field2Label) {
          const weight = extractValue(set.weight);
          const reps = extractValue(set.reps);
          if (weight > 0 && reps > 0) {
            field1Label = 'kg';
            field2Label = 'Reps';
          }
        }
        if (field1Label && field2Label) break;
      }
      if (field1Label && field2Label) break;
    }

    if (field1Label && field2Label) {
      return { field1: field1Label, field2: field2Label };
    }
    return null;
  };

  // Helper to get chart data for any exercise (for grid view)
  const getExerciseChartData = (exerciseId: string, selectedField?: 'field1' | 'field2'): { data: { date: string; value: number; timestamp: number }[]; label: string } => {
    const exerciseHistory = allExerciseHistories.get(exerciseId) || [];
    const dateGroups: Map<string, { sum: number; count: number; timestamp: number; dateLabel: string }> = new Map();
    let detectedLabel = '';
    const fields = getExerciseFields(exerciseId);
    const isDual = fields !== null;
    const useField = selectedField || 'field1';

    exerciseHistory.forEach((entry) => {
      const sets = entry.exercise_data?.sets || [];
      sets.forEach((set) => {
        let value = 0;

        // Try trackable fields first
        const hasTrackable1 = set.trackableField1?.label && set.trackableField1.label !== 'Optional';
        const hasTrackable2 = set.trackableField2?.label && set.trackableField2.label !== 'Optional';

        if (hasTrackable1 || hasTrackable2) {
          if (isDual) {
            if (useField === 'field1' && hasTrackable1) {
              value = parseNumericValue(set.trackableField1!.completed ?? set.trackableField1!.prescribed);
              if (!detectedLabel) detectedLabel = formatLabel(set.trackableField1!.label ?? '');
            } else if (useField === 'field2' && hasTrackable2) {
              value = parseNumericValue(set.trackableField2!.completed ?? set.trackableField2!.prescribed);
              if (!detectedLabel) detectedLabel = formatLabel(set.trackableField2!.label ?? '');
            } else if (hasTrackable1) {
              value = parseNumericValue(set.trackableField1!.completed ?? set.trackableField1!.prescribed);
              if (!detectedLabel) detectedLabel = formatLabel(set.trackableField1!.label ?? '');
            } else if (hasTrackable2) {
              value = parseNumericValue(set.trackableField2!.completed ?? set.trackableField2!.prescribed);
              if (!detectedLabel) detectedLabel = formatLabel(set.trackableField2!.label ?? '');
            }
          } else {
            if (hasTrackable1) {
              value = parseNumericValue(set.trackableField1!.completed ?? set.trackableField1!.prescribed);
              if (!detectedLabel) detectedLabel = formatLabel(set.trackableField1!.label ?? '');
            } else if (hasTrackable2) {
              value = parseNumericValue(set.trackableField2!.completed ?? set.trackableField2!.prescribed);
              if (!detectedLabel) detectedLabel = formatLabel(set.trackableField2!.label ?? '');
            }
          }
        } else {
          // Fallback to weight, reps, etc.
          const weight = extractValue(set.weight);
          const reps = extractValue(set.reps);
          if (isDual && fields?.field1 === 'kg' && fields?.field2 === 'Reps') {
            if (useField === 'field1' && weight > 0) {
              value = weight;
              if (!detectedLabel) detectedLabel = 'Kg';
            } else if (useField === 'field2' && reps > 0) {
              value = reps;
              if (!detectedLabel) detectedLabel = 'Reps';
            }
          } else {
            if (weight > 0) {
              value = weight;
              if (!detectedLabel) detectedLabel = 'Kg';
            } else if (reps > 0) {
              value = reps;
              if (!detectedLabel) detectedLabel = 'Reps';
            }
          }
        }

        if (value > 0) {
          const timestamp = new Date(entry.date).getTime();
          const dateLabel = format(new Date(entry.date), 'MMM d');
          const existing = dateGroups.get(entry.date);
          if (existing) {
            existing.sum += value;
            existing.count++;
          } else {
            dateGroups.set(entry.date, { sum: value, count: 1, timestamp, dateLabel });
          }
        }
      });
    });

    const data = Array.from(dateGroups.values())
      .map(group => ({
        date: group.dateLabel,
        value: Math.round((group.sum / group.count) * 10) / 10,
        timestamp: group.timestamp
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return { data, label: detectedLabel || 'Value' };
  };

  // Helper to get stats for any exercise (for grid view)
  const getExerciseStats = (exerciseId: string) => {
    const exerciseHistory = allExerciseHistories.get(exerciseId) || [];
    let totalWeight = 0;
    let totalReps = 0;
    let weightCount = 0;
    let repsCount = 0;
    let maxWeight = 0;

    exerciseHistory.forEach((entry) => {
      const sets = entry.exercise_data?.sets || [];
      sets.forEach((set) => {
        const weight = extractValue(set.weight);
        const reps = extractValue(set.reps);

        if (weight > 0) {
          totalWeight += weight;
          weightCount++;
          maxWeight = Math.max(maxWeight, weight);
        }
        if (reps > 0) {
          totalReps += reps;
          repsCount++;
        }
      });
    });

    return {
      avgWeight: weightCount > 0 ? totalWeight / weightCount : null,
      avgReps: repsCount > 0 ? totalReps / repsCount : null,
      maxWeight: maxWeight > 0 ? maxWeight : null,
      sessionCount: exerciseHistory.length,
    };
  };

  const { yAxisDomain, yAxisTicks } = useMemo(() => {
    if (chartData.length === 0) return { yAxisDomain: ['auto', 'auto'], yAxisTicks: [] };
    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) return { yAxisDomain: [Math.max(0, min - 10), max + 10], yAxisTicks: [min] };

    const roughStep = range / 5;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / magnitude;
    let step = magnitude;
    if (normalizedStep < 1.5) step *= 1;
    else if (normalizedStep < 3) step *= 2;
    else if (normalizedStep < 7) step *= 5;
    else step *= 10;

    const niceMin = Math.floor(min / step) * step;
    const niceMax = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = niceMin; v <= niceMax; v += step) ticks.push(v);

    return { yAxisDomain: [niceMin, niceMax], yAxisTicks: ticks };
  }, [chartData]);

  const formatSetValue = (set: any): string => {
    const parts: string[] = [];

    if (set.trackableField1) {
      const val = parseNumericValue(set.trackableField1.completed ?? set.trackableField1.prescribed);
      if (!isNaN(val) && val > 0) {
        parts.push(`${val} ${set.trackableField1.label || ''}`);
      }
    }

    if (set.trackableField2) {
      const val = parseNumericValue(set.trackableField2.completed ?? set.trackableField2.prescribed);
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

  // Show upgrade prompt for users without access
  if (!isLoadingAccess && !hasExerciseHistoryAccess) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
          <div className="space-y-2 mb-4">
            <h2 className="text-lg font-semibold">Upgrade to Pro</h2>
            <p className="text-sm text-muted-foreground">
              Track exercise progress over time with detailed charts and history logs for every exercise your client performs.
            </p>
          </div>
          <ScreenshotPreview />
          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={() => router.push('/settings/billing')}>
              View Plans
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8">
        <EmptyGridState
          title={t('common.noExerciseHistory')}
          subtitle={t('common.completeWorkoutsToSeeHistory')}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col flex-1 min-h-0">
      <div className="flex h-full w-full flex-1 min-h-0">
        {/* Left sidebar - Exercise list */}
        <div className={cn(isInbox ? "w-60" : "w-80", "border-r bg-background flex-shrink-0 flex flex-col")}>
          <div className="w-full relative flex-shrink-0">
            <div className="px-3 py-3 flex items-center">
              <div className="relative w-full px-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder={t('common.searchExercises')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn('pl-9 w-full', searchQuery && 'pr-9')}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
            <Separator className="absolute bottom-[-1px] left-0 right-0" />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* View All option */}
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  setIsViewAll(true);
                  setSelectedExerciseId(null);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left',
                  isViewAll
                    ? 'bg-accent/50 border-l-2 border-l-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <LayoutGrid className="size-4 flex-shrink-0" />
                <span className="text-sm font-medium">All Exercises</span>
              </button>
              <Separator className="w-full" />
            </div>
            {/* Exercises list */}
            <div className="space-y-0 flex-1 overflow-y-auto">
              {filteredExercises.length === 0 ? (
                <div className="flex items-center justify-center py-8 px-4">
                  <span className="text-sm text-muted-foreground">No exercises found</span>
                </div>
              ) : (
                filteredExercises.map((exercise) => {
                  const isSelected = !isViewAll && selectedExerciseId === exercise.id;

                  return (
                    <React.Fragment key={exercise.id}>
                      <button
                        onClick={() => {
                          setSelectedExerciseId(exercise.id);
                          setIsViewAll(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left group/exercise',
                          isSelected
                            ? 'bg-accent/50 border-l-2 border-l-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        )}
                      >
                        <div
                          className="relative h-9 w-9 shrink-0 cursor-pointer"
                          onClick={(e) => handleThumbnailClick(exercise, e)}
                        >
                          <Avatar className="h-9 w-9 rounded-md">
                            <AvatarImage src={getThumbnailUrl(exercise.rawThumbnailUrl)} alt={exercise.name} className="object-cover" />
                            <AvatarFallback className="rounded-md text-xs">
                              {exercise.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Hover overlay with play icon */}
                          <div className="absolute inset-0 rounded-md bg-primary/80 opacity-0 group-hover/exercise:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="size-4 text-primary-foreground fill-primary-foreground" />
                          </div>
                        </div>
                        <span className="text-sm font-medium truncate">{exercise.name}</span>
                      </button>
                      <Separator className="w-full" />
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {isViewAll ? (
            /* View All Grid */
            <div className="flex-1 overflow-auto p-4">
              {isLoadingAllHistories ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-10 w-10 animate-spin text-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredExercises.map((exercise) => {
                    const exerciseFields = getExerciseFields(exercise.id);
                    const selectedField = gridFieldSelections.get(exercise.id) || 'field1';
                    const { data: exerciseChartData, label: exerciseYAxisLabel } = getExerciseChartData(exercise.id, selectedField);
                    const stats = getExerciseStats(exercise.id);
                    const exerciseChartConfig: ChartConfig = {
                      value: {
                        label: exerciseYAxisLabel,
                        color: 'var(--primary)',
                      },
                    };

                    // Calculate Y-axis domain and ticks for this exercise
                    let exerciseYAxisDomain: [number | string, number | string] = ['auto', 'auto'];
                    let exerciseYAxisTicks: number[] = [];
                    if (exerciseChartData.length > 0) {
                      const values = exerciseChartData.map(d => d.value);
                      const min = Math.min(...values);
                      const max = Math.max(...values);
                      const range = max - min;

                      if (range === 0) {
                        exerciseYAxisDomain = [Math.max(0, min - 10), max + 10];
                        exerciseYAxisTicks = [min];
                      } else {
                        const roughStep = range / 4;
                        const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
                        const normalizedStep = roughStep / magnitude;
                        let step = magnitude;
                        if (normalizedStep < 1.5) step *= 1;
                        else if (normalizedStep < 3) step *= 2;
                        else if (normalizedStep < 7) step *= 5;
                        else step *= 10;

                        const niceMin = Math.floor(min / step) * step;
                        const niceMax = Math.ceil(max / step) * step;
                        exerciseYAxisDomain = [niceMin, niceMax];
                        for (let v = niceMin; v <= niceMax; v += step) {
                          exerciseYAxisTicks.push(v);
                        }
                      }
                    }

                    return (
                      <div key={exercise.id} className="border rounded-lg p-4 bg-background flex flex-col gap-4">
                        {/* Card Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 group/thumbnail">
                            <div
                              className="relative h-9 w-9 shrink-0 cursor-pointer"
                              onClick={(e) => handleThumbnailClick(exercise, e)}
                            >
                              <Avatar className="h-9 w-9 rounded-md">
                                <AvatarImage src={getThumbnailUrl(exercise.rawThumbnailUrl)} alt={exercise.name} className="object-cover" />
                                <AvatarFallback className="rounded-md text-xs">
                                  {exercise.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {/* Hover overlay with play icon */}
                              <div className="absolute inset-0 rounded-md bg-primary/80 opacity-0 group-hover/thumbnail:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="size-4 text-primary-foreground fill-primary-foreground" />
                              </div>
                            </div>
                            <span className="text-sm font-semibold">{exercise.name}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setSelectedExerciseId(exercise.id);
                              setIsViewAll(false);
                            }}
                          >
                            View
                            <ChevronRight className="size-4" />
                          </Button>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {stats.avgWeight !== null && (
                              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 border">
                                <TrendingUp className="size-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Avg Weight:</span>
                                <span className="text-xs font-semibold">{stats.avgWeight.toFixed(1)} kg</span>
                              </div>
                            )}
                            {stats.avgReps !== null && (
                              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 border">
                                <TrendingUp className="size-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Avg Reps:</span>
                                <span className="text-xs font-semibold">{Math.round(stats.avgReps)}</span>
                              </div>
                            )}
                            {stats.sessionCount > 0 && (
                              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 border">
                                <span className="text-xs text-muted-foreground">Sessions:</span>
                                <span className="text-xs font-semibold">{stats.sessionCount}</span>
                              </div>
                            )}
                          </div>
                          {/* Y-axis toggle for dual fields */}
                          {exerciseFields && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Y-Axis:</span>
                              <Tabs
                                value={selectedField}
                                onValueChange={(v) => {
                                  setGridFieldSelections(prev => {
                                    const next = new Map(prev);
                                    next.set(exercise.id, v as 'field1' | 'field2');
                                    return next;
                                  });
                                }}
                              >
                                <TabsList className="h-7">
                                  <TabsTrigger
                                    value="field1"
                                    className="text-xs h-6 px-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                                  >
                                    {formatLabel(exerciseFields.field1)}
                                  </TabsTrigger>
                                  <TabsTrigger
                                    value="field2"
                                    className="text-xs h-6 px-2 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                                  >
                                    {formatLabel(exerciseFields.field2)}
                                  </TabsTrigger>
                                </TabsList>
                              </Tabs>
                            </div>
                          )}
                        </div>

                        {/* Chart */}
                        <div className="w-full border rounded-lg p-4 bg-background relative z-0">
                          {exerciseChartData.length > 0 ? (
                            <ChartContainer
                              config={exerciseChartConfig}
                              className="w-full h-[200px]"
                            >
                              <LineChart
                                accessibilityLayer
                                data={exerciseChartData}
                                margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                              >
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                                <XAxis
                                  dataKey="date"
                                  tickLine={false}
                                  axisLine={false}
                                  tickMargin={8}
                                  interval="preserveStartEnd"
                                  tick={{ fill: 'currentColor', fontSize: 11 }}
                                />
                                <YAxis
                                  tickLine={false}
                                  axisLine={false}
                                  tickMargin={8}
                                  domain={exerciseYAxisDomain}
                                  ticks={exerciseYAxisTicks.length > 0 ? exerciseYAxisTicks : undefined}
                                  tickFormatter={(value) => value.toFixed(0)}
                                  tick={{ fill: 'currentColor', fontSize: 11 }}
                                  label={{ value: exerciseYAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 11 } }}
                                />
                                <ChartTooltip
                                  cursor={false}
                                  content={<ChartTooltipContent hideLabel />}
                                />
                                <Line
                                  dataKey="value"
                                  type="monotoneX"
                                  stroke="var(--color-value)"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ChartContainer>
                          ) : (
                            <div className="flex items-center justify-center h-[200px]">
                              <div className="text-sm text-muted-foreground text-center">
                                No data available
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedExercise && history.length > 0 ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Top header - Exercise name and variant tabs - height matches search bar container */}
              <div className="px-4 border-b flex items-center gap-3 flex-shrink-0 min-h-[61px]">
                <h2 className="text-sm font-semibold">{selectedExercise.name}</h2>
                {/* Variant tabs */}
                {combinationNames.length > 1 && (
                  <Tabs
                    value={selectedCombination}
                    onValueChange={setSelectedCombination}
                  >
                    <TabsList className="h-8">
                      {combinationNames.map((combo) => (
                        <TabsTrigger
                          key={combo}
                          value={combo}
                          className="text-xs h-7 px-3 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary"
                        >
                          {formatCombinationLabel(combo)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                )}
              </div>

              {/* Two column content area */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* Chart column */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  {/* Chart header - Stats and controls */}
                  <div className="px-4 py-[13.5px] border-b flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {/* Stats cards */}
                      {statsCards.map((card, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-muted/50 border">
                          <TrendingUp className="size-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{card.label}:</span>
                          <span className="text-xs font-semibold">{card.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Y-axis selector for dual fields */}
                      {isDualField && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Y-Axis:</span>
                          <Tabs
                            value={selectedMetric}
                            onValueChange={(v) => setSelectedMetric(v as 'field1' | 'field2')}
                          >
                            <TabsList className="h-8">
                              <TabsTrigger value="field1" className="text-xs h-7 px-3 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                                {formatLabel(selectedFields.field1)}
                              </TabsTrigger>
                              <TabsTrigger value="field2" className="text-xs h-7 px-3 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                                {formatLabel(selectedFields.field2)}
                              </TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                      )}
                      {/* Aggregation mode */}
                      <Tabs
                        value={aggregationMode}
                        onValueChange={(v) => setAggregationMode(v as 'avg' | 'min' | 'max')}
                      >
                        <TabsList className="h-8">
                          <TabsTrigger value="avg" className="text-xs h-7 px-3 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">Avg</TabsTrigger>
                          <TabsTrigger value="min" className="text-xs h-7 px-3 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">Min</TabsTrigger>
                          <TabsTrigger value="max" className="text-xs h-7 px-3 data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">Max</TabsTrigger>
                        </TabsList>
                      </Tabs>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <HelpCircle className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px]">
                          <div className="text-xs space-y-1">
                            <p><span className="font-semibold">Avg:</span> Average of all sets per session</p>
                            <p><span className="font-semibold">Min:</span> Lowest value per session</p>
                            <p><span className="font-semibold">Max:</span> Highest value per session</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="flex-1 min-h-0 p-4">
                    {chartData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="w-full h-full">
                        <LineChart
                          accessibilityLayer
                          data={chartData}
                          margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                        >
                          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.5} />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            interval="preserveStartEnd"
                            tick={{ fill: 'currentColor', fontSize: 11 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={12}
                            domain={yAxisDomain}
                            ticks={yAxisTicks}
                            tickFormatter={(value) => value.toFixed(0)}
                            tick={{ fill: 'currentColor', fontSize: 11 }}
                            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: 'currentColor', fontSize: 11 } }}
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                          />
                          <Line
                            dataKey="value"
                            type="monotoneX"
                            stroke="var(--color-value)"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ChartContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        No chart data available
                      </div>
                    )}
                  </div>
                </div>

                {/* History column */}
                <div className="w-[320px] border-l flex flex-col overflow-hidden flex-shrink-0">
                  {/* History header */}
                  <div className="px-4 py-[15.5px] border-b flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">History</h3>
                      <span className="text-xs text-muted-foreground">
                        ({groupedHistory.length} session{groupedHistory.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSortAsc(!sortAsc)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ArrowUpDown className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{sortAsc ? 'Show newest first' : 'Show oldest first'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* History list */}
                  <div className="flex-1 overflow-y-auto p-3">
                    {groupedHistory.length === 0 ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        No history found
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {groupedHistory.map((group) => (
                          <div key={`${group.date}-${group.workoutId}`} className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold">
                                {format(new Date(group.date), 'MMM d, yyyy')}
                              </span>
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {group.workoutName}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              {group.exercises.map((entry: any, j: number) => (
                                <React.Fragment key={j}>
                                  {(entry.exercise_data?.sets || []).map((set: any, si: number) => (
                                    <div key={si} className="flex items-center gap-2 text-xs py-0.5">
                                      <span className="text-muted-foreground w-4">{si + 1}.</span>
                                      <span className="text-foreground tabular-nums">
                                        {formatSetValue(set)}
                                      </span>
                                    </div>
                                  ))}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : selectedExercise && isLoadingHistory ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-foreground" />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>{t('common.selectExerciseProgress')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Exercise Details Dialog */}
      <VideoModal
        open={exerciseDialogOpen}
        onOpenChange={setExerciseDialogOpen}
        exercise={exerciseDialogData}
      />
    </div>
  );
};

export default ClientProgressPage;
