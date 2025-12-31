'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Info, FileText } from 'lucide-react';
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
import { getPrograms } from '@/api/coach/coach-program-service';
import type { Program } from '@/components/app/app-shell';
import { cn } from '@/lib/general/utils';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

type AddProgramSidePanelProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (program: Program, startDate: Date) => Promise<void>;
    selectedDate?: Date;
};

export const AddProgramSidePanel = ({
    open,
    onOpenChange,
    onSave,
    selectedDate,
}: AddProgramSidePanelProps) => {
    const t = useTranslations();
    const [step, setStep] = useState<number>(1);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>(selectedDate);

    useEffect(() => {
        if (open) {
            setStep(1);
            fetchPrograms();
            setStartDate(selectedDate);
        }
    }, [open, selectedDate]);

    const fetchPrograms = async () => {
        setIsLoading(true);
        try {
            const data = await getPrograms();
            setPrograms(data);
        } catch (error) {
            console.error('Failed to fetch programs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedProgram = useMemo(() =>
        programs.find(p => p.id === selectedProgramId),
        [programs, selectedProgramId]
    );

    const handleClose = () => {
        onOpenChange(false);
        setStep(1);
        setSelectedProgramId(null);
    };

    const handleNext = () => {
        if (step === 1 && selectedProgramId) {
            setStep(2);
        }
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        }
    };

    const handleSave = async () => {
        if (!selectedProgram || !startDate) return;
        await onSave(selectedProgram, startDate);
        handleClose();
    };

    const columns: ColumnDefinition<Program>[] = useMemo(() => [
        {
            id: 'program',
            label: t('athletes.trainingCalendar.table.name'),
            width: { class: 'w-1/2', pixel: '50%' },
            renderHeader: ({ isAllSelected, onToggleAll }) => {
                const handleToggleAll = () => {
                    // Only toggle non-empty programs (programs with workouts)
                    const selectablePrograms = programs.filter(p => p.length && p.length !== '0 weeks');
                    if (isAllSelected) {
                        setSelectedProgramId(null);
                    } else if (selectablePrograms.length > 0) {
                        setSelectedProgramId(selectablePrograms[0].id);
                    }
                };
                return (
                    <div className="flex items-center gap-3 h-full w-full">
                        <Checkbox checked={isAllSelected} onCheckedChange={handleToggleAll} aria-label="Select all" />
                        <div className="flex items-center gap-2">
                            <FileText className="size-3 text-muted-foreground" />
                            <span className="text-xs uppercase text-muted-foreground">{t('athletes.trainingCalendar.table.name')}</span>
                        </div>
                    </div>
                );
            },
            renderCell: (row, isSelected) => {
                // Program is empty only if it has no workouts (no length or 0 weeks)
                const isEmpty = !row.length || row.length === '0 weeks';
                const tooltipMessage = 'No workouts in this program';
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
                                                setSelectedProgramId(isSelected ? null : row.id);
                                            }
                                        }}
                                    >
                                        <Checkbox checked={isSelected} disabled={isEmpty} />
                                    </div>
                                </TooltipTrigger>
                                {isEmpty && (
                                    <TooltipContent>
                                        <p>{tooltipMessage}</p>
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
            id: 'length',
            label: t('athletes.trainingCalendar.table.length'),
            width: { class: 'w-1/2', pixel: '50%' },
            getSortValue: (row) => row.length || '',
            renderCell: (row) => {
                const isEmpty = !row.length || row.length === '0 weeks';
                if (isEmpty) {
                    return (
                        <Link
                            href={`/training/programs/${row.id}/edit`}
                            className="text-sm text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            Add workout
                        </Link>
                    );
                }
                return <span className="text-sm">{row.length}</span>;
            },
        },
    ], [t, selectedProgramId]);

    return (
        <SidePanel
            open={open}
            onOpenChange={handleClose}
            title={step === 1 ? t('athletes.trainingCalendar.addProgramTitle') : t('athletes.trainingCalendar.configureProgramTitle')}
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
                                disabled={!selectedProgramId}
                                className="gap-2"
                            >
                                {t('general.continue')}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button type="button" variant="outline" onClick={handleBack}>
                                {t('general.back')}
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={!startDate}
                                className="gap-2"
                            >
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
                                data={programs}
                                columns={columns}
                                getRowId={(row) => row.id}
                                gridKey="add-program-grid"
                                searchPlaceholder={t('athletes.trainingCalendar.searchProgramsPlaceholder')}
                                searchFields={[(row) => row.program]}
                                enableSearch={true}
                                enableEditColumns={false}
                                enableExport={false}
                                enableRowSelection={true}
                                selectOnRowClick={false}
                                onRowClick={(row) => {
                                    const isEmpty = !row.length || row.length === '0 weeks';
                                    if (!isEmpty) {
                                        setSelectedProgramId(row.id);
                                    }
                                }}
                                selectedRowIds={new Set(selectedProgramId ? [selectedProgramId] : [])}
                                onSelectionChange={(ids) => setSelectedProgramId(ids.size > 0 ? Array.from(ids)[0] : null)}
                                emptyMessage={t('athletes.trainingCalendar.noProgramsFound')}
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
                        {t('athletes.trainingCalendar.configureProgramDescription')}
                    </div>
                    {selectedProgram && (
                        <div className="flex flex-col gap-2 p-4 border rounded-lg bg-muted/40">
                            <div className="flex items-center gap-2">
                                <FileText className="size-4 text-primary" />
                                <span className="font-semibold">{selectedProgram.program}</span>
                            </div>
                            <div className="flex gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">{selectedProgram.type}</Badge>
                                <span>{selectedProgram.length}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-4">
                        <h3 className="text-sm font-medium">{t('athletes.trainingCalendar.programStartDate')}</h3>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                    mode="single"
                                    selected={startDate}
                                    onSelect={setStartDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <p className="text-sm text-muted-foreground">
                            {t('athletes.trainingCalendar.programStartDateDescription')}
                        </p>
                    </div>
                </div>
            )}
        </SidePanel>
    );
};
