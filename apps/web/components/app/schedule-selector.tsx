'use client';

import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Info } from 'lucide-react';

export type ScheduleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type MonthlyOption = 'first' | 'last' | 'specific';

export interface ScheduleConfig {
    type: 'check-in' | 'metric';
    frequency: ScheduleFrequency;
    selectedDays?: string[];
    monthlyOption?: MonthlyOption;
    specificDay?: number;
}

interface ScheduleSelectorProps {
    frequency: ScheduleFrequency;
    onFrequencyChange: (frequency: ScheduleFrequency) => void;
    selectedDays: Set<string>;
    onSelectedDaysChange: (days: Set<string>) => void;
    monthlyOption: MonthlyOption;
    onMonthlyOptionChange: (option: MonthlyOption) => void;
    specificDay: number;
    onSpecificDayChange: (day: number) => void;
    /** Optional custom explanation text. If not provided, uses default translations */
    customExplanation?: string;
    /** Translation key prefix for schedule labels (e.g., 'metrics.schedule' or 'athletes.profile.checkIns.schedule') */
    translationPrefix?: string;
    /** Whether to show the border at the top */
    showTopBorder?: boolean;
    /** Additional class names */
    className?: string;
}

/**
 * Shared Schedule Selector component for configuring frequency settings.
 * Used by both check-in forms and metrics.
 */
export const ScheduleSelector = ({
    frequency,
    onFrequencyChange,
    selectedDays,
    onSelectedDaysChange,
    monthlyOption,
    onMonthlyOptionChange,
    specificDay,
    onSpecificDayChange,
    customExplanation,
    translationPrefix = 'metrics.schedule',
    showTopBorder = true,
    className = '',
}: ScheduleSelectorProps) => {
    const t = useTranslations();

    const handleFrequencyChange = (value: string) => {
        if (value) {
            const newFrequency = value as ScheduleFrequency;
            onFrequencyChange(newFrequency);
            // Reset selected days based on frequency
            if (newFrequency === 'daily') {
                onSelectedDaysChange(new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
            } else if (newFrequency === 'weekly' || newFrequency === 'biweekly') {
                onSelectedDaysChange(new Set(['sunday']));
            }
        }
    };

    const handleDayToggle = (day: string, checked: boolean) => {
        const newSelectedDays = new Set(selectedDays);
        if (checked) {
            newSelectedDays.add(day);
        } else {
            newSelectedDays.delete(day);
        }
        onSelectedDaysChange(newSelectedDays);
    };

    const getScheduleExplanation = (): string => {
        if (customExplanation) return customExplanation;

        const explanationPrefix = `${translationPrefix}.explanation`;

        if (frequency === 'daily') {
            const daysArray = Array.from(selectedDays);
            const dayNames = daysArray.map(day => t(`habits.form.${day}`)).join(', ');
            return t(`${explanationPrefix}.daily`, { days: dayNames });
        } else if (frequency === 'weekly') {
            const daysArray = Array.from(selectedDays);
            const dayName = daysArray.length > 0 ? t(`habits.form.${daysArray[0]}`) : '';
            return t(`${explanationPrefix}.weekly`, { day: dayName });
        } else if (frequency === 'biweekly') {
            const daysArray = Array.from(selectedDays);
            const dayName = daysArray.length > 0 ? t(`habits.form.${daysArray[0]}`) : '';
            return t(`${explanationPrefix}.biweekly`, { day: dayName });
        } else if (frequency === 'monthly') {
            if (monthlyOption === 'first') {
                return t(`${explanationPrefix}.monthlyFirst`);
            } else if (monthlyOption === 'last') {
                return t(`${explanationPrefix}.monthlyLast`);
            } else if (monthlyOption === 'specific') {
                return t(`${explanationPrefix}.monthlySpecific`, {
                    day: `${specificDay}${specificDay === 1 ? 'st' : specificDay === 2 ? 'nd' : specificDay === 3 ? 'rd' : 'th'}`,
                });
            }
        }
        return '';
    };

    const frequencyPrefix = `${translationPrefix}.frequency`;
    const monthlyPrefix = `${translationPrefix}.monthly`;

    return (
        <div className={`space-y-4 ${showTopBorder ? 'border-t pt-6 mt-2' : ''} ${className}`}>
            {/* Frequency Selection */}
            <div className="space-y-4">
                <Label>
                    <span>
                        {t(`${frequencyPrefix}.label`)}
                        <span className="text-destructive">*</span>
                    </span>
                </Label>
                <ToggleGroup
                    type="single"
                    value={frequency}
                    onValueChange={handleFrequencyChange}
                    variant="outline"
                    spacing={0}
                    className="w-full"
                >
                    <ToggleGroupItem
                        value="daily"
                        aria-label={t(`${frequencyPrefix}.daily`)}
                        className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                        {t(`${frequencyPrefix}.daily`)}
                    </ToggleGroupItem>
                    <ToggleGroupItem
                        value="weekly"
                        aria-label={t(`${frequencyPrefix}.weekly`)}
                        className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                        {t(`${frequencyPrefix}.weekly`)}
                    </ToggleGroupItem>
                    <ToggleGroupItem
                        value="biweekly"
                        aria-label={t(`${frequencyPrefix}.biweekly`)}
                        className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                        {t(`${frequencyPrefix}.biweekly`)}
                    </ToggleGroupItem>
                    <ToggleGroupItem
                        value="monthly"
                        aria-label={t(`${frequencyPrefix}.monthly`)}
                        className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                        {t(`${frequencyPrefix}.monthly`)}
                    </ToggleGroupItem>
                </ToggleGroup>
            </div>

            {/* Day Selection */}
            <div className="space-y-4 w-full">
                <Label>
                    <span>
                        {frequency === 'daily' && t(`${translationPrefix}.selectDays`)}
                        {(frequency === 'weekly' || frequency === 'biweekly') && t(`${translationPrefix}.selectDay`)}
                        {frequency === 'monthly' && t(`${translationPrefix}.dayOfMonth`)}
                        <span className="text-destructive">*</span>
                    </span>
                </Label>

                {/* Daily - Day checkboxes (multiple selection) */}
                {frequency === 'daily' && (
                    <div className="flex gap-2 flex-wrap w-full justify-between">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                            <div key={day} className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedDays.has(day)}
                                    onCheckedChange={(checked) => handleDayToggle(day, !!checked)}
                                    aria-label={t(`habits.form.${day}`)}
                                />
                                <Label
                                    className="text-sm font-normal cursor-pointer"
                                    onClick={() => handleDayToggle(day, !selectedDays.has(day))}
                                >
                                    {t(`habits.form.${day}`)}
                                </Label>
                            </div>
                        ))}
                    </div>
                )}

                {/* Weekly/Biweekly - Single day checkboxes (single selection) */}
                {(frequency === 'weekly' || frequency === 'biweekly') && (
                    <div className="flex gap-2 flex-wrap w-full justify-between">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                            <div key={day} className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedDays.has(day)}
                                    onCheckedChange={(checked) => {
                                        // Single select: clicking always sets this day as the only selected one
                                        if (checked) {
                                            onSelectedDaysChange(new Set([day]));
                                        }
                                        // Don't allow unchecking the only selected day
                                    }}
                                    aria-label={t(`habits.form.${day}`)}
                                />
                                <Label
                                    className="text-sm font-normal cursor-pointer"
                                    onClick={() => {
                                        // Single select: clicking always sets this day as the only selected one
                                        if (!selectedDays.has(day)) {
                                            onSelectedDaysChange(new Set([day]));
                                        }
                                    }}
                                >
                                    {t(`habits.form.${day}`)}
                                </Label>
                            </div>
                        ))}
                    </div>
                )}

                {/* Monthly options */}
                {frequency === 'monthly' && (
                    <div className="space-y-4">
                        <ToggleGroup
                            type="single"
                            value={monthlyOption}
                            onValueChange={(value) => value && onMonthlyOptionChange(value as MonthlyOption)}
                            variant="outline"
                            spacing={0}
                            className="w-full"
                        >
                            <ToggleGroupItem
                                value="first"
                                aria-label={t(`${monthlyPrefix}.first`)}
                                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                {t(`${monthlyPrefix}.first`)}
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="last"
                                aria-label={t(`${monthlyPrefix}.last`)}
                                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                {t(`${monthlyPrefix}.last`)}
                            </ToggleGroupItem>
                            <ToggleGroupItem
                                value="specific"
                                aria-label={t(`${monthlyPrefix}.specific`)}
                                className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                                {t(`${monthlyPrefix}.specific`)}
                            </ToggleGroupItem>
                        </ToggleGroup>

                        {monthlyOption === 'specific' && (
                            <div className="flex flex-col gap-2 w-full">
                                <Label>
                                    <span>
                                        {t(`${monthlyPrefix}.selectDay`)}
                                        <span className="text-destructive">*</span>
                                    </span>
                                </Label>
                                <Select
                                    value={specificDay.toString()}
                                    onValueChange={(value) => onSpecificDayChange(parseInt(value, 10))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                            <SelectItem key={day} value={day.toString()}>
                                                {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Explanation Alert */}
            <Alert className="bg-primary/5 border-primary/20 text-primary">
                <Info className="size-4" />
                <AlertDescription className="min-w-0 line-clamp-4">
                    {getScheduleExplanation()}
                </AlertDescription>
            </Alert>
        </div>
    );
};

/**
 * Hook to manage schedule state
 */
export const useScheduleState = (initialConfig?: Partial<ScheduleConfig>) => {
    const defaultFrequency: ScheduleFrequency = initialConfig?.frequency || 'daily';
    const defaultDays = initialConfig?.selectedDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const defaultMonthlyOption: MonthlyOption = initialConfig?.monthlyOption || 'last';
    const defaultSpecificDay = initialConfig?.specificDay || 1;

    return {
        defaultFrequency,
        defaultSelectedDays: new Set(defaultDays),
        defaultMonthlyOption,
        defaultSpecificDay,
    };
};

/**
 * Converts schedule config to cron expression
 */
export const convertScheduleToCron = (config: ScheduleConfig): string => {
    const defaultHour = 9;
    const defaultMinute = 0;

    const dayMap: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0,
    };

    if (config.frequency === 'daily') {
        if (config.selectedDays && config.selectedDays.length > 0) {
            const weekdays = config.selectedDays
                .map(day => dayMap[day] ?? 0)
                .sort((a, b) => a - b)
                .join(',');
            return `${defaultMinute} ${defaultHour} * * ${weekdays}`;
        }
        return `${defaultMinute} ${defaultHour} * * *`;
    } else if (config.frequency === 'weekly') {
        const weekday = config.selectedDays && config.selectedDays.length > 0
            ? dayMap[config.selectedDays[0]] ?? 0
            : 0;
        return `${defaultMinute} ${defaultHour} * * ${weekday}`;
    } else if (config.frequency === 'biweekly') {
        const weekday = config.selectedDays && config.selectedDays.length > 0
            ? dayMap[config.selectedDays[0]] ?? 0
            : 0;
        return `${defaultMinute} ${defaultHour} * * ${weekday}`;
    } else if (config.frequency === 'monthly') {
        if (config.monthlyOption === 'first') {
            return `${defaultMinute} ${defaultHour} 1 * *`;
        } else if (config.monthlyOption === 'last') {
            return `${defaultMinute} ${defaultHour} 28-31 * *`;
        } else if (config.monthlyOption === 'specific' && config.specificDay) {
            return `${defaultMinute} ${defaultHour} ${config.specificDay} * *`;
        }
        return `${defaultMinute} ${defaultHour} 1 * *`;
    }

    return `${defaultMinute} ${defaultHour} * * *`;
};

/**
 * Helper to build a ScheduleConfig object from individual state values
 */
export const buildScheduleConfig = (
    type: 'check-in' | 'metric',
    frequency: ScheduleFrequency,
    selectedDays: Set<string>,
    monthlyOption: MonthlyOption,
    specificDay: number
): ScheduleConfig => ({
    type,
    frequency,
    selectedDays: Array.from(selectedDays),
    monthlyOption,
    specificDay,
});
