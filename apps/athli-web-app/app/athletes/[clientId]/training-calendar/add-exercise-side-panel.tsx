'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Info, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataGrid, type ColumnDefinition } from '@/components/app/data-grid';
import { getExercises, type Exercise } from '@/api/coach/coach-exercise-service';
import { cn } from '@/lib/general/utils';

type AddExerciseSidePanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (exercise: Exercise) => Promise<void>;
};

export const AddExerciseSidePanel = ({
    open,
    onOpenChange,
    onSave,
}: AddExerciseSidePanelProps) => {
    const t = useTranslations();
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            fetchExercises();
            setSelectedExerciseId(null);
        }
    }, [open]);

    const fetchExercises = async () => {
        setIsLoading(true);
        try {
            const data = await getExercises();
            setExercises(data);
        } catch (error) {
            console.error('Failed to fetch exercises:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedExercise = useMemo(() =>
        exercises.find(e => e.id === selectedExerciseId),
        [exercises, selectedExerciseId]
    );

    const handleClose = () => {
        onOpenChange(false);
        setSelectedExerciseId(null);
    };

    const handleSave = async () => {
        if (!selectedExercise) return;
        await onSave(selectedExercise);
        handleClose();
    };

    const columns: ColumnDefinition<Exercise>[] = useMemo(() => [
        {
            id: 'select',
            label: '',
            width: { class: 'w-[50px] min-w-[50px] max-w-[50px]', pixel: '50px' },
            renderHeader: () => null,
            renderCell: (row) => (
                <div className="flex items-center justify-center h-full">
                    <Checkbox
                        checked={selectedExerciseId === row.id}
                        onCheckedChange={() => setSelectedExerciseId(row.id)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            ),
        },
        {
            id: 'name',
            label: t('athletes.trainingCalendar.table.name'),
            width: { class: 'min-w-[200px]', pixel: '200px' },
            sortable: true,
            renderCell: (row) => (
                <div className="flex flex-col gap-1 py-1">
                    <span className="font-medium text-sm">{row.name}</span>
                    {row.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">{row.description}</span>
                    )}
                </div>
            ),
        },
        {
            id: 'muscle_group',
            label: t('athletes.trainingCalendar.table.muscleGroup'),
            width: { class: 'min-w-[150px]', pixel: '150px' },
            sortable: true,
            renderCell: (row) => (
                <div className="flex flex-wrap gap-1">
                    {row.muscle_group?.map((mg) => (
                        <Badge key={mg} variant="outline" className="text-xs font-normal">
                            {mg}
                        </Badge>
                    ))}
                </div>
            ),
        },
        {
            id: 'equipment',
            label: t('general.equipment'),
            width: { class: 'min-w-[100px]', pixel: '100px' },
            sortable: true,
            renderCell: (row) => (
                <span className="text-sm text-muted-foreground">{row.equipment}</span>
            ),
        },
    ], [t, selectedExerciseId]);

    return (
        <SidePanel
            open={open}
            onOpenChange={handleClose}
            title={t('athletes.trainingCalendar.addExerciseTitle')}
            footer={
                <div className="flex w-full justify-start gap-2">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!selectedExerciseId}
                    >
                        {t('general.add')}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleClose}>
                        {t('general.cancel')}
                    </Button>
                </div>
            }
        >
            <div className="flex flex-col h-full min-h-0">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-muted-foreground">{t('general.loading')}</span>
                    </div>
                ) : (
                    <DataGrid
                        data={exercises}
                        columns={columns}
                        getRowId={(row) => row.id}
                        gridKey="add-exercise-grid"
                        searchPlaceholder={t('athletes.trainingCalendar.searchExercisesPlaceholder')}
                        searchFields={[(row) => row.name]}
                        enableSearch={true}
                        enableRowSelection={false}
                        onRowClick={(row) => setSelectedExerciseId(row.id)}
                        selectedRowIds={new Set(selectedExerciseId ? [selectedExerciseId] : [])}
                        emptyMessage={t('athletes.trainingCalendar.noExercisesFound')}
                        rowHeight="60px"
                        compactMode={true}
                        showPagination={false}
                        gridPadding={false}
                    />
                )}
            </div>
        </SidePanel>
    );
};
