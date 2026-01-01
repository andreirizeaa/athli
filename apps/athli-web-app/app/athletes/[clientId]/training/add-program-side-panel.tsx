'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Pencil, Loader2, Dumbbell, FileText, Check } from 'lucide-react';
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
import { RequiredAsterisk } from '@/components/ui/required-asterisk';
import { cn } from '@/lib/general/utils';
import type { Program } from '@/components/app/app-shell';
import { useCoachPrograms } from '@/hooks/use-coach-programs';
import { getProgramById, type ProgramData } from '@/api/coach/coach-program-service';
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    onSave: (
        program: Program,
        startDate: Date,
        detailedProgram?: Program & { program_data: ProgramData },
        range?: { start: number; end: number }
    ) => Promise<void>;
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
    const { programs, isLoading } = useCoachPrograms();
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<Date | undefined>(selectedDate);

    // Step 2 state
    const [detailedProgram, setDetailedProgram] = useState<(Program & { program_data: ProgramData }) | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [startDay, setStartDay] = useState<string>("1");
    const [endDay, setEndDay] = useState<string>("1");

    useEffect(() => {
        if (open) {
            setStep(1);
            setStartDate(selectedDate || new Date());
            setDetailedProgram(null);
            setStartDay("1");
            setEndDay("1");
        }
    }, [open, selectedDate]);

    const selectedProgram = useMemo(() =>
        programs.find(p => p.id === selectedProgramId),
        [programs, selectedProgramId]
    );

    const handleClose = () => {
        onOpenChange(false);
        setStep(1);
        setSelectedProgramId(null);
        setDetailedProgram(null);
    };

    const handleNext = async () => {
        if (step === 1 && selectedProgramId) {
            setIsLoadingDetails(true);
            try {
                const details = await getProgramById(selectedProgramId);
                setDetailedProgram(details);

                // Initialize range based on schema length
                const schema = details.program_data.schema || details.program_data.days || [];
                const maxDays = schema.length > 0 ? schema.length : 1;
                setStartDay("1");
                setEndDay(maxDays.toString());

                setStep(2);
            } catch (error) {
                console.error("Failed to fetch program details", error);
            } finally {
                setIsLoadingDetails(false);
            }
        }
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        }
    };

    const handleSave = async () => {
        if (!selectedProgram || !startDate) return;
        setIsSaving(true);
        try {
            await onSave(
                selectedProgram,
                startDate,
                detailedProgram || undefined,
                { start: parseInt(startDay), end: parseInt(endDay) }
            );
            handleClose();
        } catch (error) {
            console.error('Failed to save program', error);
        } finally {
            setIsSaving(false);
        }
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
            width: { class: 'w-1/4', pixel: '25%' },
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
        {
            id: 'totalWorkouts',
            label: t('programs.columns.totalWorkouts'),
            width: { class: 'w-1/4', pixel: '25%' },
            getSortValue: (row) => row.totalWorkouts,
            renderCell: (row) => (
                <span className="text-sm">
                    {row.totalWorkouts} {row.totalWorkouts === 1 ? 'workout' : 'workouts'}
                </span>
            ),
        },
    ], [t, selectedProgramId]);

    return (
        <SidePanel
            open={open}
            onOpenChange={handleClose}
            title={step === 1 ? t('athletes.trainingCalendar.addProgramTitle') : t('athletes.trainingCalendar.configureProgramTitle')}
            footer={
                <div className="flex w-full justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                        {t('general.cancel')}
                    </Button>

                    {step === 2 && (
                        <Button type="button" variant="outline" onClick={handleBack}>
                            {t('general.back')}
                        </Button>
                    )}

                    {step === 1 ? (
                        <Button
                            type="button"
                            onClick={handleNext}
                            disabled={!selectedProgramId || isLoadingDetails}
                            className="gap-2 relative"
                        >
                            <span className={cn(isLoadingDetails && "invisible")}>{t('general.continue')}</span>
                            {isLoadingDetails && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Loader2 className="size-4 animate-spin" />
                                </div>
                            )}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={!startDate || isSaving}
                            className="gap-2 relative"
                        >
                            {isSaving ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Check className="size-4" />
                            )}
                            <span>{t('general.save')}</span>
                        </Button>
                    )}
                </div>
            }
            contentClassName="sm:w-[550px] sm:max-w-[550px]"
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
                <div className="flex flex-col h-full gap-4">
                    {/* Range Selection */}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium">Select range <RequiredAsterisk /></span>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                value={startDay}
                                onValueChange={(val) => {
                                    setStartDay(val);
                                    // Ensure end day is at least start day
                                    if (parseInt(endDay) < parseInt(val)) {
                                        setEndDay(val);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Start Day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {detailedProgram?.program_data.schema?.map((day: { day: number; workouts: any[] }, idx: number) => {
                                        const dayNum = idx + 1;
                                        // Disable if greater than current end day (optional, user req: "disable up to that date in the left")
                                        // "disable up to that date in the left" -> prevent selecting day > endDay?
                                        // "prevent the left being more than the right"
                                        const isDisabled = parseInt(endDay) < dayNum;
                                        return (
                                            <SelectItem
                                                key={dayNum}
                                                value={dayNum.toString()}
                                                disabled={isDisabled}
                                            >
                                                Day {dayNum}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>

                            <Select
                                value={endDay}
                                onValueChange={(val) => {
                                    setEndDay(val);
                                    // Ensure start day is at most end day
                                    if (parseInt(startDay) > parseInt(val)) {
                                        setStartDay(val);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="End Day" />
                                </SelectTrigger>
                                <SelectContent>
                                    {detailedProgram?.program_data.schema?.map((day: { day: number; workouts: any[] }, idx: number) => {
                                        const dayNum = idx + 1;
                                        // "same thing for the other one to prevent the left being more than the right"
                                        // For End Day dropdown, disable days less than Start Day
                                        const isDisabled = parseInt(startDay) > dayNum;
                                        return (
                                            <SelectItem
                                                key={dayNum}
                                                value={dayNum.toString()}
                                                disabled={isDisabled}
                                            >
                                                Day {dayNum}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Program Preview Container */}
                    <div className="flex-1 min-h-0 bg-muted/30 rounded-lg border flex flex-col overflow-hidden">
                        <ScrollArea className="flex-1 p-2">
                            <div className="mb-2 px-1 flex items-center justify-between">
                                <span className="text-xs font-bold text-primary uppercase tracking-wide">
                                    {detailedProgram?.program}
                                </span>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={handleBack} className="h-6 w-6">
                                                <Pencil className="size-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left">
                                            <p>Change program</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <div className="flex flex-col gap-2">
                                {detailedProgram?.program_data.schema?.filter((day: { day: number; workouts: any[] }, idx: number) => {
                                    const dayNum = idx + 1;
                                    return dayNum >= parseInt(startDay) && dayNum <= parseInt(endDay);
                                }).map((day: { day: number; workouts: any[] }, idx: number) => {
                                    const workouts = day.workouts || [];
                                    const dayNumber = day.day || (detailedProgram.program_data.schema?.indexOf(day) ?? 0) + 1;

                                    if (workouts.length === 0) return null;

                                    return (
                                        <div
                                            key={dayNumber}
                                            className="px-2 py-2 bg-sidebar border rounded-md shadow-xs"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                                    {workouts.map((workout: any, wIdx: number) => (
                                                        <div key={wIdx} className="text-xs font-medium text-foreground truncate">
                                                            {workout.name || workout.title}
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    Day {dayNumber}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            )}
        </SidePanel>
    );
};
