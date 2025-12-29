'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Info, FileText } from 'lucide-react';
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
            id: 'select',
            label: '',
            width: { class: 'w-[50px] min-w-[50px] max-w-[50px]', pixel: '50px' },
            renderHeader: () => null,
            renderCell: (row) => (
                <div className="flex items-center justify-center h-full">
                    <Checkbox
                        checked={selectedProgramId === row.id}
                        onCheckedChange={() => setSelectedProgramId(row.id)}
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
            id: 'length',
            label: t('athletes.trainingCalendar.table.length'),
            width: { class: 'min-w-[80px]', pixel: '80px' },
            sortable: true,
            renderCell: (row) => (
                <span className="text-sm text-muted-foreground">{row.length}</span>
            ),
        },
    ], [t, selectedProgramId]);

    return (
        <SidePanel
            open={open}
            onOpenChange={handleClose}
            title={step === 1 ? t('athletes.trainingCalendar.addProgramTitle') : t('athletes.trainingCalendar.configureProgramTitle')}
            footer={
                <div className="flex w-full justify-start gap-2">
                    {step === 1 ? (
                        <>
                            <Button
                                type="button"
                                onClick={handleNext}
                                disabled={!selectedProgramId}
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
                                disabled={!startDate}
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
                            data={programs}
                            columns={columns}
                            getRowId={(row) => row.id}
                            gridKey="add-program-grid"
                            searchPlaceholder={t('athletes.trainingCalendar.searchProgramsPlaceholder')}
                            searchFields={[(row) => row.program]}
                            enableSearch={true}
                            enableRowSelection={false}
                            onRowClick={(row) => setSelectedProgramId(row.id)}
                            selectedRowIds={new Set(selectedProgramId ? [selectedProgramId] : [])}
                            emptyMessage={t('athletes.trainingCalendar.noProgramsFound')}
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
