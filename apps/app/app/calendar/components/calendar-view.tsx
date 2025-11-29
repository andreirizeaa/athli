'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Pen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SidePanel } from '@/components/app/side-panel';
import { mockAthletes, type Athlete } from '@/components/app/app-shell';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, eachWeekOfInterval, isSameDay, startOfDay, endOfDay, setHours } from 'date-fns';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  description?: string;
  location?: string;
}

export const CalendarView = () => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventsCache, setEventsCache] = useState<Map<string, CalendarEvent[]>>(new Map());
  const [fetchedRanges, setFetchedRanges] = useState<Array<{ start: string; end: string }>>([]);
  const [isBookMeetingOpen, setIsBookMeetingOpen] = useState(false);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    startTime: '',
    duration: '',
    description: '',
    location: '',
  });
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartMinutes, setDragStartMinutes] = useState<number | null>(null);
  const [dragEndMinutes, setDragEndMinutes] = useState<number | null>(null);
  const [dragDate, setDragDate] = useState<Date | null>(null);
  const [dragDayIndex, setDragDayIndex] = useState<number | null>(null);
  const [clickY, setClickY] = useState<number | null>(null);
  const [clickHeight, setClickHeight] = useState<number | null>(null);

  // Fuzzy match function for athlete search
  const isFuzzyMatch = (text: string, query: string) => {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return false;
    }

    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }

    let textIndex = 0;
    let queryIndex = 0;

    while (textIndex < normalizedText.length && queryIndex < normalizedQuery.length) {
      if (normalizedText[textIndex] === normalizedQuery[queryIndex]) {
        queryIndex += 1;
      }
      textIndex += 1;
    }

    return queryIndex === normalizedQuery.length;
  };

  // Filter athletes based on search query
  const filteredAthletes = useMemo(() => {
    const query = inviteSearchQuery.trim();
    if (!query) {
      return [];
    }
    return mockAthletes.filter((athlete) => {
      const hasMatch =
        isFuzzyMatch(athlete.name, query) ||
        isFuzzyMatch(athlete.email, query) ||
        isFuzzyMatch(athlete.phone, query) ||
        isFuzzyMatch(athlete.country, query);
      return hasMatch && !selectedAthletes.find((a) => a.id === athlete.id);
    });
  }, [inviteSearchQuery, selectedAthletes]);

  // Check if required fields are filled
  const isFormValid = useMemo(() => {
    return (
      meetingForm.title.trim() !== '' &&
      meetingForm.date !== '' &&
      meetingForm.startTime !== '' &&
      meetingForm.duration !== '' &&
      selectedAthletes.length > 0
    );
  }, [meetingForm.title, meetingForm.date, meetingForm.startTime, meetingForm.duration, selectedAthletes.length]);

  // Calculate time from Y position (snapped to 15-minute intervals)
  const getTimeFromPosition = (y: number, height: number, date: Date) => {
    const percentage = (y / height) * 100;
    const totalMinutes = (percentage / 100) * (24 * 60);
    const hour = Math.floor(totalMinutes / 60);
    const minutes = Math.floor((totalMinutes % 60) / 15) * 15; // Snap to 15-minute intervals
    
    const clickedDate = new Date(date);
    clickedDate.setHours(hour, minutes, 0, 0);
    
    return {
      date: clickedDate,
      totalMinutes: hour * 60 + minutes,
    };
  };

  // Handle mouse down for drag start
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, date: Date, dayIndex: number) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-event]')) {
      return;
    }

    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickYPos = e.clientY - rect.top;
    const { date: clickedDate, totalMinutes } = getTimeFromPosition(clickYPos, rect.height, date);

    setIsDragging(true);
    setDragStartMinutes(totalMinutes);
    setDragEndMinutes(totalMinutes);
    setDragDate(clickedDate);
    setDragDayIndex(dayIndex);
    setClickY(clickYPos);
    setClickHeight(rect.height);
  };

  // Handle mouse move for drag
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, date: Date, dayIndex: number) => {
    if (!isDragging || dragDayIndex !== dayIndex || dragStartMinutes === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const moveY = e.clientY - rect.top;
    const { totalMinutes } = getTimeFromPosition(moveY, rect.height, date);

    setDragEndMinutes(totalMinutes);
  };

  // Handle mouse up for drag end
  const handleMouseUp = () => {
    if (!isDragging || dragStartMinutes === null || dragEndMinutes === null || !dragDate) return;

    const startMinutes = Math.min(dragStartMinutes, dragEndMinutes);
    const endMinutes = Math.max(dragStartMinutes, dragEndMinutes);
    
    // Check if user just clicked (no drag) - start and end are the same
    const isClick = dragStartMinutes === dragEndMinutes;
    
    let finalStartMinutes: number;
    let durationMinutes: number;
    
    if (isClick && clickY !== null && clickHeight !== null) {
      // Calculate the actual position within the day (not snapped)
      const percentage = (clickY / clickHeight) * 100;
      const actualTotalMinutes = (percentage / 100) * (24 * 60);
      const actualHour = Math.floor(actualTotalMinutes / 60);
      const actualMinutes = actualTotalMinutes % 60;
      
      // Find which 15-minute block this is in
      const blockStartMinutes = actualHour * 60 + Math.floor(actualMinutes / 15) * 15;
      const positionInBlock = actualMinutes % 15;
      
      // Check if click was in top half (first 7.5 minutes) or bottom half (last 7.5 minutes) of the block
      const isTopHalf = positionInBlock < 7.5;
      
      if (isTopHalf) {
        // Top half: start from the full hour, end at the middle (30 minutes)
        finalStartMinutes = blockStartMinutes;
        durationMinutes = 30;
      } else {
        // Bottom half: start from the middle, end at the next full hour (15 minutes)
        finalStartMinutes = blockStartMinutes + 15;
        durationMinutes = 15;
      }
    } else {
      // Dragged - use calculated values
      finalStartMinutes = startMinutes;
      durationMinutes = endMinutes - startMinutes;
    }

    if (durationMinutes > 0) {
      const startDate = new Date(dragDate);
      startDate.setHours(Math.floor(finalStartMinutes / 60), finalStartMinutes % 60, 0, 0);
      
      const dateString = format(startDate, 'yyyy-MM-dd');
      const timeString = format(startDate, 'HH:mm');
      const duration = durationMinutes.toString();

      // Check if duration is over 90 minutes (custom)
      const isCustom = durationMinutes > 90 || !['15', '30', '45', '60', '75', '90'].includes(duration);

      setMeetingForm({
        ...meetingForm,
        date: dateString,
        startTime: timeString,
        duration,
      });
      setIsBookMeetingOpen(true);
      setIsCustomDuration(isCustom);
    }

    setIsDragging(false);
    setDragStartMinutes(null);
    setDragEndMinutes(null);
    setDragDate(null);
    setDragDayIndex(null);
    setClickY(null);
    setClickHeight(null);
  };

  // Global mouse handlers for drag
  useEffect(() => {
    if (!isDragging || dragStartMinutes === null || !dragDate || dragDayIndex === null) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Find the day column element
      const dayColumns = document.querySelectorAll('[data-day-column]');
      if (dayColumns.length <= dragDayIndex) return;
      
      const dayColumn = dayColumns[dragDayIndex] as HTMLElement;
      const rect = dayColumn.getBoundingClientRect();
      const moveY = e.clientY - rect.top;
      
      if (moveY >= 0 && moveY <= rect.height) {
        const { totalMinutes } = getTimeFromPosition(moveY, rect.height, dragDate);
        setDragEndMinutes(totalMinutes);
      }
    };

    const handleGlobalMouseUp = () => {
      if (dragStartMinutes === null || dragEndMinutes === null || !dragDate) return;

      const startMinutes = Math.min(dragStartMinutes, dragEndMinutes);
      const endMinutes = Math.max(dragStartMinutes, dragEndMinutes);
      
      // Check if user just clicked (no drag) - start and end are the same
      const isClick = dragStartMinutes === dragEndMinutes;
      
      let finalStartMinutes: number;
      let durationMinutes: number;
      
      if (isClick && clickY !== null && clickHeight !== null) {
        // Calculate the actual position within the day (not snapped)
        const percentage = (clickY / clickHeight) * 100;
        const actualTotalMinutes = (percentage / 100) * (24 * 60);
        const actualHour = Math.floor(actualTotalMinutes / 60);
        const actualMinutes = actualTotalMinutes % 60;
        
        // Find which 15-minute block this is in
        const blockStartMinutes = actualHour * 60 + Math.floor(actualMinutes / 15) * 15;
        const positionInBlock = actualMinutes % 15;
        
        // Check if click was in top half (first 7.5 minutes) or bottom half (last 7.5 minutes) of the block
        const isTopHalf = positionInBlock < 7.5;
        
        if (isTopHalf) {
          // Top half: start from the full hour, end at the middle (30 minutes)
          finalStartMinutes = blockStartMinutes;
          durationMinutes = 30;
        } else {
          // Bottom half: start from the middle, end at the next full hour (15 minutes)
          finalStartMinutes = blockStartMinutes + 15;
          durationMinutes = 15;
        }
      } else {
        // Dragged - use calculated values
        finalStartMinutes = startMinutes;
        durationMinutes = endMinutes - startMinutes;
      }

      if (durationMinutes > 0) {
        const startDate = new Date(dragDate);
        startDate.setHours(Math.floor(finalStartMinutes / 60), finalStartMinutes % 60, 0, 0);
        
        const dateString = format(startDate, 'yyyy-MM-dd');
        const timeString = format(startDate, 'HH:mm');
        const duration = durationMinutes.toString();

        // Check if duration is over 90 minutes (custom)
        const isCustom = durationMinutes > 90 || !['15', '30', '45', '60', '75', '90'].includes(duration);

        setMeetingForm((prev) => ({
          ...prev,
          date: dateString,
          startTime: timeString,
          duration,
        }));
        setIsBookMeetingOpen(true);
        setIsCustomDuration(isCustom);
      }

      setIsDragging(false);
      setDragStartMinutes(null);
      setDragEndMinutes(null);
      setDragDate(null);
      setDragDayIndex(null);
      setClickY(null);
      setClickHeight(null);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStartMinutes, dragEndMinutes, dragDate, dragDayIndex]);

  // Day names for header
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get start of week (Monday)
  const getWeekStart = (date: Date) => {
    return startOfWeek(date, { weekStartsOn: 1 });
  };

  // Calculate dates for the visible period
  const calendarDates = useMemo(() => {
    if (viewMode === 'week') {
      // Always show 1 week
      const weekStart = getWeekStart(currentDate);
      const weekDates: Date[] = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        weekDates.push(addDays(weekStart, dayIndex));
      }

      return [weekDates];
    } else {
      // Month view
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const weeks = eachWeekOfInterval(
        { start: monthStart, end: monthEnd },
        { weekStartsOn: 1 }
      );

      return weeks.map((weekStart) => {
        return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      });
    }
  }, [viewMode, currentDate]);

  // Calculate number of rows for month view
  const numberOfRows = useMemo(() => {
    if (viewMode === 'month') {
      return calendarDates.length;
    }
    return 1;
  }, [viewMode, calendarDates.length]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return format(date, 'd MMM');
  };

  // Format date for event matching
  const getDateKey = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateKey = getDateKey(date);
    return events.filter((event) => {
      const eventDate = event.start.dateTime
        ? new Date(event.start.dateTime).toISOString().split('T')[0]
        : event.start.date;
      return eventDate === dateKey;
    });
  };

  // Get events for a specific date and hour (for grid positioning)
  const getEventsForDateAndHour = (date: Date, hour: number): CalendarEvent[] => {
    const dateEvents = getEventsForDate(date);
    return dateEvents.filter((event) => {
      if (!event.start.dateTime) return false;
      const eventDate = new Date(event.start.dateTime);
      return eventDate.getHours() === hour;
    });
  };

  // Calculate event position and height for grid display
  const getEventStyle = (
    event: CalendarEvent,
    allEvents: CalendarEvent[],
    index: number
  ): { top: string; height: string; left?: string; width?: string; marginTop?: string; marginBottom?: string } => {
    if (!event.start.dateTime || !event.end.dateTime) {
      return { top: '0%', height: '100%' };
    }

    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);
    
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    
    // Handle events that end at midnight (00:00) - treat as 24:00 (1440 minutes)
    let endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    
    // Check if end time is on a different day (e.g., event from 11pm to 12am)
    const startDate = new Date(startTime);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endTime);
    endDate.setHours(0, 0, 0, 0);
    
    // If end date is different (next day) and end time is 00:00, treat as 24:00
    if (endDate.getTime() > startDate.getTime() && endTime.getHours() === 0 && endTime.getMinutes() === 0) {
      endMinutes = 24 * 60; // 1440 minutes (midnight of next day = end of current day)
    }
    
    const duration = endMinutes - startMinutes;
    
    const topPercent = (startMinutes / (24 * 60)) * 100;
    const heightPercent = (duration / (24 * 60)) * 100;
    
    // Check if event starts exactly on the hour (minutes === 0)
    const startsOnHour = startTime.getMinutes() === 0;
    const topOffset = startsOnHour ? 2 : 1; // Extra 1px gap for full hours
    
    // Use calc() to add gap at top and reduce height
    // This creates gaps between meeting hours without using margin/padding
    return {
      top: `calc(${topPercent}% + ${topOffset}px)`,
      height: `calc(${heightPercent}% - ${topOffset + 1}px)`, // topOffset + 1px for bottom gap
    };
  };

  // Calculate date range for the visible period
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = addDays(weekStart, 6);
      return {
        start: startOfDay(weekStart).toISOString(),
        end: endOfDay(weekEnd).toISOString(),
      };
    } else {
      // Month view
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      return {
        start: startOfDay(monthStart).toISOString(),
        end: endOfDay(monthEnd).toISOString(),
      };
    }
  }, [viewMode, currentDate]);

  // Calculate extended range for prefetching (fetch more than needed to cache)
  const extendedRange = useMemo(() => {
    if (viewMode === 'week') {
      // Fetch 4 weeks worth (2 weeks before, current week, 2 weeks after)
      const weekStart = getWeekStart(currentDate);
      const extendedStart = subWeeks(weekStart, 2);
      const extendedEnd = addWeeks(weekStart, 3);
      return {
        start: startOfDay(extendedStart).toISOString(),
        end: endOfDay(addDays(extendedEnd, 6)).toISOString(),
      };
    } else {
      // For month view, fetch current month plus one month before and after
      const monthStart = startOfMonth(currentDate);
      const extendedStart = subWeeks(monthStart, 4);
      const monthEnd = endOfMonth(currentDate);
      const extendedEnd = addWeeks(monthEnd, 4);
      return {
        start: startOfDay(extendedStart).toISOString(),
        end: endOfDay(extendedEnd).toISOString(),
      };
    }
  }, [viewMode, currentDate]);

  // Check if we already have events for the current range
  const hasCachedEvents = useMemo(() => {
    return fetchedRanges.some(
      (range) =>
        range.start <= dateRange.start && range.end >= dateRange.end
    );
  }, [dateRange, fetchedRanges]);

  // Filter events from cache for current visible range
  useEffect(() => {
    if (hasCachedEvents && eventsCache.size > 0) {
      const allCachedEvents: CalendarEvent[] = [];
      eventsCache.forEach((cachedEvents) => {
        allCachedEvents.push(...cachedEvents);
      });

      // Deduplicate events by ID
      const uniqueEventsMap = new Map<string, CalendarEvent>();
      allCachedEvents.forEach((event) => {
        if (!uniqueEventsMap.has(event.id)) {
          uniqueEventsMap.set(event.id, event);
        }
      });
      const deduplicatedEvents = Array.from(uniqueEventsMap.values());

      // Filter events within the current date range
      const filteredEvents = deduplicatedEvents.filter((event) => {
        const eventDate = event.start.dateTime
          ? new Date(event.start.dateTime)
          : new Date(event.start.date || '');
        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);
        return eventDate >= rangeStart && eventDate <= rangeEnd;
      });

      setEvents(filteredEvents);
      setIsLoading(false);
    }
  }, [hasCachedEvents, dateRange, eventsCache]);

  // Fetch calendar events for extended range (with caching)
  useEffect(() => {
    const fetchEvents = async () => {
      // Only show loading on initial load or if we don't have cached data
      if (!hasCachedEvents) {
        setIsLoading(true);
      }

      try {
        const url = new URL('/api/calendar/events', window.location.origin);
        url.searchParams.set('timeMin', extendedRange.start);
        url.searchParams.set('timeMax', extendedRange.end);

        const response = await fetch(url.toString());
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          const errorMessage = errorData.error || `Failed to fetch events: ${response.status}`;
          console.error('Calendar events API error:', errorMessage, response.status);

          // If it's an auth error, the user might need to reconnect
          if (response.status === 401 || response.status === 403) {
            console.warn('Calendar authentication issue:', errorMessage);
          }

          // Only clear events if we don't have cached data
          if (!hasCachedEvents) {
            setEvents([]);
          }
          return;
        }

        const data = await response.json();
        const fetchedEvents = Array.isArray(data) ? data : [];

        // Cache the fetched events
        const cacheKey = `${extendedRange.start}-${extendedRange.end}`;
        setEventsCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(cacheKey, fetchedEvents);
          return newCache;
        });

        // Track that we've fetched this range
        setFetchedRanges((prev) => {
          // Check if this range is already tracked
          const exists = prev.some(
            (range) => range.start === extendedRange.start && range.end === extendedRange.end
          );
          if (!exists) {
            return [...prev, { start: extendedRange.start, end: extendedRange.end }];
          }
          return prev;
        });

        // Filter events for current visible range
        const filteredEvents = fetchedEvents.filter((event) => {
          const eventDate = event.start.dateTime
            ? new Date(event.start.dateTime)
            : new Date(event.start.date || '');
          const rangeStart = new Date(dateRange.start);
          const rangeEnd = new Date(dateRange.end);
          return eventDate >= rangeStart && eventDate <= rangeEnd;
        });

        setEvents(filteredEvents);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        // Only clear events if we don't have cached data
        if (!hasCachedEvents) {
          setEvents([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [extendedRange.start, extendedRange.end, hasCachedEvents, dateRange]);

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 4));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 4));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getWeekRange = () => {
    if (viewMode === 'week') {
      const firstDate = calendarDates[0]?.[0];
      if (!firstDate) return '';
      return format(firstDate, 'd MMM yyyy');
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === today.getTime();
  };

  // Generate hours for time column (00:00 to 24:00)
  const hours = Array.from({ length: 25 }, (_, i) => i); // 0-24 to include the 24th hour (12pm next day)

  // Format hour for display (12AM, 1AM, 2AM, etc.)
  const formatHour = (hour: number): string => {
    if (hour === 0) return '12AM';
    if (hour < 12) return `${hour}AM`;
    if (hour === 12) return '12PM';
    if (hour === 24) return '12PM'; // 24th hour shows as 12PM
    return `${hour - 12}PM`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading calendar events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="w-full relative flex-shrink-0">
        <div className="w-full px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              className="h-8 w-8"
              aria-label="Previous period"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{getWeekRange()}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8"
              aria-label="Next period"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8"
              aria-label="Go to today"
            >
              Today
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')}>
              <TabsList className="w-auto">
                <TabsTrigger
                  value="week"
                  className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  Week
                </TabsTrigger>
                <TabsTrigger
                  value="month"
                  className="data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary dark:data-[state=active]:border-primary dark:data-[state=active]:bg-primary/5 dark:data-[state=active]:text-primary"
                >
                  Month
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              aria-label="Book a meeting"
              onClick={() => setIsBookMeetingOpen(true)}
            >
              <Pen className="size-4" />
              Book a meeting
            </Button>
          </div>
        </div>
        <Separator className="absolute bottom-[-1px] left-0 right-0" />
      </div>
      <div className="w-full flex-1 bg-background overflow-auto min-h-0">
        {viewMode === 'week' ? (
          // Week view: Grid layout like Google Calendar
          <div className="flex flex-col">
            {/* Day headers */}
            <div className="flex flex-shrink-0">
              <div className="w-16 flex-shrink-0 border-r border-border">
                {/* Empty space for time column header */}
              </div>
              {calendarDates[0]?.map((date, dayIndex) => {
                const isCurrentDay = isToday(date);
                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'flex-1 px-3 py-2',
                      dayIndex !== 0 && 'border-l border-border'
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'text-xs uppercase',
                          isCurrentDay ? 'text-primary' : 'text-muted-foreground'
                        )}
                      >
                        {dayNames[dayIndex]}
                      </span>
                      {isCurrentDay ? (
                        <span className="text-lg font-medium mt-1 flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                          {date.getDate()}
                        </span>
                      ) : (
                        <span className="text-lg font-medium mt-1">
                          {date.getDate()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Grid body with time column and day columns */}
            <div className="flex relative" style={{ minHeight: '1000px' }}>
              {/* Hour lines spanning full width including time column - only show 12pm line (hour 24) */}
              <div className="absolute inset-0 pointer-events-none z-0">
                <div
                  className="absolute left-16 right-0 border-t border-border"
                  style={{
                    top: `${(24 / 24) * 100}%`,
                  }}
                />
              </div>

              {/* Time column */}
              <div className="w-16 flex-shrink-0 border-r border-border relative z-10">
                <div className="absolute inset-0">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0"
                      style={{
                        top: `${(hour / 24) * 100}%`,
                        height: `${(1 / 24) * 100}%`,
                      }}
                    >
                      {hour !== 0 && hour !== 24 && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground -translate-y-1/2 bg-background">
                          {formatHour(hour)}
                        </span>
                      )}
                      {hour === 12 && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground -translate-y-1/2 bg-background">
                          12PM
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Day columns grid */}
              <div className="flex-1 flex relative z-10">
                {calendarDates[0]?.map((date, dayIndex) => {
                  const isCurrentDay = isToday(date);
                  const dateEvents = getEventsForDate(date);

                  return (
                    <div
                      key={dayIndex}
                      data-day-column
                      className={cn(
                        'flex-1 relative cursor-pointer',
                        dayIndex !== 0 && 'border-l border-border'
                      )}
                      onMouseDown={(e) => handleMouseDown(e, date, dayIndex)}
                      onMouseMove={(e) => handleMouseMove(e, date, dayIndex)}
                      onMouseUp={handleMouseUp}
                    >
                      {/* Hour lines */}
                      <div className="absolute inset-0 pointer-events-none">
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="absolute left-0 right-0 border-t border-border"
                            style={{
                              top: `${(hour / 24) * 100}%`,
                            }}
                          />
                        ))}
                      </div>

                      {/* Events positioned by time */}
                      <div className="absolute inset-0 p-1">
                        {dateEvents
                          .sort((a, b) => {
                            // Sort events by start time
                            const aStart = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0;
                            const bStart = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0;
                            return aStart - bStart;
                          })
                          .map((event, index) => {
                            const style = getEventStyle(event, dateEvents, index);
                            return (
                              <div
                                key={event.id}
                                data-event
                                className="absolute left-1 right-1 bg-orange-100 dark:bg-orange-900 border-l-2 border-orange-300 dark:border-orange-700 rounded px-1.5 py-0.5 cursor-pointer z-10"
                                style={style}
                                title={event.summary}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-medium text-black dark:text-white line-clamp-1">
                                    {event.start.dateTime
                                      ? format(new Date(event.start.dateTime), 'h:mm a')
                                      : ''}{' '}
                                    {event.summary}
                                  </span>
                                  {event.location && (
                                    <span className="text-[9px] text-black/70 dark:text-white/70 line-clamp-1">
                                      {event.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      
                      {/* Drag selection outline */}
                      {isDragging && dragStartMinutes !== null && dragEndMinutes !== null && dragDayIndex === dayIndex && (
                        <div
                          className="absolute left-1 right-1 bg-[#3f3c39]/20 dark:bg-foreground/20 border-2 border-[#3f3c39] dark:border-foreground rounded z-20 pointer-events-none"
                          style={{
                            top: `${(Math.min(dragStartMinutes, dragEndMinutes) / (24 * 60)) * 100}%`,
                            height: `${(Math.abs(dragEndMinutes - dragStartMinutes) / (24 * 60)) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // Month view: Grid layout
          <div className="h-full flex flex-col overflow-hidden">
            {/* Calendar grid - 7 columns, variable rows */}
            <div
              className="grid grid-cols-7 gap-px border-t border-b border-border bg-border h-full"
              style={{ 
                gridAutoRows: `calc(100% / ${numberOfRows})`
              }}
            >
              {calendarDates.map((weekDates, weekIndex) =>
                weekDates.map((date, dayIndex) => {
                  const dateEvents = getEventsForDate(date);
                  const isCurrentDay = isToday(date);
                  const isFirstRow = weekIndex === 0;

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={cn(
                        'bg-background flex flex-col h-full',
                        dayIndex !== 6 && 'border-r border-border'
                      )}
                    >
                      {/* Day header */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        {isFirstRow && (
                          <span
                            className={cn(
                              'text-[10px] uppercase pb-0',
                              isCurrentDay && 'text-primary'
                            )}
                          >
                            {dayNames[dayIndex]}
                          </span>
                        )}
                        <span
                          className={cn(
                            'text-xs text-center pt-0.5 pb-1',
                            isCurrentDay && 'text-primary font-semibold'
                          )}
                        >
                          {date.getDate()}
                        </span>
                      </div>

                      {/* Events */}
                      <div className="flex-1 flex flex-col gap-0.5 overflow-hidden min-h-0 px-1">
                        {dateEvents
                          .sort((a, b) => {
                            const aStart = a.start.dateTime ? new Date(a.start.dateTime).getTime() : 0;
                            const bStart = b.start.dateTime ? new Date(b.start.dateTime).getTime() : 0;
                            return aStart - bStart;
                          })
                          .map((event) => (
                            <div
                              key={event.id}
                              className="text-[10px] bg-orange-100 dark:bg-orange-900 border-l-2 border-orange-300 dark:border-orange-700 rounded px-1.5 py-0.5 truncate"
                              title={event.summary}
                            >
                              {event.start.dateTime && (
                                <span className="font-medium">
                                  {format(new Date(event.start.dateTime), 'h:mm a')}{' '}
                                </span>
                              )}
                              <span>{event.summary}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      <SidePanel
        open={isBookMeetingOpen}
        onOpenChange={setIsBookMeetingOpen}
        title="Book a meeting"
        footer={
          <div className="flex items-center justify-start gap-2">
            <Button
              type="button"
              disabled={!isFormValid}
              onClick={() => {
                // Handle save logic here
                console.log('Add meeting:', { ...meetingForm, invitedAthletes: selectedAthletes });
                setIsBookMeetingOpen(false);
                setMeetingForm({
                  title: '',
                  date: '',
                  startTime: '',
                  duration: '',
                  description: '',
                  location: '',
                });
                setSelectedAthletes([]);
                setInviteSearchQuery('');
                setIsCustomDuration(false);
              }}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
                onClick={() => {
                  setIsBookMeetingOpen(false);
                  setMeetingForm({
                    title: '',
                    date: '',
                    startTime: '',
                    duration: '',
                    description: '',
                    location: '',
                  });
                  setSelectedAthletes([]);
                  setInviteSearchQuery('');
                  setIsCustomDuration(false);
                }}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Meeting title"
              value={meetingForm.title}
              onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>
              Invite <span className="text-destructive">*</span>
            </Label>
            <Popover open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={isInviteOpen}
                  className="w-full justify-start text-left font-normal"
                >
                  {inviteSearchQuery || 'Search athletes...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search athletes..."
                    value={inviteSearchQuery}
                    onValueChange={setInviteSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No athletes found.</CommandEmpty>
                    <CommandGroup>
                      {filteredAthletes.map((athlete) => {
                        const initials = athlete.name
                          .split(' ')
                          .map((part) => part.charAt(0).toUpperCase())
                          .slice(0, 2)
                          .join('');
                        return (
                          <CommandItem
                            key={athlete.id}
                            value={athlete.id}
                            onSelect={() => {
                              if (!selectedAthletes.find((a) => a.id === athlete.id)) {
                                setSelectedAthletes([...selectedAthletes, athlete]);
                              }
                              setInviteSearchQuery('');
                              setIsInviteOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={athlete.avatar} alt={athlete.name} />
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <span className="flex-1">{athlete.name}</span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedAthletes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedAthletes.map((athlete) => {
                  const initials = athlete.name
                    .split(' ')
                    .map((part) => part.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join('');
                  return (
                    <div
                      key={athlete.id}
                      className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md text-sm"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={athlete.avatar} alt={athlete.name} />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <span>{athlete.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAthletes(selectedAthletes.filter((a) => a.id !== athlete.id));
                        }}
                        className="ml-1 hover:opacity-70"
                        aria-label={`Remove ${athlete.name}`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              value={meetingForm.date}
              onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 w-[30%]">
              <Label htmlFor="startTime">
                Start time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                value={meetingForm.startTime}
                onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2 w-[70%]">
              <Label htmlFor="duration">
                Duration <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Select
                  value={meetingForm.duration && ['15', '30', '45', '60', '75', '90'].includes(meetingForm.duration) ? meetingForm.duration : (isCustomDuration || (meetingForm.duration && !['15', '30', '45', '60', '75', '90'].includes(meetingForm.duration))) ? 'custom' : ''}
                  onValueChange={(value) => {
                    if (value !== 'custom') {
                      setMeetingForm({ ...meetingForm, duration: value });
                      setIsCustomDuration(false);
                    } else {
                      setIsCustomDuration(true);
                      setMeetingForm({ ...meetingForm, duration: '' });
                    }
                  }}
                >
                  <SelectTrigger className={(isCustomDuration || (meetingForm.duration && !['15', '30', '45', '60', '75', '90'].includes(meetingForm.duration))) ? 'w-[50%]' : 'w-full'}>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 mins</SelectItem>
                    <SelectItem value="30">30 mins</SelectItem>
                    <SelectItem value="45">45 mins</SelectItem>
                    <SelectItem value="60">60 mins</SelectItem>
                    <SelectItem value="75">75 mins</SelectItem>
                    <SelectItem value="90">90 mins</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {(isCustomDuration || (meetingForm.duration && !['15', '30', '45', '60', '75', '90'].includes(meetingForm.duration))) && (
                  <Input
                    id="duration"
                    type="number"
                    placeholder="Custom minutes"
                    value={meetingForm.duration}
                    onChange={(e) => setMeetingForm({ ...meetingForm, duration: e.target.value })}
                    min="1"
                    className="w-[50%]"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Meeting location"
              value={meetingForm.location}
              onChange={(e) => setMeetingForm({ ...meetingForm, location: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Meeting description"
              value={meetingForm.description}
              onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
              rows={4}
            />
          </div>
        </div>
      </SidePanel>
    </div>
  );
};

