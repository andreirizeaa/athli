'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Pencil, Loader2, Dumbbell, FileText, Check, ChevronDownIcon } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { SidePanel } from '@/components/app/side-panel';
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
import { Label } from "@/components/ui/label";
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
    preSelectedProgramId?: string | null; // Pre-select a program when opening from library
};

export const AddProgramSidePanel = ({
    open,
    onOpenChange,
    onSave,
    selectedDate,
    preSelectedProgramId = null
}: AddProgramSidePanelProps) => {
    const t = useTranslations();
    const [step, setStep] = useState<number>(1);
    const { programs, isLoading } = useCoachPrograms();
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

    // Step 2 state
    const [detailedProgram, setDetailedProgram] = useState<(Program & { program_data: ProgramData }) | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [startWeek, setStartWeek] = useState<string>("1");
    const [endWeek, setEndWeek] = useState<string>("1");
    const [programStartDate, setProgramStartDate] = useState<Date | undefined>(selectedDate);

    // Calculate total weeks from schema
    const totalWeeks = useMemo(() => {
        if (!detailedProgram?.program_data.schema) return 1;
        const totalDays = detailedProgram.program_data.schema.length;
        return Math.ceil(totalDays / 7);
    }, [detailedProgram]);

    // Group days by week for preview
    const weeklyBreakdown = useMemo(() => {
        if (!detailedProgram?.program_data.schema) return [];
        const schema = detailedProgram.program_data.schema;
        const weeks: Array<{ week: number; days: Array<{ day: number; workouts: any[] }> }> = [];

        for (let i = 0; i < schema.length; i += 7) {
            const weekNum = Math.floor(i / 7) + 1;
            const weekDays = schema.slice(i, i + 7).map((day: { day?: number; workouts?: any[] }, idx: number) => ({
                ...day,
                day: day.day || (i + idx + 1)
            }));
            weeks.push({ week: weekNum, days: weekDays });
        }

        return weeks;
    }, [detailedProgram]);

    // Get today's date at midnight for comparison
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    useEffect(() => {
        if (open) {
            setStep(1);
            setDetailedProgram(null);
            setStartWeek("1");
            setEndWeek("1");
            // Initialize program start date to selected date or today
            const initialDate = selectedDate || new Date();
            // Ensure it's not in the past
            if (initialDate < today) {
                setProgramStartDate(today);
            } else {
                setProgramStartDate(initialDate);
            }
            // Use pre-selected program if provided
            setSelectedProgramId(preSelectedProgramId || null);
        }
    }, [open, selectedDate, preSelectedProgramId, today]);

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

                // Initialize range based on schema length (in weeks)
                const schema = details.program_data.schema || details.program_data.days || [];
                const totalDays = schema.length > 0 ? schema.length : 1;
                const maxWeeks = Math.ceil(totalDays / 7);
                setStartWeek("1");
                setEndWeek(maxWeeks.toString());

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
        if (!selectedProgram || !programStartDate) return;
        setIsSaving(true);
        try {
            // Convert weeks to days for the API
            const startDayNum = (parseInt(startWeek) - 1) * 7 + 1;
            const endDayNum = parseInt(endWeek) * 7;
            await onSave(
                selectedProgram,
                programStartDate,
                detailedProgram || undefined,
                { start: startDayNum, end: endDayNum }
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
                            disabled={!programStartDate || isSaving}
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
                    {/* Program Start Date */}
                    <div className="space-y-2">
                        <Label>Program Start Date <RequiredAsterisk /></Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-between font-normal bg-sidebar border-muted-foreground/20 hover:border-primary/50 transition-colors h-9 text-sm px-3"
                                >
                                    <span>{programStartDate ? format(programStartDate, "d MMM, yyyy") : "Select"}</span>
                                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                <CalendarComponent
                                    mode="single"
                                    selected={programStartDate}
                                    onSelect={setProgramStartDate}
                                    disabled={(date) => date < today}
                                    captionLayout="dropdown"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Week Range Selection */}
                    <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium">Select Range <RequiredAsterisk /></span>
                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                value={startWeek}
                                onValueChange={(val) => {
                                    setStartWeek(val);
                                    // Ensure end week is at least start week
                                    if (parseInt(endWeek) < parseInt(val)) {
                                        setEndWeek(val);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Start Week" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: totalWeeks }, (_, idx) => {
                                        const weekNum = idx + 1;
                                        const isDisabled = parseInt(endWeek) < weekNum;
                                        return (
                                            <SelectItem
                                                key={weekNum}
                                                value={weekNum.toString()}
                                                disabled={isDisabled}
                                            >
                                                Week {weekNum}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>

                            <Select
                                value={endWeek}
                                onValueChange={(val) => {
                                    setEndWeek(val);
                                    // Ensure start week is at most end week
                                    if (parseInt(startWeek) > parseInt(val)) {
                                        setStartWeek(val);
                                    }
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="End Week" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: totalWeeks }, (_, idx) => {
                                        const weekNum = idx + 1;
                                        const isDisabled = parseInt(startWeek) > weekNum;
                                        return (
                                            <SelectItem
                                                key={weekNum}
                                                value={weekNum.toString()}
                                                disabled={isDisabled}
                                            >
                                                Week {weekNum}
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

                            <div className="flex flex-col gap-3">
                                {weeklyBreakdown
                                    .filter((week) => week.week >= parseInt(startWeek) && week.week <= parseInt(endWeek))
                                    .map((week) => {
                                        const workoutsInWeek = week.days.filter(day => day.workouts && day.workouts.length > 0);
                                        if (workoutsInWeek.length === 0) return null;

                                        return (
                                            <Card key={week.week} className="p-3">
                                                <div className="mb-2">
                                                    <Badge variant="outline" className="text-xs text-primary border-primary">
                                                        Week {week.week}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {week.days.map((day) => {
                                                        const workouts = day.workouts || [];
                                                        if (workouts.length === 0) return null;

                                                        return (
                                                            <div
                                                                key={day.day}
                                                                className="px-2 py-2 bg-muted/50 border rounded-md"
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
                                                                        Day {day.day}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </Card>
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
