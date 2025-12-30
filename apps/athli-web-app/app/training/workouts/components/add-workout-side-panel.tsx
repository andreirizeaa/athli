'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dumbbell, Calendar, Info, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { getWorkouts } from '@/api/coach/coach-workout-service';
import type { Workout } from '@/components/app/app-shell';
import { cn } from '@/lib/general/utils';

type AddWorkoutSidePanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (workout: Workout, scheduleOption: string, config: string) => Promise<void>;
    selectedDate?: Date;
    workoutTitle?: string;
};

export const AddWorkoutSidePanel = ({
    open,
    onOpenChange,
    onSave,
    selectedDate,
    workoutTitle
}: AddWorkoutSidePanelProps) => {
    const t = useTranslations();
    const [step, setStep] = useState<number>(1);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
    const [selectedScheduleOption, setSelectedScheduleOption] = useState<string>('once');
    const [everyDaysInput, setEveryDaysInput] = useState<string>('1');
    const [weeklyDayInput, setWeeklyDayInput] = useState<string>('Monday');

    useEffect(() => {
        if (open) {
            setStep(1);
            fetchWorkouts();
            // Reset config
            setSelectedScheduleOption('once');
            setEveryDaysInput('1');
            if (selectedDate) {
                setWeeklyDayInput(selectedDate.toLocaleDateString('en-US', { weekday: 'long' }));
            }
        }
    }, [open, selectedDate]);

    const fetchWorkouts = async () => {
        setIsLoading(true);
        try {
            const data = await getWorkouts();
            setWorkouts(data);
        } catch (error) {
            console.error('Failed to fetch workouts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedWorkout = useMemo(() =>
        workouts.find(w => w.id === selectedWorkoutId),
        [workouts, selectedWorkoutId]
    );

    const handleClose = () => {
        onOpenChange(false);
        setStep(1);
        setSelectedWorkoutId(null);
    };

    const handleNext = () => {
        if (step === 1 && selectedWorkoutId) {
            setStep(2);
        }
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        }
    };

    const handleSave = async () => {
        if (!selectedWorkout) return;

        setIsSaving(true);
        try {
            let config = '';
            if (selectedScheduleOption === 'every') {
                config = everyDaysInput;
            } else if (selectedScheduleOption === 'weekly') {
                config = weeklyDayInput;
            }

            await onSave(selectedWorkout, selectedScheduleOption, config);
            handleClose();
        } catch (error) {
            console.error('Failed to save workout:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const columns: ColumnDefinition<Workout>[] = useMemo(() => [
        {
            id: 'program',
            label: t('athletes.trainingCalendar.table.name'),
            width: { class: 'w-1/2', pixel: '50%' },
            renderHeader: ({ isAllSelected, onToggleAll }) => {
                const handleToggleAll = () => {
                    // Only toggle non-empty workouts
                    const selectableWorkouts = workouts.filter(w => w.totalExercises && w.totalExercises > 0);
                    if (isAllSelected) {
                        setSelectedWorkoutId(null);
                    } else if (selectableWorkouts.length > 0) {
                        setSelectedWorkoutId(selectableWorkouts[0].id);
                    }
                };
                return (
                    <div className="flex items-center gap-3 h-full w-full">
                        <Checkbox checked={isAllSelected} onCheckedChange={handleToggleAll} aria-label="Select all" />
                        <div className="flex items-center gap-2">
                            <Dumbbell className="size-3 text-muted-foreground" />
                            <span className="text-xs uppercase text-muted-foreground">{t('athletes.trainingCalendar.table.name')}</span>
                        </div>
                    </div>
                );
            },
            renderCell: (row, isSelected) => {
                const isEmpty = !row.totalExercises || row.totalExercises === 0;
                return (
                    <div className="flex items-center gap-3 h-full w-full">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="flex items-center justify-center h-full flex-shrink-0"
                                        data-no-row-link="true"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isEmpty) {
                                                setSelectedWorkoutId(isSelected ? null : row.id);
                                            }
                                        }}
                                    >
                                        <Checkbox checked={isSelected} disabled={isEmpty} />
                                    </div>
                                </TooltipTrigger>
                                {isEmpty && (
                                    <TooltipContent>
                                        <p>No exercises in this workout</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>
                        <div className="flex flex-col gap-1 py-1 min-w-0">
                            <span className="font-medium text-sm truncate">{row.program}</span>
                            {row.description && (
                                <span className="text-xs text-muted-foreground line-clamp-1">{row.description}</span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'totalExercises',
            label: t('library.totalExercises'),
            width: { class: 'w-1/2', pixel: '50%' },
            getSortValue: (row) => row.totalExercises || 0,
            renderCell: (row) => {
                const isEmpty = !row.totalExercises || row.totalExercises === 0;
                if (isEmpty) {
                    return (
                        <Link
                            href={`/training/workouts/${row.id}/edit`}
                            className="text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Add exercise
                        </Link>
                    );
                }
                return <span className="text-sm">{row.totalExercises}</span>;
            },
        },
    ], [t, selectedWorkoutId]);

    const title = workoutTitle
        ? workoutTitle
        : (step === 1 ? t('athletes.trainingCalendar.addWorkoutTitle') : t('athletes.trainingCalendar.configureWorkoutTitle'));

    return (
        <SidePanel
            open={open}
            onOpenChange={handleClose}
            title={title}
            footer={
                <div className="flex w-full justify-end gap-2">
                    {step === 1 ? (
                        <>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                {t('general.cancel')}
                            </Button>
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={!selectedWorkoutId}
                                className="gap-2"
                            >
                                {t('general.continue')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving}>
                                {t('general.back')}
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="gap-2"
                            >
                                {isSaving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Check className="size-4" />
                                )}
                                {t('general.save')}
                            </Button>
                        </>
                    )}
                </div>
            }
        >
            {step === 1 ? (
                <div className="flex flex-col h-full min-h-0">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <span className="text-muted-foreground">{t('general.loading')}</span>
                        </div>
                    ) : (
                        <div className="flex-1 min-h-0 h-full [&_.border-t]:border-t-0">
                            <DataGrid
                                data={workouts}
                                columns={columns}
                                getRowId={(row) => row.id}
                                gridKey="add-workout-grid"
                                searchPlaceholder={t('athletes.trainingCalendar.searchWorkoutsPlaceholder')}
                                searchFields={[(row) => row.program]}
                                enableSearch={true}
                                enableEditColumns={false}
                                enableExport={false}
                                enableRowSelection={true}
                                selectOnRowClick={false}
                                onRowClick={(row) => {
                                    const isEmpty = !row.totalExercises || row.totalExercises === 0;
                                    if (!isEmpty) {
                                        setSelectedWorkoutId(row.id);
                                    }
                                }}
                                selectedRowIds={new Set(selectedWorkoutId ? [selectedWorkoutId] : [])}
                                onSelectionChange={(ids) => setSelectedWorkoutId(ids.size > 0 ? Array.from(ids)[0] : null)}
                                emptyMessage={t('athletes.trainingCalendar.noWorkoutsFound')}
                                rowHeight="54px"
                                compactMode={true}
                                showPagination={false}
                                gridPadding={false}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    <div className="text-sm text-muted-foreground">
                        {t('athletes.trainingCalendar.configureWorkoutDescription')}
                    </div>
                    {selectedWorkout && (
                        <div className="flex flex-col gap-2 p-4 border rounded-lg bg-muted/40">
                            <div className="flex items-center gap-2">
                                <Dumbbell className="size-4 text-primary" />
                                <span className="font-semibold">{selectedWorkout.program}</span>
                            </div>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">{selectedWorkout.type}</Badge>
                                <Badge variant="secondary" className="text-xs">{selectedWorkout.difficulty}</Badge>
                                <span>{selectedWorkout.totalExercises} {t('athletes.trainingCalendar.exercises')}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-medium">{t('athletes.trainingCalendar.addConfigurations')}</h3>
                        <div className="flex flex-col gap-3">
                            <Card
                                className={cn(
                                    'p-4 border rounded-lg cursor-pointer transition-colors',
                                    selectedScheduleOption === 'once'
                                        ? 'border-primary bg-primary/5'
                                        : 'bg-background hover:bg-accent/30',
                                )}
                                onClick={() => setSelectedScheduleOption('once')}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {t('athletes.trainingCalendar.addOnlyForThisDay')}
                                    </span>
                                    <div className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center', selectedScheduleOption === 'once' ? 'border-primary' : 'border-muted')}>
                                        {selectedScheduleOption === 'once' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                    </div>
                                </div>
                            </Card>

                            <Card
                                className={cn(
                                    'p-4 border rounded-lg transition-colors',
                                    selectedScheduleOption === 'every'
                                        ? 'border-primary bg-primary/5'
                                        : 'bg-background',
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{t('athletes.trainingCalendar.addThisWorkoutEvery')}</span>
                                        <Input
                                            type="number"
                                            min="1"
                                            className="w-20 h-8"
                                            value={everyDaysInput}
                                            onChange={(e) => {
                                                setEveryDaysInput(e.target.value);
                                                setSelectedScheduleOption('every');
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="text-sm font-medium">{t('athletes.trainingCalendar.days')}</span>
                                    </div>
                                    <div
                                        className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer', selectedScheduleOption === 'every' ? 'border-primary' : 'border-muted')}
                                        onClick={() => setSelectedScheduleOption('every')}
                                    >
                                        {selectedScheduleOption === 'every' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                    </div>
                                </div>
                            </Card>

                            <Card
                                className={cn(
                                    'p-4 border rounded-lg transition-colors',
                                    selectedScheduleOption === 'weekly'
                                        ? 'border-primary bg-primary/5'
                                        : 'bg-background',
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{t('athletes.trainingCalendar.addThisWorkoutWeeklyOn')}</span>
                                        <Input
                                            className="w-32 h-8"
                                            value={weeklyDayInput}
                                            onChange={(e) => {
                                                setWeeklyDayInput(e.target.value);
                                                setSelectedScheduleOption('weekly');
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                    <div
                                        className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center cursor-pointer', selectedScheduleOption === 'weekly' ? 'border-primary' : 'border-muted')}
                                        onClick={() => setSelectedScheduleOption('weekly')}
                                    >
                                        {selectedScheduleOption === 'weekly' && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
        </SidePanel>
    );
};
