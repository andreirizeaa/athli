'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Ellipsis, Play, Plus, Trash2, X, Heart, Activity, Timer, Info } from 'lucide-react';
import { Exercise, searchExercises } from '@/api/exercise/exercise-search';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OPTIONAL_COLUMN_OPTIONS, HEART_RATE_ZONE_OPTIONS, COLUMN_OPTIONS } from '@/lib/constants/training';
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
const TempoInput = ({ value, onChange, hasError }: { value?: string; onChange: (val: string) => void; hasError?: boolean; }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Parse value into 4 distinct chars
  const parts = useMemo(() => {
    // Value format "3-1-2-0"
    const parsed = (value || '').split('-').filter(p => p !== '');
    // Ensure 4 slots
    const slots = ['', '', '', ''];
    parsed.forEach((p, i) => { if (i < 4) slots[i] = p; });
    return slots;
  }, [value]);

  const handleChange = (index: number, val: string) => {
    // Allows 0-9 only, single char
    // If user types a digit into a filled slot, we take the last char (overwrite)
    if (!/^\d*$/.test(val)) return;

    // Take the last char typed
    const char = val.slice(-1);

    const newParts = [...parts];
    newParts[index] = char;
    onChange(newParts.join('-'));

    // Focus next if char entered and not last input
    if (char && index < 3) {
      // Use requestAnimationFrame to ensure render cycle doesn't eat the focus
      requestAnimationFrame(() => {
        inputs.current[index + 1]?.focus();
      });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!parts[index] && index > 0) {
        // If current is empty and backspace pressed, clear previous and focus it
        e.preventDefault();
        const newParts = [...parts];
        newParts[index - 1] = '';
        onChange(newParts.join('-'));
        requestAnimationFrame(() => {
          inputs.current[index - 1]?.focus();
        });
      } else if (parts[index]) {
        // If current is filled, backspace clears it (default behavior).
        // We do not preventDefault here so the input clears.
        // We do NOT move focus back, so user can type new value here.
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select text on focus to allow easy overwrite
    inputs.current[index]?.select();
  };

  return (
    <div
      className={cn(
        "flex items-center border rounded-md h-7 px-1 bg-background w-[100px] justify-between cursor-text",
        hasError ? "border-destructive" : "border-input"
      )}
      onClick={() => {
        // Focus the first empty slot or the last slot
        const firstEmpty = parts.findIndex(p => p === '');
        const target = firstEmpty === -1 ? 3 : firstEmpty;
        inputs.current[target]?.focus();
      }}
    >
      {[0, 1, 2, 3].map((idx) => (
        <div key={idx} className="flex items-center">
          <input
            ref={(el) => { inputs.current[idx] = el; }}
            value={parts[idx]}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onFocus={() => handleFocus(idx)}
            // Stop propagation to prevent parent onClick stealing focus
            onClick={(e) => e.stopPropagation()}
            className="w-4 p-0 text-center border-none focus:ring-0 h-full text-xs placeholder:text-muted-foreground/50 bg-transparent outline-none cursor-text p-0 m-0"
            placeholder="X"
            autoComplete="off"
          />
          {idx < 3 && <span className="text-muted-foreground select-none pointer-events-none text-[10px] mx-0.5">-</span>}
        </div>
      ))}
    </div>
  );
};
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Editable cell component for clean grid appearance
const EditableCell = ({
  value,
  onChange,
  placeholder = '-',
  hasError = false,
  className = '',
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
  disabled?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    onChange(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      onChange(localValue);
    } else if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  const handleNumericInput = (val: string) => {
    // Allow empty, numbers, decimals, hyphens (for ranges), and spaces
    if (val === '' || (/^[\d\.\-\s]*$/.test(val) && (val.match(/-/g) || []).length <= 1)) {
      setLocalValue(val);
    }
  };

  if (isEditing && !disabled) {
    return (
      <div className="w-full h-10 ring-2 ring-inset ring-primary flex items-center justify-center">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={localValue}
          onChange={(e) => handleNumericInput(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full h-full text-center text-sm bg-transparent border-0 outline-none focus:ring-0 px-2',
            hasError && 'text-destructive',
            className
          )}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={cn(
        'w-full h-10 flex items-center justify-center text-sm px-2 transition-all',
        !disabled && 'cursor-text hover:ring-2 hover:ring-inset hover:ring-primary hover:bg-transparent',
        disabled && 'cursor-default opacity-50 text-muted-foreground',
        hasError && 'text-destructive ring-2 ring-inset ring-destructive',
        !value && !disabled && 'text-muted-foreground',
        className
      )}
    >
      {disabled ? '' : (value || placeholder)}
    </div>
  );
};

// Select cell component for set type with clean grid appearance
const SelectCell = ({
  value,
  onChange,
  options,
  displayValue,
  placeholder = '-',
  disabled = false,
  hasError = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  displayValue: string;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Select value={value} onValueChange={onChange} open={isOpen} onOpenChange={setIsOpen} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "h-full w-full border-0 shadow-none text-sm focus:ring-0 px-2 bg-transparent text-center transition-all",
          !disabled && "hover:ring-2 hover:ring-inset hover:ring-primary hover:bg-transparent",
          isOpen && "ring-2 ring-inset ring-primary",
          disabled && "opacity-50 cursor-default",
          hasError && "ring-2 ring-inset ring-destructive"
        )}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <SelectValue placeholder={disabled ? '' : placeholder}>{value ? displayValue : null}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Tempo cell component that renders like a normal editable cell with 4-digit input
const TempoCellInput = ({ value, onChange, hasError = false }: { value?: string; onChange: (val: string) => void; hasError?: boolean; }) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  // Parse value into 4 distinct chars
  const parts = useMemo(() => {
    // Value format "3-1-2-0"
    const parsed = (value || '').split('-').filter(p => p !== '');
    // Ensure 4 slots
    const slots = ['', '', '', ''];
    parsed.forEach((p, i) => { if (i < 4) slots[i] = p; });
    return slots;
  }, [value]);

  const handleChange = (index: number, val: string) => {
    // Allows 0-9 only, single char
    if (!/^\d*$/.test(val)) return;

    // Take the last char typed
    const char = val.slice(-1);

    const newParts = [...parts];
    newParts[index] = char;
    onChange(newParts.join('-'));

    // Focus next if char entered and not last input
    if (char && index < 3) {
      requestAnimationFrame(() => {
        inputs.current[index + 1]?.focus();
      });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!parts[index] && index > 0) {
        e.preventDefault();
        const newParts = [...parts];
        newParts[index - 1] = '';
        onChange(newParts.join('-'));
        requestAnimationFrame(() => {
          inputs.current[index - 1]?.focus();
        });
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    setIsFocused(true);
    inputs.current[index]?.select();
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center w-full h-10 cursor-text",
        isFocused && "ring-2 ring-inset ring-primary",
        hasError && !isFocused && "ring-2 ring-inset ring-destructive"
      )}
      onClick={() => {
        const firstEmpty = parts.findIndex(p => p === '');
        const target = firstEmpty === -1 ? 3 : firstEmpty;
        inputs.current[target]?.focus();
      }}
    >
      {[0, 1, 2, 3].map((idx) => (
        <div key={idx} className="flex items-center">
          <input
            ref={(el) => { inputs.current[idx] = el; }}
            value={parts[idx]}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onFocus={() => handleFocus(idx)}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            className="w-3 p-0 text-center border-none focus:ring-0 h-full text-sm placeholder:text-muted-foreground/50 bg-transparent outline-none cursor-text"
            placeholder="X"
            autoComplete="off"
          />
          {idx < 3 && <span className="text-muted-foreground select-none pointer-events-none text-xs mx-0.5">-</span>}
        </div>
      ))}
    </div>
  );
};

// Optional cell component that renders different inputs based on the column type
const OptionalCell = ({
  columnType,
  value,
  onChange,
  hasError = false,
}: {
  columnType: string;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}) => {
  if (columnType === 'Tempo') {
    return (
      <TempoCellInput
        value={value}
        onChange={onChange}
        hasError={hasError}
      />
    );
  }

  if (columnType === 'RPE') {
    return (
      <SelectCell
        value={value}
        onChange={onChange}
        options={[
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5' },
          { value: '6', label: '6' },
          { value: '7', label: '7' },
          { value: '8', label: '8' },
          { value: '9', label: '9' },
          { value: '10', label: '10' },
        ]}
        displayValue={value || '-'}
        hasError={hasError}
      />
    );
  }

  if (columnType === 'RIR') {
    return (
      <SelectCell
        value={value}
        onChange={onChange}
        options={[
          { value: '0', label: '0' },
          { value: '1', label: '1' },
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
          { value: '5', label: '5' },
        ]}
        displayValue={value || '-'}
        hasError={hasError}
      />
    );
  }

  if (columnType === 'Heart Rate Zone') {
    // Create a shorter display value - "Zone 1" instead of "Z1: 50-60% of max HR"
    const getZoneDisplayValue = (val: string) => {
      if (!val) return '';
      const match = val.match(/^Z(\d)/);
      return match ? `Zone ${match[1]}` : val;
    };

    return (
      <SelectCell
        value={value}
        onChange={onChange}
        options={HEART_RATE_ZONE_OPTIONS as unknown as { value: string; label: string }[]}
        displayValue={getZoneDisplayValue(value)}
        placeholder="Zone..."
        hasError={hasError}
      />
    );
  }

  // Default case: "Optional" or other text inputs
  const isDisabled = columnType === 'Optional';

  return (
    <EditableCell
      value={value}
      onChange={onChange}
      placeholder={isDisabled ? '' : '-'}
      disabled={isDisabled}
      hasError={hasError}
    />
  );
};

export type SetData = {
  setNumber: number;
  type: 'warmUp' | 'normal' | 'failure' | 'dropset';
  reps: string;
  weight: string;
  rest: string;
  distance?: string;
  duration?: string;
  other?: string;       // Optional field 1 for distance_duration exercises
  other2?: string;      // Optional field 2 for distance_duration exercises
  leftReps?: string;    // Left side reps for unilateral exercises
  rightReps?: string;   // Right side reps for unilateral exercises
  leftWeight?: string;
  rightWeight?: string;
  optional?: { prescribed?: string; completed?: string };    // Optional field for weight_reps/reps exercises (tempo, RIR, RPE, notes)
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
  eachSide?: boolean;       // Exercise-level each side toggle
  tempo?: string;           // Exercise-level tempo (x-x-x-x format)
  optionalColumnType?: 'Optional' | 'Tempo' | 'RIR' | 'RPE' | 'Heart Rate Zone' | 'Calories' | 'Watts' | 'Pace' | 'Speed' | 'Incline' | 'Height' | 'RPM';
  column1Label?: string;    // Column 1 label (Reps, Weight, Distance, etc.)
  column2Label?: string;    // Column 2 label (Reps, Weight, Duration, etc.)
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
  hasSupersetError?: boolean;
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
  hasSupersetError = false,
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
      if (exercise.exerciseType === 'distance_duration') {
        return [{ setNumber: 1, type: 'normal', reps: '', weight: '', rest: '90', distance: '', duration: '', other: '' }];
      }
      return [{ setNumber: 1, type: 'normal', reps: '12', weight: '', rest: '90' }];
    }

    if (exercise.exerciseType === 'distance_duration') {
      return [
        { setNumber: 1, type: 'normal', reps: '', weight: '', rest: '90', distance: '', duration: '', other: '' },
        { setNumber: 2, type: 'normal', reps: '', weight: '', rest: '90', distance: '', duration: '', other: '' },
        { setNumber: 3, type: 'normal', reps: '', weight: '', rest: '90', distance: '', duration: '', other: '' },
      ];
    }

    return [
      { setNumber: 1, type: 'normal', reps: '12', weight: '', rest: '90' },
      { setNumber: 2, type: 'normal', reps: '12', weight: '', rest: '90' },
      { setNumber: 3, type: 'normal', reps: '12', weight: '', rest: '90' },
    ];
  });
  const [dropsetPopoverOpen, setDropsetPopoverOpen] = useState<string | null>(null);
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
    field: 'reps' | 'leftReps' | 'rightReps';
    repsDrops: DropsetData[];
    weightDrops: DropsetData[];
  } | null>(null);
  
  // Initialize column labels based on exercise type (with default units)
  const getDefaultColumnLabels = (exerciseType: string) => {
    if (exerciseType === 'weight_reps') {
      return { column1: 'Reps', column2: 'kg' };
    } else if (exerciseType === 'reps') {
      return { column1: 'Reps', column2: 'None' };
    } else if (exerciseType === 'distance_duration') {
      return { column1: 'km', column2: 'minutes' };
    }
    return { column1: 'Reps', column2: 'None' };
  };

  const [column1Label, setColumn1Label] = useState<string>(() => {
    const stored = (exercise as any).column1Label;
    return stored || getDefaultColumnLabels(exercise.exerciseType).column1;
  });

  const [column2Label, setColumn2Label] = useState<string>(() => {
    const stored = (exercise as any).column2Label;
    return stored || getDefaultColumnLabels(exercise.exerciseType).column2;
  });

  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);


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
            other: '',
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
            other: '',
          },
          {
            setNumber: 2,
            type: 'normal',
            reps: '',
            weight: '',
            rest: '90',
            distance: '',
            duration: '',
            other: '',
          },
          {
            setNumber: 3,
            type: 'normal',
            reps: '',
            weight: '',
            rest: '90',
            distance: '',
            duration: '',
            other: '',
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
    
    // Reset column labels based on new exercise type
    const defaultLabels = getDefaultColumnLabels(selectedExercise.exerciseType);
    setColumn1Label(defaultLabels.column1);
    setColumn2Label(defaultLabels.column2);
    
    onExerciseChange({
      ...exercise,
      ...selectedExercise,
      sets: nextSets,
      alternatives: [],
      column1Label: defaultLabels.column1,
      column2Label: defaultLabels.column2,
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

  // Helper to map column label to field name
  const getFieldName = (columnLabel: string): 'reps' | 'weight' | 'distance' | 'duration' | 'optional' | null => {
    if (columnLabel === 'Reps') return 'reps';
    if (columnLabel === 'kg' || columnLabel === 'lbs') return 'weight';
    if (columnLabel === 'km' || columnLabel === 'm' || columnLabel === 'yards' || columnLabel === 'miles' || columnLabel === 'feet') return 'distance';
    if (columnLabel === 'minutes' || columnLabel === 'seconds') return 'duration';
    if (columnLabel === 'None') return null;
    // For optional columns (Tempo, RIR, RPE, etc.)
    return 'optional';
  };

  const clearColumnValues = (columnLabel: string) => {
    const fieldName = getFieldName(columnLabel);
    if (!fieldName) return; // None has no field to clear

    const updated = sets.map(set => {
      const newSet = { ...set };
      if (fieldName === 'reps') {
        newSet.reps = '';
      } else if (fieldName === 'weight') {
        newSet.weight = '';
      } else if (fieldName === 'distance') {
        newSet.distance = '';
      } else if (fieldName === 'duration') {
        newSet.duration = '';
      } else if (fieldName === 'optional') {
        if (newSet.optional) {
          newSet.optional = { ...newSet.optional, prescribed: '' };
        }
      }
      return newSet;
    });
    setSets(updated);
    onExerciseChange({
      ...exercise,
      sets: updated,
      alternatives: exercise.alternatives || [],
    });
  };

  // Helper to get field value based on column label
  const getFieldValue = (set: SetData, columnLabel: string): string => {
    const fieldName = getFieldName(columnLabel);
    if (!fieldName) return ''; // None
    if (fieldName === 'reps') return set.reps || '';
    if (fieldName === 'weight') return set.weight || '';
    if (fieldName === 'distance') return set.distance || '';
    if (fieldName === 'duration') return set.duration || '';
    if (fieldName === 'optional') return set.optional?.prescribed || '';
    return '';
  };

  // Helper to update field value based on column label
  const updateFieldValue = (setIndex: number, columnLabel: string, value: string) => {
    const fieldName = getFieldName(columnLabel);
    if (!fieldName) return; // None has no field to update

    const updated = [...sets];
    const currentSet = updated[setIndex];

    if (fieldName === 'reps') {
      updated[setIndex] = { ...currentSet, reps: value };
    } else if (fieldName === 'weight') {
      updated[setIndex] = { ...currentSet, weight: value };
    } else if (fieldName === 'distance') {
      updated[setIndex] = { ...currentSet, distance: value };
    } else if (fieldName === 'duration') {
      updated[setIndex] = { ...currentSet, duration: value };
    } else if (fieldName === 'optional') {
      updated[setIndex] = {
        ...currentSet,
        optional: {
          ...currentSet.optional,
          prescribed: value,
        },
      };
    }

    setSets(updated);
    onExerciseChange({
      ...exercise,
      sets: updated,
      alternatives: exercise.alternatives || [],
    });
  };

  const handleSetChange = (index: number, field: keyof SetData, value: string) => {
    // Build updated sets from current state (safe in event handler)
    const updated = [...sets];
    const currentSet = updated[index];

    if (field === 'optional') {
      updated[index] = {
        ...currentSet,
        optional: {
          ...currentSet.optional,
          prescribed: value
        }
      };
      setSets(updated);
      return;
    }

    // If changing to dropset, clear reps and weight defaults
    // If switching from dropset to normal, keep the first drop value
    if (field === 'type' && value === 'normal' && currentSet.type === 'dropset') {
      const getFirstValue = (val: string | undefined): string => {
        if (!val) return '';
        if (val.includes('-')) return val.split('-')[0].trim();
        return val;
      };

      updated[index] = {
        ...currentSet,
        type: 'normal',
        reps: getFirstValue(currentSet.reps),
        weight: getFirstValue(currentSet.weight),
        // Also handle eachSide properties if they exist
        leftReps: getFirstValue(currentSet.leftReps),
        rightReps: getFirstValue(currentSet.rightReps),
        leftWeight: getFirstValue(currentSet.leftWeight),
        rightWeight: getFirstValue(currentSet.rightWeight),
      };
    } else if (field === 'type' && value === 'dropset') {
      updated[index] = { ...currentSet, type: 'dropset', reps: '', weight: '' };
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

  const handleDropsetInputClick = (
    setIndex: number,
    field: 'reps' | 'leftReps' | 'rightReps',
    triggerId: string
  ) => {
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

      const repsValue = set[field] || '';
      // Determine which weight field to use based on the reps field
      let weightValue = '';
      if (field === 'leftReps') {
        weightValue = set.leftWeight || '';
      } else if (field === 'rightReps') {
        weightValue = set.rightWeight || '';
      } else {
        weightValue = set.weight;
      }

      const repsDrops = parseDrops(repsValue);
      const weightDrops = parseDrops(weightValue);

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
        field,
        repsDrops: normalizedRepsDrops,
        weightDrops: normalizedWeightDrops,
      });
      setDropsetPopoverOpen(triggerId);
    }
  };

  const handleDropsetValueChange = (dropIndex: number, type: 'reps' | 'weight', value: string) => {
    if (!dropsetData) return;

    const nextDropsetData = {
      ...dropsetData,
      repsDrops:
        type === 'reps'
          ? dropsetData.repsDrops.map((drop, idx) =>
            idx === dropIndex ? { ...drop, value } : drop
          )
          : dropsetData.repsDrops,
      weightDrops:
        type === 'weight'
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

    // Determine target weight field
    let weightField = 'weight';
    if (dropsetData.field === 'leftReps') weightField = 'leftWeight';
    else if (dropsetData.field === 'rightReps') weightField = 'rightWeight';

    updated[nextDropsetData.setIndex] = {
      ...updated[nextDropsetData.setIndex],
      [dropsetData.field]: formattedReps, // Update specific field (reps, leftReps, or rightReps)
      [weightField]: formattedWeight,
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

      // Recalculate and update parent set
      const formattedReps = renumberedRepsDrops
        .map((drop) => drop.value.trim())
        .filter((val) => val !== '')
        .join('-');

      const formattedWeight = renumberedWeightDrops
        .map((drop) => drop.value.trim())
        .filter((val) => val !== '')
        .join('-');

      const updated = [...sets];

      // Determine target weight field
      let weightField = 'weight';
      if (dropsetData.field === 'leftReps') weightField = 'leftWeight';
      else if (dropsetData.field === 'rightReps') weightField = 'rightWeight';

      updated[dropsetData.setIndex] = {
        ...updated[dropsetData.setIndex],
        [dropsetData.field]: formattedReps,
        [weightField]: formattedWeight,
      };

      setSets(updated);

      onExerciseChange({
        ...exercise,
        sets: updated,
        alternatives: exercise.alternatives || [],
      });
    }
  };

  // Dropsets are now saved live as the user types; no explicit Save button needed

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    handler: (value: string) => void
  ) => {
    const value = e.target.value;
    // Allow empty, numbers, decimals, hyphens (for ranges), and spaces
    // But strictly limit to at most one hyphen for ranges (e.g., 8-12)
    if (value === '' || (/^[\d\.\-\s]*$/.test(value) && (value.match(/-/g) || []).length <= 1)) {
      handler(value);
    }
  };

  // Helper to render a column cell based on column label
  const renderColumnCell = (set: SetData, setIndex: number, columnLabel: string) => {
    // Handle "None" column
    if (columnLabel === 'None') {
      return (
        <TableCell className="py-0 px-0 text-center" key={`${setIndex}-none`}>
          <div className="w-full h-10 flex items-center justify-center text-sm text-muted-foreground">-</div>
        </TableCell>
      );
    }

    // Handle dropset for Reps or Weight (kg/lbs) column in weight_reps exercises
    // Both columns open the same popover (which shows both reps and weight)
    const isWeightColumn = columnLabel === 'kg' || columnLabel === 'lbs';
    if (
      (columnLabel === 'Reps' || isWeightColumn) &&
      set.type === 'dropset' &&
      exercise.exerciseType === 'weight_reps'
    ) {
      const triggerId = `${setIndex}-reps`;
      const displayValue = columnLabel === 'Reps' ? (set.reps || '-') : (set.weight || '-');
      const hasError = columnLabel === 'Reps' 
        ? validationErrors?.[setIndex]?.reps 
        : validationErrors?.[setIndex]?.weight;
      return (
        <TableCell className="py-1 px-2" key={`${setIndex}-${columnLabel}-dropset`}>
          <div className="flex justify-center">
            <Popover
              open={dropsetPopoverOpen === triggerId}
              onOpenChange={(open) => {
                if (open) {
                  handleDropsetInputClick(setIndex, 'reps', triggerId);
                } else {
                  setDropsetPopoverOpen(null);
                  setDropsetData(null);
                }
              }}
            >
              <PopoverTrigger asChild>
                <div
                  onClick={() => handleDropsetInputClick(setIndex, 'reps', triggerId)}
                  className={cn(
                    'w-full h-10 flex items-center justify-center text-sm cursor-text px-2 transition-all',
                    'hover:ring-2 hover:ring-inset hover:ring-primary hover:bg-transparent',
                    dropsetPopoverOpen === triggerId && 'ring-2 ring-inset ring-primary',
                    hasError && 'text-destructive ring-2 ring-inset ring-destructive',
                    !displayValue || displayValue === '-' ? 'text-muted-foreground' : ''
                  )}
                >
                  {displayValue}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1" align="start">
                {dropsetData && dropsetData.setIndex === setIndex && dropsetData.field === 'reps' && (
                  <div className="flex flex-col gap-3 p-1">
                    <div className="rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 h-8 hover:bg-muted/50 border-none">
                            <TableHead className="h-8 py-1 px-2 w-[40px] text-center font-medium border-0">Drop</TableHead>
                            <TableHead className="h-8 py-1 px-2 text-center font-medium w-[70px] border-0">Reps</TableHead>
                            <TableHead className="h-8 py-1 px-2 text-center font-medium w-[70px] border-0">Weight</TableHead>
                            <TableHead className="h-8 py-1 px-2 w-[30px] border-0"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dropsetData.repsDrops.map((drop, dropIdx) => (
                            <TableRow key={dropIdx} className="h-9 border-none">
                              <TableCell className="py-0 px-0 h-9 text-center text-muted-foreground font-medium w-[40px] border-0">
                                {drop.dropNumber}
                              </TableCell>
                              <TableCell className="py-0 px-0 h-9 w-[70px]">
                                <Input
                                  value={drop.value}
                                  onChange={(e) => handleNumericInput(e, (val) => handleDropsetValueChange(dropIdx, 'reps', val))}
                                  className="w-full h-full border-0 focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset rounded-none bg-transparent hover:bg-muted/50 text-center text-[11px] p-0"
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="py-0 px-0 h-9 w-[70px]">
                                <Input
                                  value={dropsetData.weightDrops[dropIdx]?.value || ''}
                                  onChange={(e) => handleNumericInput(e, (val) => handleDropsetValueChange(dropIdx, 'weight', val))}
                                  className="w-full h-full border-0 focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset rounded-none bg-transparent hover:bg-muted/50 text-center text-[11px] p-0"
                                  placeholder="-"
                                />
                              </TableCell>
                              <TableCell className="py-0 px-0 h-9 w-[30px]">
                                <div className="flex items-center justify-center h-full">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDrop(dropIdx)}
                                    className="text-muted-foreground hover:text-destructive flex items-center justify-center h-6 w-6 rounded-md hover:bg-muted/50"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAddDrop} className="w-full h-7 text-xs">
                      Add drop
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </TableCell>
      );
    }

    // Handle failure type
    if (set.type === 'failure' && columnLabel === 'Reps') {
      return (
        <TableCell className="py-0 px-0 text-center" key={`${setIndex}-failure`}>
          <div className="w-full h-10 flex items-center justify-center text-xs text-muted-foreground">
            To failure
          </div>
        </TableCell>
      );
    }

    // Get the value for this column
    const value = getFieldValue(set, columnLabel);
    const fieldName = getFieldName(columnLabel);
    const hasError = 
      (fieldName === 'reps' && validationErrors?.[setIndex]?.reps) ||
      (fieldName === 'weight' && validationErrors?.[setIndex]?.weight) ||
      (fieldName === 'distance' && validationErrors?.[setIndex]?.distance) ||
      (fieldName === 'duration' && validationErrors?.[setIndex]?.duration);

    // Render based on column type
    if (columnLabel === 'Heart Rate Zone') {
      return (
        <TableCell className="py-0 px-0 text-center" key={`${setIndex}-${columnLabel}`}>
          <SelectCell
            value={value}
            onChange={(newValue) => updateFieldValue(setIndex, columnLabel, newValue)}
            options={HEART_RATE_ZONE_OPTIONS as unknown as { value: string; label: string }[]}
            displayValue={value ? value.match(/^Z(\d)/)?.[0] ? `Zone ${value.match(/^Z(\d)/)?.[1]}` : value : ''}
            placeholder="Zone..."
            hasError={hasError}
          />
        </TableCell>
      );
    }

    // Use OptionalCell for optional columns (Tempo, RIR, RPE, etc.)
    if (OPTIONAL_COLUMN_OPTIONS.some(opt => opt.value === columnLabel)) {
      return (
        <TableCell className="py-0 px-0 text-center" key={`${setIndex}-${columnLabel}`}>
          <OptionalCell
            columnType={columnLabel}
            value={value}
            onChange={(newValue) => updateFieldValue(setIndex, columnLabel, newValue)}
            hasError={hasError}
          />
        </TableCell>
      );
    }

    // Default: EditableCell for Reps, Weight, Distance, Duration
    return (
      <TableCell className="py-0 px-0 text-center" key={`${setIndex}-${columnLabel}`}>
        <EditableCell
          value={value}
          onChange={(newValue) => updateFieldValue(setIndex, columnLabel, newValue)}
          hasError={hasError}
        />
      </TableCell>
    );
  };

  const handleAddSet = (insertAfterIndex?: number) => {
    if (isSingleSetOnly) return; // Don't allow adding sets for AMRAP/Timed sections

    const createNewSet = (): SetData => {
      if (exercise.exerciseType === 'distance_duration') {
        return {
          setNumber: 0, // Will be renumbered
          type: 'normal',
          reps: '',
          weight: '',
          rest: '90',
          distance: '',
          duration: '',
          other: '',
        };
      } else {
        return { setNumber: 0, type: 'normal', reps: '12', weight: '', rest: '90' };
      }
    };

    setSets((prev) => {
      const newSet = createNewSet();
      let updatedSets: SetData[];

      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prev.length) {
        // Insert after the specified index
        updatedSets = [
          ...prev.slice(0, insertAfterIndex + 1),
          newSet,
          ...prev.slice(insertAfterIndex + 1)
        ];
      } else {
        // Add at the end (default behavior)
        updatedSets = [...prev, newSet];
      }

      // Renumber all sets
      return updatedSets.map((set, idx) => ({ ...set, setNumber: idx + 1 }));
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col gap-3 p-3 bg-background',
        // Border color: red if superset error, otherwise default
        hasSupersetError ? 'border-2 border-destructive' : 'border',
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
            className="relative w-9 h-9 flex-shrink-0 rounded-md cursor-pointer group/thumbnail border border-input overflow-hidden"
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
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/thumbnail:bg-black/30 transition-colors">
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

      {/* Each Side Toggle with Tempo Input */}
      {(exercise.exerciseType === 'weight_reps' || exercise.exerciseType === 'reps') && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="each-side-toggle" className="text-sm font-normal cursor-pointer">
              Each side
            </Label>
            <Switch
              id="each-side-toggle"
              checked={exercise.eachSide || false}
              onCheckedChange={(checked) => {
                onExerciseChange({
                  ...exercise,
                  eachSide: checked,
                });
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-normal">TEMPO</Label>
            <TempoInput
              value={exercise.tempo || ''}
              onChange={(value) => {
                onExerciseChange({
                  ...exercise,
                  tempo: value,
                });
              }}
            />
          </div>
        </div>
      )}

      {
        (exercise.exerciseType === 'weight_reps' ||
          exercise.exerciseType === 'reps' ||
          exercise.exerciseType === 'distance_duration') && (
          <div className="w-full relative group/table">
            <div className="w-full border rounded-md overflow-hidden">
              <Table className="text-[11px] leading-tight w-full" style={{ tableLayout: 'fixed' }}>
                <TableHeader className="bg-transparent">
                  <TableRow className="h-8">
                    <TableHead className="text-center h-8 py-1 px-2 w-[70px] text-xs font-medium pl-1">Type</TableHead>
                    {/* Column 1 with dropdown */}
                        <TableHead className="text-center h-8 py-1 px-2 w-[120px]">
                          <div className="flex items-center justify-center gap-0.5">
                            <Select
                          value={column1Label}
                              onValueChange={(value) => {
                            clearColumnValues(column1Label);
                            setColumn1Label(value);
                            onExerciseChange({
                              ...exercise,
                              column1Label: value,
                              alternatives: exercise.alternatives || [],
                            });
                          }}
                        >
                          {column1Label === 'Heart Rate Zone' ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                              <SelectTrigger
                                className="h-6 min-h-0 py-0 w-full text-xs font-medium border-0 shadow-none hover:bg-muted/50 bg-transparent"
                                style={{ minHeight: '24px', height: '24px' }}
                              >
                                <SelectValue />
                              </SelectTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="flex flex-col gap-1 text-xs">
                                  <p>Z1 - Recovery</p>
                                  <p>Z2 - Endurance</p>
                                  <p>Z3 - Tempo</p>
                                  <p>Z4 - Threshold</p>
                                  <p>Z5 - Max</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                          ) : (
                              <SelectTrigger
                                className="h-6 min-h-0 py-0 w-full text-xs font-medium border-0 shadow-none hover:bg-muted/50 bg-transparent"
                                style={{ minHeight: '24px', height: '24px' }}
                              >
                                <SelectValue />
                              </SelectTrigger>
                          )}
                              <SelectContent className="max-h-[200px] overflow-y-auto">
                            {COLUMN_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                        {column1Label !== 'None' && (
                              <button
                                type="button"
                                onClick={() => {
                              clearColumnValues(column1Label);
                              const defaultLabels = getDefaultColumnLabels(exercise.exerciseType);
                              setColumn1Label(defaultLabels.column1);
                                  onExerciseChange({
                                    ...exercise,
                                column1Label: defaultLabels.column1,
                                    alternatives: exercise.alternatives || [],
                                  });
                                }}
                                className="p-0.5 hover:bg-muted rounded"
                            aria-label="Reset column"
                              >
                                <X className="size-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            )}
                          </div>
                        </TableHead>
                    {/* Column 2 with dropdown */}
                        <TableHead className="text-center h-8 py-1 px-2 w-[120px]">
                          <div className="flex items-center justify-center gap-0.5">
                            <Select
                          value={column2Label}
                              onValueChange={(value) => {
                            clearColumnValues(column2Label);
                            setColumn2Label(value);
                                onExerciseChange({
                                  ...exercise,
                              column2Label: value,
                                  alternatives: exercise.alternatives || [],
                                });
                              }}
                            >
                          {column2Label === 'Heart Rate Zone' ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <SelectTrigger
                                      className="h-6 min-h-0 py-0 w-full text-xs font-medium border-0 shadow-none hover:bg-muted/50 bg-transparent"
                                      style={{ minHeight: '24px', height: '24px' }}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="flex flex-col gap-1 text-xs">
                                      <p>Z1 - Recovery</p>
                                      <p>Z2 - Endurance</p>
                                      <p>Z3 - Tempo</p>
                                      <p>Z4 - Threshold</p>
                                      <p>Z5 - Max</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <SelectTrigger
                                  className="h-6 min-h-0 py-0 w-full text-xs font-medium border-0 shadow-none hover:bg-muted/50 bg-transparent"
                                  style={{ minHeight: '24px', height: '24px' }}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                              )}
                              <SelectContent className="max-h-[200px] overflow-y-auto">
                            {COLUMN_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                        {column2Label !== 'None' && (
                              <button
                                type="button"
                                onClick={() => {
                              clearColumnValues(column2Label);
                              const defaultLabels = getDefaultColumnLabels(exercise.exerciseType);
                              setColumn2Label(defaultLabels.column2);
                                  onExerciseChange({
                                    ...exercise,
                                column2Label: defaultLabels.column2,
                                    alternatives: exercise.alternatives || [],
                                  });
                                }}
                                className="p-0.5 hover:bg-muted rounded"
                            aria-label="Reset column"
                              >
                                <X className="size-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            )}
                          </div>
                        </TableHead>
                    <TableHead className="text-center h-8 py-1 px-2 w-[70px] text-xs font-medium">Rest</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sets.map((set, index) => (
                    <TableRow
                      key={index}
                      className="h-10 bg-background"
                      onMouseEnter={() => setHoveredRowIndex(index)}
                      onMouseLeave={() => setHoveredRowIndex(null)}
                    >
                      <TableCell className="py-0 px-0 w-[70px] pl-2">
                        <SelectCell
                          value={set.type}
                          onChange={(value) => handleSetChange(index, 'type', value as SetData['type'])}
                          options={[
                            { value: 'warmUp', label: 'Warm up' },
                            { value: 'normal', label: 'Normal' },
                            { value: 'failure', label: 'Failure' },
                            ...(exercise.exerciseType === 'weight_reps' ? [{ value: 'dropset', label: 'Dropset' }] : []),
                          ]}
                          displayValue={
                            `${index + 1}${set.type === 'warmUp' ? 'W' :
                              set.type === 'normal' ? 'N' :
                                set.type === 'failure' ? 'F' :
                                  set.type === 'dropset' ? 'D' : ''
                            }`
                          }
                        />
                      </TableCell>
                      {/* Column 1 */}
                      {renderColumnCell(set, index, column1Label)}
                      {/* Column 2 */}
                      {renderColumnCell(set, index, column2Label)}
                      {/* Rest */}
                      <TableCell className="py-0 px-2 text-center w-[70px]">
                        <EditableCell
                          value={set.rest}
                          onChange={(value) => handleSetChange(index, 'rest', value)}
                          placeholder="90"
                          hasError={validationErrors?.[index]?.rest}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Delete buttons overlay - only show when more than 1 set */}
            {sets.length > 1 && (
              <div className="absolute right-0 top-0 h-full flex flex-col pointer-events-none" style={{ transform: 'translateX(50%)' }}>
                {/* Header spacer */}
                <div className="h-8 flex-shrink-0" />
                {/* Delete buttons for each row - visible only when row is hovered */}
                {sets.map((_, index) => (
                  <div
                    key={index}
                    className="h-10 flex items-center justify-center flex-shrink-0"
                    style={{ pointerEvents: hoveredRowIndex === index ? 'auto' : 'none' }}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredRowIndex(index)}
                      onClick={() => {
                        setSets((prev) => {
                          const filtered = prev.filter((_, i) => i !== index);
                          // Renumber all sets
                          return filtered.map((set, idx) => ({ ...set, setNumber: idx + 1 }));
                        });
                      }}
                      className={`h-4 w-4 rounded-full bg-primary flex items-center justify-center shadow-sm hover:bg-primary/90 transition-opacity ${hoveredRowIndex === index ? 'opacity-100' : 'opacity-0'
                        }`}
                      aria-label={`Remove set ${index + 1}`}
                    >
                      <X className="h-2.5 w-2.5 text-primary-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* Add buttons overlay - positioned on left edge */}
            {!isSingleSetOnly && (
              <div className="absolute left-0 top-0 h-full flex flex-col pointer-events-none" style={{ transform: 'translateX(-50%)' }}>
                {/* Header spacer */}
                <div className="h-8 flex-shrink-0" />
                {/* Add buttons for each row - visible only when row is hovered */}
                {sets.map((_, index) => (
                  <div
                    key={index}
                    className="h-10 flex items-center justify-center flex-shrink-0"
                    style={{ pointerEvents: hoveredRowIndex === index ? 'auto' : 'none' }}
                  >
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredRowIndex(index)}
                      onClick={() => handleAddSet(index)}
                      className={`h-4 w-4 rounded-full bg-primary flex items-center justify-center shadow-sm hover:bg-primary/90 transition-opacity ${hoveredRowIndex === index ? 'opacity-100' : 'opacity-0'
                        }`}
                      aria-label={`Add set after set ${index + 1}`}
                    >
                      <Plus className="h-2.5 w-2.5 text-primary-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      {/* Alternative Exercises Multi-Select */}
      {
        isAlternativesVisible && (
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
        )
      }

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
