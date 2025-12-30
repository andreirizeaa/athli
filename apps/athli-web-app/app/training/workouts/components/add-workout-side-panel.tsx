'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dumbbell, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import type { Workout } from '@/components/app/app-shell';

type AddWorkoutSidePanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (workout: Workout, scheduleOption: string, config: string) => Promise<void>;
    selectedDate?: Date;
    workoutTitle?: string;
    mode?: 'program' | 'calendar';
    availableWorkouts: Workout[];
};

export const AddWorkoutSidePanel = ({
    open,
    onOpenChange,
    onSave,
    selectedDate,
    workoutTitle,
    mode = 'calendar',
    availableWorkouts
}: AddWorkoutSidePanelProps) => {
    const t = useTranslations();
    const [isSaving, setIsSaving] = useState(false);
    const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            setSelectedWorkoutId(null);
        }
    }, [open]);

    const selectedWorkout = useMemo(() =>
        availableWorkouts.find(w => w.id === selectedWorkoutId),
        [availableWorkouts, selectedWorkoutId]
    );

    const handleClose = () => {
        onOpenChange(false);
        setSelectedWorkoutId(null);
    };

    const handleSave = async () => {
        if (!selectedWorkout) return;

        setIsSaving(true);
        try {
            // Always add just for the current day (once)
            await onSave(selectedWorkout, 'once', '');
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
            renderHeader: () => {
                return (
                    <div className="flex items-center gap-3 h-full w-full">
                        <div className="size-4 shrink-0" />
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

    const title = workoutTitle || t('athletes.trainingCalendar.addWorkoutTitle');

    return (
        <SidePanel
            open={open}
            onOpenChange={handleClose}
            title={title}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                        {t('general.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!selectedWorkoutId || isSaving}
                        className="gap-2"
                    >
                        {isSaving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        {t('general.add')}
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col h-full min-h-0">
                <div className="flex-1 min-h-0 h-full [&_.border-t]:border-t-0">
                    <DataGrid
                        data={availableWorkouts}
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
            </div>
        </SidePanel>
    );
};
