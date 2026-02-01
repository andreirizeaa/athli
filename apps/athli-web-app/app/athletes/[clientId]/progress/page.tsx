'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import { Search, X, ArrowUpDown, TrendingUp, HelpCircle, Play } from 'lucide-react';
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

// Helper functions
const extractValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null) {
    return Number(val.completed ?? val.prescribed ?? 0);
  }
  return Number(val ?? 0);
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
  const params = useParams<{ clientId: string; contactId: string }>();
  const isInbox = !!params.contactId;

  const { user } = useUserProfile();
  const { uniqueExercises: exercises, athlete } = useClientProfileContext();

  // UI state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // Data state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

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
          const val = Number(field.completed ?? field.prescribed ?? 0);
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

  if (exercises.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8">
        <EmptyGridState
          title="No exercise history"
          subtitle="Complete workouts to see exercise progress and history here."
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
                  placeholder="Search exercises..."
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
            <div className="space-y-0 flex-1 overflow-y-auto">
              {filteredExercises.length === 0 ? (
                <div className="flex items-center justify-center py-8 px-4">
                  <span className="text-sm text-muted-foreground">No exercises found</span>
                </div>
              ) : (
                filteredExercises.map((exercise, index) => {
                  const isSelected = selectedExerciseId === exercise.id;
                  const isLast = index === filteredExercises.length - 1;
                  const isOnlyItem = filteredExercises.length === 1;

                  return (
                    <React.Fragment key={exercise.id}>
                      <button
                        onClick={() => setSelectedExerciseId(exercise.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left group/exercise',
                          isSelected
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                        )}
                      >
                        <div
                          className="relative h-9 w-9 shrink-0 cursor-pointer"
                          onClick={(e) => handleThumbnailClick(exercise, e)}
                        >
                          <Avatar className="h-9 w-9 rounded-md">
                            <AvatarImage src={exercise.rawThumbnailUrl} alt={exercise.name} className="object-cover" />
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
          {selectedExercise && history.length > 0 ? (
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Select an exercise to view progress</p>
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
