'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Ellipsis, Play, Plus, Trash2, X } from 'lucide-react';
import { Exercise, searchExercises } from '@/api/exercise/exercise-search';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/general/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { MultiAsyncSelect, type Option } from '@/components/ui/multi-async-select';

export type SetData = {
  setNumber: number;
  type: 'warmUp' | 'normal' | 'failure' | 'dropset';
  reps: string;
  weight: string;
  rest: string;
  distance?: string;
  duration?: string;
};

export type SetFieldValidation = {
  reps?: boolean;
  weight?: boolean;
  distance?: boolean;
  duration?: boolean;
  rest?: boolean;
};

type ExerciseWithSets = Exercise & {
  sets?: SetData[];
  alternatives?: string[]; // Array of exercise IDs for alternative exercises
  notes?: string; // Exercise-specific notes
};

type ExerciseCardProps = {
  exercise: ExerciseWithSets;
  onVideoClick: (exercise: Exercise) => void;
  onExerciseChange: (newExercise: ExerciseWithSets) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isLinkedToPrev?: boolean;
  isLinkedToNext?: boolean;
  sectionType?: 'regular' | 'amrap' | 'timed' | 'circuits' | 'auxiliary';
  validationErrors?: Record<number, SetFieldValidation>;
  onClearValidationField?: (setIndex: number, field: keyof SetFieldValidation) => void;
};

type DropsetData = {
  dropNumber: number;
  value: string;
};

export const ExerciseCard = ({
  exercise,
  onVideoClick,
  onExerciseChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  isLinkedToPrev = false,
  isLinkedToNext = false,
  sectionType = 'regular',
  validationErrors,
  onClearValidationField,
}: ExerciseCardProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  // Initialize alternatives from exercise prop if available, or load from exercise IDs
  const [alternatives, setAlternatives] = useState<Exercise[]>(() => {
    if (exercise.alternatives && exercise.alternatives.length > 0) {
      // Load full exercise objects from IDs
      return exercise.alternatives
        .map((id) => searchExercises('').find((e) => e.exerciseId === id))
        .filter((e): e is Exercise => e !== undefined);
    }
    return [];
  });
  const [isAlternativesVisible, setIsAlternativesVisible] = useState(
    exercise.alternatives && exercise.alternatives.length > 0
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const isEmpty = !exercise.name || exercise.name === '';
  const isSingleSetOnly = sectionType === 'amrap' || sectionType === 'timed' || sectionType === 'circuits';
  const [sets, setSets] = useState<SetData[]>(() => {
    // If parent already has sets (e.g. from restored state), use them.
    if (exercise.sets && exercise.sets.length > 0) {
      return exercise.sets;
    }

    if (isSingleSetOnly) {
      return [{ setNumber: 1, type: 'normal', reps: '12', weight: '', rest: '90' }];
    }

    return [
      { setNumber: 1, type: 'normal', reps: '12', weight: '', rest: '90' },
      { setNumber: 2, type: 'normal', reps: '12', weight: '', rest: '90' },
      { setNumber: 3, type: 'normal', reps: '12', weight: '', rest: '90' },
    ];
  });
  const [dropsetPopoverOpen, setDropsetPopoverOpen] = useState<number | null>(null);
  const [alternativeSearchResults, setAlternativeSearchResults] = useState<Exercise[]>([]);

  const handleAlternativesSearch = (query: string = '') => {
    const results = searchExercises(query).filter(
      (e) =>
        e.exerciseId !== exercise.exerciseId &&
        !(exercise.alternatives || []).includes(e.exerciseId)
    );
    setAlternativeSearchResults(results);
  };

  // Pre-load alternatives search results
  useEffect(() => {
    if (isAlternativesVisible) {
      handleAlternativesSearch('');
    }
  }, [isAlternativesVisible, exercise.exerciseId, exercise.alternatives]);
  const [dropsetData, setDropsetData] = useState<{
    setIndex: number;
    repsDrops: DropsetData[];
    weightDrops: DropsetData[];
  } | null>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show first 10 exercises when search is open but no query
      return searchExercises('').slice(0, 10);
    }
    return searchExercises(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (dropsetPopoverOpen) {
      const handleClickOutsideDropset = (event: MouseEvent) => {
        // Check if click is outside the popover
        const target = event.target as Node;
        const popoverElement = document.querySelector('[data-slot="popover-content"]');
        if (
          popoverElement &&
          !popoverElement.contains(target) &&
          containerRef.current &&
          !containerRef.current.contains(target)
        ) {
          setDropsetPopoverOpen(null);
          setDropsetData(null);
        }
      };

      // Small delay to avoid immediate closure
      const timeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutsideDropset);
      }, 100);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousedown', handleClickOutsideDropset);
      };
    }
  }, [dropsetPopoverOpen]);

  const handleExerciseSelect = (selectedExercise: Exercise) => {
    // When a new exercise is selected, reset the local sets and notify parent
    setIsSearchOpen(false);
    setIsSelectOpen(false);
    setSearchQuery('');
    // Reset sets to default values when exercise changes based on exercise type and section type
    let nextSets: SetData[];

    if (isSingleSetOnly) {
      if (selectedExercise.exerciseType === 'distance_duration') {
        nextSets = [
          {
            setNumber: 1,
            type: 'normal',
            reps: '',
            weight: '',
            rest: '90',
            distance: '',
            duration: '',
          },
        ];
      } else {
        nextSets = [{ setNumber: 1, type: 'normal', reps: '12', weight: '', rest: '90' }];
      }
    } else {
      if (selectedExercise.exerciseType === 'distance_duration') {
        nextSets = [
          {
            setNumber: 1,
            type: 'normal',
            reps: '',
            weight: '',
            rest: '90',
            distance: '',
            duration: '',
          },
          {
            setNumber: 2,
            type: 'normal',
            reps: '',
            weight: '',
            rest: '90',
            distance: '',
            duration: '',
          },
          {
            setNumber: 3,
            type: 'normal',
            reps: '',
            weight: '',
            rest: '90',
            distance: '',
            duration: '',
          },
        ];
      } else {
        nextSets = [
          { setNumber: 1, type: 'normal', reps: '12', weight: '', rest: '90' },
          { setNumber: 2, type: 'normal', reps: '12', weight: '', rest: '90' },
          { setNumber: 3, type: 'normal', reps: '12', weight: '', rest: '90' },
        ];
      }
    }

    setSets(nextSets);
    // Clear alternatives when main exercise changes
    setAlternatives([]);
    onExerciseChange({
      ...exercise,
      ...selectedExercise,
      sets: nextSets,
      alternatives: [],
    });
  };

  // On first mount, if the parent has no sets yet, push our initial defaults up
  useEffect(() => {
    if (!exercise.sets || exercise.sets.length === 0) {
      onExerciseChange({
        ...exercise,
        sets,
        alternatives: exercise.alternatives || [],
      });
    }
    // We intentionally run this only once on mount to establish initial sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEmpty) {
      setIsSelectOpen(true);
      setIsSearchOpen(true);
      setSearchQuery('');
    }
  }, [isEmpty]);

  const handleAlternativesChange = (selectedIds: string[]) => {
    // Resolve full exercise objects
    const updatedAlternatives = selectedIds
      .map((id) => searchExercises('').find((e) => e.exerciseId === id))
      .filter((e): e is Exercise => e !== undefined);

    setAlternatives(updatedAlternatives);

    // Notify parent about updated alternatives
    onExerciseChange({
      ...exercise,
      alternatives: selectedIds,
    });

    if (selectedIds.length === 0) {
      setIsAlternativesVisible(false);
    }
  };

  const renderExercisePill = (option: Option, onRemove: () => void) => {
    const exerciseOption = alternatives.find((a) => a.exerciseId === option.value);

    return (
      <div className="flex items-center gap-1.5 bg-muted/40 rounded-md py-0.5 px-1.5 border border-border hover:border-foreground/20 transition-colors group/pill">
        <div
          className="relative w-5 h-5 flex-shrink-0 rounded cursor-pointer group/thumbnail-pill"
          onClick={() => exerciseOption && onVideoClick(exerciseOption)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              exerciseOption && onVideoClick(exerciseOption);
            }
          }}
        >
          <Image
            src={option.imageUrl || '/demo-img.png'}
            alt={option.label}
            fill
            className="object-cover rounded"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumbnail-pill:bg-black/30 transition-colors rounded">
            <div className="opacity-0 group-hover/thumbnail-pill:opacity-100 transition-opacity bg-black/60 rounded-full p-0.5">
              <Play className="size-1.5 text-white fill-white" />
            </div>
          </div>
        </div>
        <span className="text-[10px] font-medium truncate max-w-[100px]">{option.label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-muted-foreground hover:text-destructive transition-colors ml-1"
          aria-label={`Remove ${option.label}`}
        >
          <X className="size-3" />
        </button>
      </div>
    );
  };

  const handleSetChange = (index: number, field: keyof SetData, value: string) => {
    // Build updated sets from current state (safe in event handler)
    const updated = [...sets];
    const currentSet = updated[index];

    // If changing to dropset, clear reps and weight defaults
    if (field === 'type' && value === 'dropset') {
      updated[index] = { ...currentSet, type: 'dropset', reps: '', weight: '' };
    } else if (exercise.exerciseType === 'distance_duration') {
      // For distance_duration exercise type, clear the other field when one is set
      if (field === 'distance' && value) {
        updated[index] = { ...currentSet, [field]: value, duration: '' };
      } else if (field === 'duration' && value) {
        updated[index] = { ...currentSet, [field]: value, distance: '' };
      } else {
        updated[index] = { ...currentSet, [field]: value };
      }
    } else {
      updated[index] = { ...currentSet, [field]: value };
    }

    setSets(updated);

    // Notify parent about updated sets
    onExerciseChange({
      ...exercise,
      sets: updated,
      alternatives: exercise.alternatives || [],
    });

    // Clear validation for this field when the user enters a value
    if (value && value.trim() !== '') {
      if (exercise.exerciseType === 'distance_duration') {
        if (field === 'distance' || field === 'duration') {
          // Distance/duration are mutually exclusive – clear both when either is set
          if (validationErrors) {
            onClearValidationField?.(index, 'distance');
            onClearValidationField?.(index, 'duration');
          }
        } else if (field === 'rest') {
          onClearValidationField?.(index, 'rest');
        }
      } else {
        if (field === 'reps') {
          onClearValidationField?.(index, 'reps');
        } else if (field === 'weight') {
          onClearValidationField?.(index, 'weight');
        } else if (field === 'rest') {
          onClearValidationField?.(index, 'rest');
        }
      }
    }
  };

  const handleDropsetInputClick = (setIndex: number) => {
    const set = sets[setIndex];
    if (set.type === 'dropset') {
      // Initialize dropset data for both reps and weight
      const parseDrops = (value: string): DropsetData[] => {
        if (value && value.includes('-')) {
          const values = value.split('-');
          return values.map((val, idx) => ({
            dropNumber: idx + 1,
            value: val.trim(),
          }));
        }
        return [
          { dropNumber: 1, value: '' },
          { dropNumber: 2, value: '' },
        ];
      };

      const repsDrops = parseDrops(set.reps);
      const weightDrops = parseDrops(set.weight);

      // Ensure both have the same number of drops (use the max)
      const maxDrops = Math.max(repsDrops.length, weightDrops.length, 2);
      const normalizedRepsDrops = Array.from(
        { length: maxDrops },
        (_, idx) => repsDrops[idx] || { dropNumber: idx + 1, value: '' }
      );
      const normalizedWeightDrops = Array.from(
        { length: maxDrops },
        (_, idx) => weightDrops[idx] || { dropNumber: idx + 1, value: '' }
      );

      setDropsetData({
        setIndex,
        repsDrops: normalizedRepsDrops,
        weightDrops: normalizedWeightDrops,
      });
      setDropsetPopoverOpen(setIndex);
    }
  };

  const handleDropsetValueChange = (dropIndex: number, field: 'reps' | 'weight', value: string) => {
    if (!dropsetData) return;

    const nextDropsetData = {
      ...dropsetData,
      repsDrops:
        field === 'reps'
          ? dropsetData.repsDrops.map((drop, idx) =>
            idx === dropIndex ? { ...drop, value } : drop
          )
          : dropsetData.repsDrops,
      weightDrops:
        field === 'weight'
          ? dropsetData.weightDrops.map((drop, idx) =>
            idx === dropIndex ? { ...drop, value } : drop
          )
          : dropsetData.weightDrops,
    };

    setDropsetData(nextDropsetData);

    // Live-update the parent set's reps/weight from dropset data
    const formattedReps = nextDropsetData.repsDrops
      .map((drop) => drop.value.trim())
      .filter((val) => val !== '')
      .join('-');

    const formattedWeight = nextDropsetData.weightDrops
      .map((drop) => drop.value.trim())
      .filter((val) => val !== '')
      .join('-');

    const updated = [...sets];
    updated[nextDropsetData.setIndex] = {
      ...updated[nextDropsetData.setIndex],
      reps: formattedReps,
      weight: formattedWeight,
    };

    setSets(updated);

    onExerciseChange({
      ...exercise,
      sets: updated,
      alternatives: exercise.alternatives || [],
    });

    if (formattedReps) {
      onClearValidationField?.(nextDropsetData.setIndex, 'reps');
    }
    if (formattedWeight) {
      onClearValidationField?.(nextDropsetData.setIndex, 'weight');
    }
  };

  const handleAddDrop = () => {
    if (dropsetData) {
      const newDropNumber = dropsetData.repsDrops.length + 1;
      setDropsetData({
        ...dropsetData,
        repsDrops: [...dropsetData.repsDrops, { dropNumber: newDropNumber, value: '' }],
        weightDrops: [...dropsetData.weightDrops, { dropNumber: newDropNumber, value: '' }],
      });
    }
  };

  const handleRemoveDrop = (dropIndex: number) => {
    if (dropsetData) {
      const updatedRepsDrops = dropsetData.repsDrops.filter((_, idx) => idx !== dropIndex);
      const updatedWeightDrops = dropsetData.weightDrops.filter((_, idx) => idx !== dropIndex);
      // Renumber drops
      const renumberedRepsDrops = updatedRepsDrops.map((drop, idx) => ({
        ...drop,
        dropNumber: idx + 1,
      }));
      const renumberedWeightDrops = updatedWeightDrops.map((drop, idx) => ({
        ...drop,
        dropNumber: idx + 1,
      }));
      setDropsetData({
        ...dropsetData,
        repsDrops: renumberedRepsDrops,
        weightDrops: renumberedWeightDrops,
      });
    }
  };

  // Dropsets are now saved live as the user types; no explicit Save button needed

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    handler: (value: string) => void
  ) => {
    const value = e.target.value;
    // Allow empty, numbers, and single decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      handler(value);
    }
  };

  const handleAddSet = () => {
    if (isSingleSetOnly) return; // Don't allow adding sets for AMRAP/Timed sections

    if (exercise.exerciseType === 'distance_duration') {
      setSets((prev) => [
        ...prev,
        {
          setNumber: prev.length + 1,
          type: 'normal',
          reps: '',
          weight: '',
          rest: '90',
          distance: '',
          duration: '',
        },
      ]);
    } else {
      setSets((prev) => [
        ...prev,
        { setNumber: prev.length + 1, type: 'normal', reps: '12', weight: '', rest: '90' },
      ]);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col gap-3 p-3 bg-background border',
        // Shape logic:
        // - standalone: fully rounded
        // - top of superset: rounded top only
        // - bottom of superset: rounded bottom only
        // - middle of larger chain (future-proof): square edges
        isLinkedToPrev && isLinkedToNext
          ? 'rounded-none border-y-0'
          : isLinkedToPrev
            ? 'rounded-b-lg rounded-t-none border-t-0'
            : isLinkedToNext
              ? 'rounded-t-lg rounded-b-none border-b-0'
              : 'rounded-lg'
      )}
    >
      {/* New Header */}
      <div className="flex items-center gap-1">
        {/* Thumbnail with hover play button */}
        {exercise.name && (
          <div
            className="relative w-9 h-9 flex-shrink-0 rounded cursor-pointer group/thumbnail"
            onClick={() => onVideoClick(exercise as Exercise)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onVideoClick(exercise as Exercise);
              }
            }}
            aria-label={`Play video for ${exercise.name}`}
          >
            <Image
              src={exercise.imageUrl || '/demo-img.png'}
              alt={exercise.name}
              fill
              className="object-cover rounded"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumbnail:bg-black/30 transition-colors rounded">
              <div className="opacity-0 group-hover/thumbnail:opacity-100 transition-opacity bg-black/60 rounded-full p-1">
                <Play className="size-2.5 text-white fill-white" />
              </div>
            </div>
          </div>
        )}

        {/* Exercise Select / Combobox */}
        <div className="flex-1 min-w-0">
          <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isSelectOpen}
                className="w-full justify-between h-9 text-sm font-normal"
              >
                <span className="truncate">{exercise.name || 'Choose an exercise...'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search exercises..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>No exercise found.</CommandEmpty>
                  <CommandGroup>
                    {searchResults.slice(0, 20).map((result) => (
                      <CommandItem
                        key={result.exerciseId}
                        value={result.name}
                        onSelect={() => {
                          handleExerciseSelect(result);
                        }}
                        className="flex items-center gap-2"
                      >
                        <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden">
                          <Image
                            src={result.imageUrl || '/demo-img.png'}
                            alt={result.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <span className="flex-1">{result.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 flex-shrink-0"
              aria-label="Exercise actions"
            >
              <Ellipsis className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canMoveUp && onMoveUp && (
              <DropdownMenuItem onClick={onMoveUp}>
                <ArrowUp className="size-4 mr-2" />
                Move up
              </DropdownMenuItem>
            )}
            {canMoveDown && onMoveDown && (
              <DropdownMenuItem onClick={onMoveDown}>
                <ArrowDown className="size-4 mr-2" />
                Move down
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                setIsAlternativesVisible(true);
              }}
            >
              <Plus className="size-4 mr-2" />
              Add alternative exercise
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Exercise Notes */}
      <div className="w-full relative">
        <Input
          placeholder="Notes"
          value={exercise.notes || ''}
          onChange={(e) => {
            onExerciseChange({
              ...exercise,
              notes: e.target.value,
            });
          }}
          className="w-full pr-8"
        />
        {exercise.notes && (
          <button
            type="button"
            onClick={() => {
              onExerciseChange({
                ...exercise,
                notes: '',
              });
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear notes"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {
        (exercise.exerciseType === 'weight_reps' ||
          exercise.exerciseType === 'reps' ||
          exercise.exerciseType === 'distance_duration') && (
          <div className="w-full border rounded-md overflow-hidden">
            <Table className="text-[11px] leading-tight">
              <TableHeader className="bg-transparent">
                <TableRow className="h-8">
                  <TableHead className="text-center h-8 py-1 px-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSet}
                      className="h-5 px-3 text-[11px] font-medium border"
                      aria-label="Add set"
                    >
                      Add set
                    </Button>
                  </TableHead>
                  <TableHead className="text-center h-8 py-1 px-2 w-[130px]">Type</TableHead>
                  {exercise.exerciseType === 'distance_duration' ? (
                    <>
                      <TableHead className="text-center h-8 py-1 px-2">Distance</TableHead>
                      <TableHead className="text-center h-8 py-1 px-2">Duration</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-center h-8 py-1 px-2">Reps</TableHead>
                      {exercise.exerciseType === 'weight_reps' && (
                        <TableHead className="text-center h-8 py-1 px-2">Weight</TableHead>
                      )}
                    </>
                  )}
                  <TableHead className="text-center h-8 py-1 px-2">Rest (s)</TableHead>
                  <TableHead className="w-[50px] h-8 py-1 px-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sets.map((set, index) => (
                  <TableRow key={index} className="h-10 bg-background">
                    <TableCell className="font-medium text-center py-1 px-2">{index + 1}</TableCell>
                    <TableCell className="py-1 px-2 w-[130px]">
                      <div className="flex justify-center">
                        <Select
                          value={set.type}
                          onValueChange={(value) =>
                            handleSetChange(index, 'type', value as SetData['type'])
                          }
                        >
                          <SelectTrigger
                            className="h-6 w-[120px] py-0 px-2 text-[11px] [&>span]:leading-tight"
                            style={{ minHeight: '24px', height: '24px' }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="warmUp">Warm up</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="failure">Failure</SelectItem>
                            {exercise.exerciseType === 'weight_reps' && (
                              <SelectItem value="dropset">Dropset</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    {exercise.exerciseType === 'distance_duration' ? (
                      <>
                        <TableCell className="py-1 px-2">
                          <div className="flex justify-center">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={set.distance || ''}
                              onChange={(e) =>
                                handleNumericInput(e, (value) =>
                                  handleSetChange(index, 'distance', value)
                                )
                              }
                              className={cn(
                                'h-6 w-[70px] text-center text-[11px]',
                                validationErrors?.[index]?.distance &&
                                'border-destructive focus-visible:ring-destructive'
                              )}
                              placeholder="-"
                              disabled={!!set.duration}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <div className="flex justify-center">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={set.duration || ''}
                              onChange={(e) =>
                                handleNumericInput(e, (value) =>
                                  handleSetChange(index, 'duration', value)
                                )
                              }
                              className={cn(
                                'h-6 w-[70px] text-center text-[11px]',
                                validationErrors?.[index]?.duration &&
                                'border-destructive focus-visible:ring-destructive'
                              )}
                              placeholder="-"
                              disabled={!!set.distance}
                            />
                          </div>
                        </TableCell>
                      </>
                    ) : set.type === 'dropset' && exercise.exerciseType === 'weight_reps' ? (
                      <>
                        <TableCell className="py-1 px-2">
                          <div className="flex justify-center">
                            <Popover
                              open={dropsetPopoverOpen === index}
                              onOpenChange={(open) => {
                                if (open) {
                                  handleDropsetInputClick(index);
                                } else {
                                  setDropsetPopoverOpen(null);
                                  setDropsetData(null);
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={cn(
                                    'h-6 text-center cursor-pointer border border-input bg-background rounded-md px-3 text-[11px] flex items-center justify-center',
                                    set.reps ? 'w-auto min-w-[70px]' : 'w-[70px]',
                                    validationErrors?.[index]?.reps &&
                                    'border-destructive focus-visible:ring-destructive'
                                  )}
                                >
                                  {set.reps || '-'}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <div className="flex flex-col gap-3 p-4">
                                  <div className="border rounded-lg overflow-hidden">
                                    <Table className="text-[11px] leading-tight">
                                      <TableHeader>
                                        <TableRow className="h-8">
                                          <TableHead className="text-center h-8 py-1 px-2">
                                            Drop
                                          </TableHead>
                                          <TableHead className="text-center h-8 py-1 px-2">
                                            Reps
                                          </TableHead>
                                          <TableHead className="text-center h-8 py-1 px-2">
                                            Weight
                                          </TableHead>
                                          <TableHead className="w-[50px] h-8 py-1 px-2"></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {dropsetData?.setIndex === index &&
                                          dropsetData.repsDrops.map((drop, dropIndex) => (
                                            <TableRow key={dropIndex} className="h-10 bg-background">
                                              <TableCell className="font-medium text-center py-1 px-2">
                                                {drop.dropNumber}
                                              </TableCell>
                                              <TableCell className="py-1 px-2">
                                                <div className="flex justify-center">
                                                  <Input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={drop.value}
                                                    onChange={(e) =>
                                                      handleNumericInput(e, (value) =>
                                                        handleDropsetValueChange(
                                                          dropIndex,
                                                          'reps',
                                                          value
                                                        )
                                                      )
                                                    }
                                                    className="h-6 w-[70px] text-center text-[11px]"
                                                    placeholder="-"
                                                  />
                                                </div>
                                              </TableCell>
                                              <TableCell className="py-1 px-2">
                                                <div className="flex justify-center">
                                                  <Input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={
                                                      dropsetData.weightDrops[dropIndex]?.value || ''
                                                    }
                                                    onChange={(e) =>
                                                      handleNumericInput(e, (value) =>
                                                        handleDropsetValueChange(
                                                          dropIndex,
                                                          'weight',
                                                          value
                                                        )
                                                      )
                                                    }
                                                    className="h-6 w-[70px] text-center text-[11px]"
                                                    placeholder="-"
                                                  />
                                                </div>
                                              </TableCell>
                                              <TableCell className="w-[50px] py-1 px-2">
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-6 w-6 text-[11px] text-muted-foreground hover:text-destructive"
                                                  onClick={() => handleRemoveDrop(dropIndex)}
                                                  aria-label={`Remove drop ${drop.dropNumber}`}
                                                >
                                                  <X className="h-3.5 w-3.5" />
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        <TableRow className="h-8 bg-background">
                                          <TableCell colSpan={4} className="text-center py-1 px-2">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={handleAddDrop}
                                              className="mx-auto text-[11px] h-6"
                                            >
                                              Add drop
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableCell>
                        <TableCell className="py-1 px-2">
                          <div className="flex justify-center">
                            <button
                              type="button"
                              className={cn(
                                'h-6 text-center cursor-pointer border border-input bg-background rounded-md px-3 text-[11px] flex items-center justify-center',
                                set.weight ? 'w-auto min-w-[70px]' : 'w-[70px]',
                                validationErrors?.[index]?.weight &&
                                'border-destructive focus-visible:ring-destructive'
                              )}
                              onClick={() => {
                                if (dropsetPopoverOpen !== index) {
                                  handleDropsetInputClick(index);
                                }
                              }}
                            >
                              {set.weight || '-'}
                            </button>
                          </div>
                        </TableCell>
                      </>
                    ) : set.type === 'failure' &&
                      (exercise.exerciseType === 'reps' ||
                        exercise.exerciseType === 'weight_reps') ? (
                      <>
                        <TableCell className="py-1 px-2">
                          <div className="flex justify-center">
                            <span className="text-xs text-muted-foreground">To failure</span>
                          </div>
                        </TableCell>
                        {exercise.exerciseType === 'weight_reps' && (
                          <TableCell className="py-1 px-2">
                            <div className="flex justify-center">
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={set.weight}
                                onChange={(e) =>
                                  handleNumericInput(e, (value) =>
                                    handleSetChange(index, 'weight', value)
                                  )
                                }
                                className={cn(
                                  'h-6 w-[70px] text-center text-[11px]',
                                  validationErrors?.[index]?.weight &&
                                  'border-destructive focus-visible:ring-destructive'
                                )}
                                placeholder="-"
                              />
                            </div>
                          </TableCell>
                        )}
                      </>
                    ) : (
                      <>
                        <TableCell className="py-1 px-2">
                          <div className="flex justify-center">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={set.reps}
                              onChange={(e) =>
                                handleNumericInput(e, (value) =>
                                  handleSetChange(index, 'reps', value)
                                )
                              }
                              className={cn(
                                'h-6 w-[70px] text-center text-[11px]',
                                validationErrors?.[index]?.reps &&
                                'border-destructive focus-visible:ring-destructive'
                              )}
                              placeholder="-"
                            />
                          </div>
                        </TableCell>
                        {exercise.exerciseType === 'weight_reps' && (
                          <TableCell className="py-1 px-2">
                            <div className="flex justify-center">
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={set.weight}
                                onChange={(e) =>
                                  handleNumericInput(e, (value) =>
                                    handleSetChange(index, 'weight', value)
                                  )
                                }
                                className={cn(
                                  'h-6 w-[70px] text-center text-[11px]',
                                  validationErrors?.[index]?.weight &&
                                  'border-destructive focus-visible:ring-destructive'
                                )}
                                placeholder="-"
                              />
                            </div>
                          </TableCell>
                        )}
                      </>
                    )}
                    <TableCell className="py-1 px-2">
                      <div className="flex justify-center">
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={set.rest}
                          onChange={(e) =>
                            handleNumericInput(e, (value) => handleSetChange(index, 'rest', value))
                          }
                          className={cn(
                            'h-6 w-[70px] text-center text-[11px]',
                            validationErrors?.[index]?.rest &&
                            'border-destructive focus-visible:ring-destructive'
                          )}
                          placeholder="1"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-[11px] text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setSets((prev) => prev.filter((_, i) => i !== index));
                        }}
                        aria-label={`Remove set ${index + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      }

      {/* Alternative Exercises Multi-Select */}
      {isAlternativesVisible && (
        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">
              Alternative Exercises
            </span>
          </div>
          <MultiAsyncSelect
            async
            placeholder="Search for alternative exercises..."
            options={alternativeSearchResults.map((e) => ({
              label: e.name,
              value: e.exerciseId,
              imageUrl: e.imageUrl,
            }))}
            value={exercise.alternatives || []}
            onValueChange={handleAlternativesChange}
            onSearch={handleAlternativesSearch}
            renderPill={renderExercisePill}
            labelFunc={(option) => (
              <div className="flex items-center gap-2">
                <div className="relative w-7 h-7 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={option.imageUrl || '/demo-img.png'}
                    alt={option.label}
                    fill
                    className="object-cover"
                  />
                </div>
                <span>{option.label}</span>
              </div>
            )}
            className="w-full bg-transparent border-input h-9 shadow-none"
            maxCount={10}
          />
        </div>
      )}

      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent
          className="w-full max-w-[60vw] sm:max-w-[60vw] max-h-[85vh] flex flex-col overflow-y-auto"
          showCloseButton={false}
        >
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-left">{exercise.name} Information</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-6">
            <div className="flex gap-6">
              <div className="w-3/5 flex-shrink-0">
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  {exercise.videoUrl ? (
                    <video src={exercise.videoUrl} controls className="w-full h-full">
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                      No video available
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">Target Muscles</h3>
                  <div className="flex flex-wrap gap-2">
                    {(exercise.targetMuscles || []).map((muscle) => (
                      <Badge key={muscle} variant="outline">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">Secondary Muscles</h3>
                  <div className="flex flex-wrap gap-2">
                    {(exercise.secondaryMuscles || []).map((muscle) => (
                      <Badge key={muscle} variant="outline">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-6 w-full">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Instructions</h3>
                <Textarea
                  readOnly
                  value={(exercise.instructions || []).join('\n\n')}
                  className="min-h-[120px] resize-none w-full select-none pointer-events-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Exercise Tips</h3>
                <Textarea
                  readOnly
                  value={(exercise.exerciseTips || []).join('\n\n')}
                  className="min-h-[120px] resize-none w-full select-none pointer-events-none"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
