'use client';

import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Pen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, eachWeekOfInterval, addDays } from 'date-fns';

type CalendarHeaderProps = {
  viewMode: 'week' | 'month';
  onViewModeChange: (mode: 'week' | 'month') => void;
  currentDate: Date;
  onCurrentDateChange: (date: Date) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onBookMeeting: () => void;
  provider?: 'google' | 'outlook' | null;
  calendarDates: Date[][];
};

export const CalendarHeader = ({
  viewMode,
  onViewModeChange,
  currentDate,
  onCurrentDateChange,
  onToday,
  onPrevious,
  onNext,
  onBookMeeting,
  provider,
  calendarDates,
}: CalendarHeaderProps) => {
  const t = useTranslations();
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  // Month and year options for month view selector
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(2024, i, 1);
      return {
        value: i.toString(),
        label: format(date, 'MMMM'),
      };
    });
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => {
      const year = currentYear - 5 + i;
      return {
        value: year.toString(),
        label: year.toString(),
      };
    });
  }, []);

  // Get current month and year for selectors
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Handle month change
  const handleMonthChange = (monthValue: string) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(monthValue, 10));
    onCurrentDateChange(newDate);
  };

  // Handle year change
  const handleYearChange = (yearValue: string) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(yearValue, 10));
    onCurrentDateChange(newDate);
  };

  const getWeekRange = () => {
    if (viewMode === 'week') {
      const firstDate = calendarDates[0]?.[0];
      const lastDate = calendarDates[0]?.[6];
      if (!firstDate || !lastDate) return '';
      return `${format(firstDate, 'd MMM, yyyy')} - ${format(lastDate, 'd MMM, yyyy')}`;
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="w-full relative flex-shrink-0">
      <div className="w-full px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-8 border-primary"
            aria-label={t('calendar.goToToday')}
          >
            {t('calendar.today')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onPrevious}
            className="h-8 w-8"
            aria-label={t('calendar.previousPeriod')}
          >
            <ChevronLeft className="size-4" />
          </Button>
          {viewMode === 'week' ? (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-md px-2 py-1 transition-colors">
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{getWeekRange()}</span>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  key={`${viewMode}-${currentDate.getTime()}`}
                  mode="single"
                  selected={selectedCalendarDate || calendarDates[0]?.[0]}
                  onSelect={(date) => {
                    if (!date) {
                      setSelectedCalendarDate(undefined);
                      return;
                    }
                    setSelectedCalendarDate(date);
                    onCurrentDateChange(date);
                    setIsCalendarOpen(false);
                  }}
                  defaultMonth={calendarDates[0]?.[0]}
                  initialFocus
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2030}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="h-8 w-8"
            aria-label={t('calendar.nextPeriod')}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={(value) => onViewModeChange(value as 'week' | 'month')}>
            <TabsList className="w-auto">
              <TabsTrigger
                value="week"
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
              >
                {t('calendar.week')}
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
              >
                {t('calendar.month')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-2"
            aria-label={t('calendar.bookMeetingAria')}
            onClick={onBookMeeting}
          >
            <Pen className="size-4" />
            {t('calendar.bookMeeting')}
          </Button>
          {provider && (
            <div className="flex items-center">
              <Image
                src={provider === 'google' ? '/icons/gmail.png' : '/icons/outlook.png'}
                alt={provider === 'google' ? t('calendar.gmail') : t('calendar.outlook')}
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
          )}
        </div>
      </div>
      <Separator className="absolute bottom-[-1px] left-0 right-0" />
    </div>
  );
};

