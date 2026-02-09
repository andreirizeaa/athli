'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Info, Activity, Check, Loader2 } from 'lucide-react';
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
    const [isSaving, setIsSaving] = useState(false);

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
        if (!selectedExercise || isSaving) return;
        setIsSaving(true);
        try {
            await onSave(selectedExercise);
            handleClose();
        } catch (error) {
            console.error('Failed to add exercise:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const columns: ColumnDefinition<Exercise>[] = useMemo(() => [
        {
            id: 'name',
            label: t('athletes.trainingCalendar.table.name'),
            width: { class: 'w-full', pixel: '100%' },
            renderHeader: ({ isAllSelected, onToggleAll }) => (
                <div className="flex items-center gap-3 h-full w-full">
                    <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
                    <div className="flex items-center gap-2">
                        <Activity className="size-3 text-muted-foreground" />
                        <span className="text-xs uppercase text-muted-foreground">{t('athletes.trainingCalendar.table.name')}</span>
                    </div>
                </div>
            ),
            renderCell: (row, isSelected) => (
                <div className="flex items-center gap-3 h-full w-full">
                    <div
                        className="flex items-center justify-center h-full flex-shrink-0"
                        data-no-row-link="true"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExerciseId(row.id);
                        }}
                    >
                        <Checkbox checked={isSelected} />
                    </div>
                    <div className="flex flex-col gap-1 py-1 min-w-0">
                        <span className="font-medium text-sm truncate">{row.name}</span>
                        {row.description && (
                            <span className="text-xs text-muted-foreground line-clamp-1">{row.description}</span>
                        )}
                    </div>
                </div>
            ),
        },
    ], [t, selectedExerciseId]);

    return (
        <SidePanel
            open={open}
            onOpenChange={handleClose}
            title={t('athletes.trainingCalendar.addExerciseTitle')}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
                        {t('general.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!selectedExerciseId || isSaving}
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
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-muted-foreground">{t('general.loading')}</span>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 h-full [&_.border-t]:border-t-0">
                        <DataGrid
                            data={exercises}
                            columns={columns}
                            getRowId={(row) => row.id}
                            gridKey="add-exercise-grid"
                            searchPlaceholder={t('athletes.trainingCalendar.searchExercisesPlaceholder')}
                            searchFields={[(row) => row.name]}
                            enableSearch={true}
                            enableEditColumns={false}
                            enableExport={false}
                            enableRowSelection={true}
                            selectOnRowClick={true}
                            selectedRowIds={new Set(selectedExerciseId ? [selectedExerciseId] : [])}
                            onSelectionChange={(ids) => setSelectedExerciseId(ids.size > 0 ? Array.from(ids)[0] : null)}
                            emptyMessage={t('athletes.trainingCalendar.noExercisesFound')}
                            rowHeight="54px"
                            compactMode={true}
                            showPagination={false}
                            gridPadding={false}
                        />
                    </div>
                )}
            </div>
        </SidePanel>
    );
};
