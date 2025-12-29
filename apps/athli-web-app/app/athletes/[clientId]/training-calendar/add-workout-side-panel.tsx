'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Info, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
};

export const AddWorkoutSidePanel = ({
    open,
    onOpenChange,
    onSave,
    selectedDate,
}: AddWorkoutSidePanelProps) => {
    const t = useTranslations();
    const [step, setStep] = useState<number>(1);
    const [workouts, setWorkouts] = useState<Workout[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
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

        let config = '';
        if (selectedScheduleOption === 'every') {
            config = everyDaysInput;
        } else if (selectedScheduleOption === 'weekly') {
            config = weeklyDayInput;
        }

        await onSave(selectedWorkout, selectedScheduleOption, config);
        handleClose();
    };

    const columns: ColumnDefinition<Workout>[] = useMemo(() => [
        {
            id: 'select',
            label: '',
            width: { class: 'w-[50px] min-w-[50px] max-w-[50px]', pixel: '50px' },
            renderHeader: () => null,
            renderCell: (row) => (
                <div className="flex items-center justify-center h-full">
                    <Checkbox
                        checked={selectedWorkoutId === row.id}
                        onCheckedChange={() => setSelectedWorkoutId(row.id)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            ),
        },
        {
            id: 'program',
            label: t('athletes.trainingCalendar.table.name'),
            width: { class: 'min-w-[200px]', pixel: '200px' },
            sortable: true,
            renderCell: (row) => (
                <div className="flex flex-col gap-1 py-1">
                    <span className="font-medium text-sm">{row.program}</span>
                    {row.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">{row.description}</span>
                    )}
                </div>
            ),
        },
        {
            id: 'type',
            label: t('athletes.trainingCalendar.table.type'),
            width: { class: 'min-w-[100px]', pixel: '100px' },
            sortable: true,
            renderCell: (row) => (
                <Badge variant="outline" className="text-xs font-normal">
                    {row.type}
                </Badge>
            ),
        },
        {
            id: 'difficulty',
            label: t('athletes.trainingCalendar.table.difficulty'),
            width: { class: 'min-w-[100px]', pixel: '100px' },
            sortable: true,
            renderCell: (row) => (
                <span className="text-sm text-muted-foreground">{row.difficulty}</span>
            ),
        },
        {
            id: 'length',
            label: t('athletes.trainingCalendar.table.length'),
            width: { class: 'min-w-[80px]', pixel: '80px' },
            sortable: true,
            renderCell: (row) => (
                <span className="text-sm text-muted-foreground">{row.length}</span>
            ),
        },
    ], [t, selectedWorkoutId]);

    return (
        <SidePanel
            open={open}
            onOpenChange={handleClose}
            title={step === 1 ? t('athletes.trainingCalendar.addWorkoutTitle') : t('athletes.trainingCalendar.configureWorkoutTitle')}
            footer={
                <div className="flex w-full justify-start gap-2">
                    {step === 1 ? (
                        <>
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={!selectedWorkoutId}
                            >
                                {t('general.continue')}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                {t('general.cancel')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                type="button"
                                onClick={handleSave}
                            >
                                {t('general.save')}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleBack}>
                                {t('general.back')}
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
                        <DataGrid
                            data={workouts}
                            columns={columns}
                            getRowId={(row) => row.id}
                            gridKey="add-workout-grid"
                            searchPlaceholder={t('athletes.trainingCalendar.searchWorkoutsPlaceholder')}
                            searchFields={[(row) => row.program]}
                            enableSearch={true}
                            enableRowSelection={false}
                            onRowClick={(row) => setSelectedWorkoutId(row.id)}
                            selectedRowIds={new Set(selectedWorkoutId ? [selectedWorkoutId] : [])}
                            emptyMessage={t('athletes.trainingCalendar.noWorkoutsFound')}
                            rowHeight="60px"
                            compactMode={true}
                            showPagination={false}
                            gridPadding={false}
                        />
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
