'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Pen, Trash2, Mail, X, Clock, Users } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SidePanel } from '@/components/app/side-panel';
import { mockAthletes, type Athlete } from '@/components/app/app-shell';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MultiAsyncSelect, type Option } from '@/components/ui/multi-async-select';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, eachWeekOfInterval, isSameDay, startOfDay, endOfDay, setHours } from 'date-fns';
import { toast } from 'sonner';
import { deleteCalendarEvent, updateCalendarEvent, sendAppointmentInfo } from '@/lib/calendar-service';
import Image from 'next/image';

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
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

type ClientCalendarViewProps = {
  clientEmail: string;
  provider: 'google' | 'outlook' | null;
};

export const ClientCalendarView = ({ clientEmail, provider }: ClientCalendarViewProps) => {
  const { user } = useUser();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventsCache, setEventsCache] = useState<Map<string, CalendarEvent[]>>(new Map());
  const [fetchedRanges, setFetchedRanges] = useState<Array<{ start: string; end: string }>>([]);
  const [isBookMeetingOpen, setIsBookMeetingOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    location: '',
  });
  const [selectedAthleteEmails, setSelectedAthleteEmails] = useState<string[]>([clientEmail]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartMinutes, setDragStartMinutes] = useState<number | null>(null);
  const [dragEndMinutes, setDragEndMinutes] = useState<number | null>(null);
  const [dragDate, setDragDate] = useState<Date | null>(null);
  const [dragDayIndex, setDragDayIndex] = useState<number | null>(null);
  const [clickY, setClickY] = useState<number | null>(null);
  const [clickHeight, setClickHeight] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [preferredSide, setPreferredSide] = useState<'top' | 'bottom'>('bottom');
  const [isEditMeetingOpen, setIsEditMeetingOpen] = useState(false);
  const [editClients, setEditClients] = useState<string[]>([]);
  const [editClientOptions, setEditClientOptions] = useState<Option[]>([]);
  const [editClientInput, setEditClientInput] = useState('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({
    emails: [] as string[],
    subject: '',
    message: '',
  });
  const [emailOptions, setEmailOptions] = useState<Option[]>([]);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const eventRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Prevent scrolling and click propagation when popover is open
  useEffect(() => {
    if (dropdownOpen) {
      document.body.style.overflow = 'hidden';
      
      // Prevent clicks from propagating to underlying elements when clicking outside popover
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const popoverContent = document.querySelector('[data-slot="popover-content"]');
        
        // If clicking outside the popover content, prevent all event propagation
        if (popoverContent && !popoverContent.contains(target)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          // Close the popover
          setDropdownOpen(false);
          setSelectedEvent(null);
          setPopoverAnchor(null);
        }
      };
      
      // Use capture phase to intercept clicks before they reach other handlers
      document.addEventListener('click', handleClick, true);
      document.addEventListener('mousedown', handleClick, true);
      
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('click', handleClick, true);
        document.removeEventListener('mousedown', handleClick, true);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [dropdownOpen]);

  // Convert athletes to options for MultiAsyncSelect (email as value, name as label)
  // Lock to only the current client
  const athleteOptions = useMemo(() => {
    const clientAthlete = mockAthletes.find((athlete) => athlete.email.toLowerCase() === clientEmail.toLowerCase());
    if (!clientAthlete) {
      return [];
    }
    return [{
      label: clientAthlete.name,
      value: clientAthlete.email,
    }];
  }, [clientEmail]);

  // Combine athlete options with custom emails for email modal
  // Lock to only the current client
  const emailOptionsWithSearch = useMemo(() => {
    const options = [...athleteOptions];
    // Don't allow adding custom emails - only the client
    // Remove duplicates
    return options.filter((opt, index, self) => 
      index === self.findIndex((o) => o.value === opt.value)
    );
  }, [athleteOptions]);

  // Combine athlete options with custom emails for edit clients
  // Lock to only the current client
  const editClientOptionsWithSearch = useMemo(() => {
    const options = [...athleteOptions];
    // Don't allow adding custom emails - only the client
    // Remove duplicates
    return options.filter((opt, index, self) => 
      index === self.findIndex((o) => o.value === opt.value)
    );
  }, [athleteOptions]);

  // Set default location when create panel opens and ensure client email is selected
  useEffect(() => {
    if (isBookMeetingOpen && !meetingForm.location) {
      setMeetingForm((prev) => ({ ...prev, location: 'In person (Gym)' }));
    }
    // Always ensure client email is selected when booking meeting
    if (isBookMeetingOpen && !selectedAthleteEmails.includes(clientEmail)) {
      setSelectedAthleteEmails([clientEmail]);
    }
  }, [isBookMeetingOpen, clientEmail, selectedAthleteEmails]);

  // Check if required fields are filled
  const isFormValid = useMemo(() => {
    return (
      meetingForm.title.trim() !== '' &&
      meetingForm.date !== '' &&
      meetingForm.startTime !== '' &&
      meetingForm.endTime !== '' &&
      meetingForm.location !== '' &&
      selectedAthleteEmails.length > 0
    );
  }, [meetingForm.title, meetingForm.date, meetingForm.startTime, meetingForm.endTime, meetingForm.location, selectedAthleteEmails.length]);
  
  // Check if edit form is valid
  const isEditFormValid = useMemo(() => {
    return (
      meetingForm.title.trim() !== '' &&
      meetingForm.date !== '' &&
      meetingForm.startTime !== '' &&
      meetingForm.endTime !== '' &&
      meetingForm.location !== ''
    );
  }, [meetingForm.title, meetingForm.date, meetingForm.startTime, meetingForm.endTime, meetingForm.location]);

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
      
      const endDate = new Date(dragDate);
      endDate.setHours(Math.floor((finalStartMinutes + durationMinutes) / 60), (finalStartMinutes + durationMinutes) % 60, 0, 0);
      
      const dateString = format(startDate, 'yyyy-MM-dd');
      const startTimeString = format(startDate, 'HH:mm');
      const endTimeString = format(endDate, 'HH:mm');

      setMeetingForm({
        ...meetingForm,
        date: dateString,
        startTime: startTimeString,
        endTime: endTimeString,
      });
      setIsBookMeetingOpen(true);
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
        
        const endDate = new Date(dragDate);
        endDate.setHours(Math.floor((finalStartMinutes + durationMinutes) / 60), (finalStartMinutes + durationMinutes) % 60, 0, 0);
        
        const dateString = format(startDate, 'yyyy-MM-dd');
        const startTimeString = format(startDate, 'HH:mm');
        const endTimeString = format(endDate, 'HH:mm');

        setMeetingForm((prev) => ({
          ...prev,
          date: dateString,
          startTime: startTimeString,
          endTime: endTimeString,
        }));
        setIsBookMeetingOpen(true);
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

      // Filter events within the current date range AND where client email is a guest
      const filteredEvents = deduplicatedEvents.filter((event) => {
        const eventDate = event.start.dateTime
          ? new Date(event.start.dateTime)
          : new Date(event.start.date || '');
        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);
        const isInRange = eventDate >= rangeStart && eventDate <= rangeEnd;
        
        // Check if client email is in attendees
        const hasClientAsGuest = event.attendees?.some(
          (attendee) => attendee.email?.toLowerCase() === clientEmail.toLowerCase()
        ) ?? false;
        
        return isInRange && hasClientAsGuest;
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

        // Filter events for current visible range AND where client email is a guest
        const filteredEvents = fetchedEvents.filter((event) => {
          const eventDate = event.start.dateTime
            ? new Date(event.start.dateTime)
            : new Date(event.start.date || '');
          const rangeStart = new Date(dateRange.start);
          const rangeEnd = new Date(dateRange.end);
          const isInRange = eventDate >= rangeStart && eventDate <= rangeEnd;
          
          // Check if client email is in attendees
          const hasClientAsGuest = event.attendees?.some(
            (attendee) => attendee.email?.toLowerCase() === clientEmail.toLowerCase()
          ) ?? false;
          
          return isInRange && hasClientAsGuest;
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

  const handleEditMeeting = () => {
    if (!selectedEvent) return;
    
    // Initialize form with selected event data
    const startDate = selectedEvent.start.dateTime
      ? new Date(selectedEvent.start.dateTime)
      : selectedEvent.start.date
        ? new Date(selectedEvent.start.date)
        : new Date();
    
    const endDate = selectedEvent.end.dateTime
      ? new Date(selectedEvent.end.dateTime)
      : selectedEvent.end.date
        ? new Date(selectedEvent.end.date)
        : new Date(startDate.getTime() + 60 * 60 * 1000);
    
    setMeetingForm({
      title: selectedEvent.summary,
      date: format(startDate, 'yyyy-MM-dd'),
      startTime: format(startDate, 'HH:mm'),
      endTime: format(endDate, 'HH:mm'),
      description: selectedEvent.description || '',
      location: selectedEvent.location || 'In person (Gym)',
    });
    
    // Initialize clients from attendees (excluding user email)
    // Always ensure client email is included
    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
    const initialClients = (selectedEvent.attendees || [])
      .map((attendee) => attendee.email?.toLowerCase())
      .filter((email): email is string => !!email && email !== userEmail);
    
    // Ensure client email is always included
    const clientsWithClient = initialClients.includes(clientEmail.toLowerCase())
      ? initialClients
      : [...initialClients, clientEmail.toLowerCase()];
    
    setEditClients(clientsWithClient);
    // Initialize options with existing clients
    setEditClientOptions(clientsWithClient.map((email) => ({ label: email, value: email })));
    setIsEditMeetingOpen(true);
    setDropdownOpen(false);
  };

  const handleDeleteMeeting = async () => {
    if (!selectedEvent) return;
    
    try {
      await deleteCalendarEvent({ eventId: selectedEvent.id });
      toast.success('Meeting deleted successfully');
      setDropdownOpen(false);
      setSelectedEvent(null);
      // Refresh events by refetching
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
    } catch (error) {
      toast.error('Failed to delete meeting');
      console.error('Error deleting meeting:', error);
    }
  };

  const handleEmailMeeting = () => {
    // Pre-select client email
    setEmailForm((prev) => ({
      ...prev,
      emails: [clientEmail],
    }));
    setIsEmailModalOpen(true);
    // Keep dropdown open
  };


  const handleSendEmail = async () => {
    if (!selectedEvent || !emailForm.subject.trim() || emailForm.emails.length === 0) {
      return;
    }

    try {
      await sendAppointmentInfo({
        emails: emailForm.emails,
        subject: emailForm.subject,
        message: emailForm.message,
        eventId: selectedEvent.id,
      });
      toast.success('Email sent successfully');
      setIsEmailModalOpen(false);
      setEmailForm({
        emails: [],
        subject: '',
        message: '',
      });
      // Keep dropdown open after sending email
    } catch (error) {
      toast.error('Failed to send email');
      console.error('Error sending email:', error);
    }
  };

  const handleUpdateMeeting = async (updatedData: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    description: string;
    location: string;
  }) => {
    if (!selectedEvent) return;

    try {
      const startDateTime = new Date(`${updatedData.date}T${updatedData.startTime}`);
      const endDateTime = new Date(`${updatedData.date}T${updatedData.endTime}`);

      await updateCalendarEvent({
        eventId: selectedEvent.id,
        summary: updatedData.title,
        start: {
          dateTime: startDateTime.toISOString(),
        },
        end: {
          dateTime: endDateTime.toISOString(),
        },
        description: updatedData.description || undefined,
        location: updatedData.location || undefined,
      });

      toast.success('Meeting updated successfully');
      setIsEditMeetingOpen(false);
      setDropdownOpen(false);
      // Refresh events would happen here
    } catch (error) {
      toast.error('Failed to update meeting');
      console.error('Error updating meeting:', error);
    }
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
              variant="secondary"
              size="sm"
              onClick={handleToday}
              className="h-8"
              aria-label="Go to today"
            >
              Today
            </Button>
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
            {provider && (
              <div className="flex items-center">
                <Image
                  src={provider === 'google' ? '/icons/gmail.png' : '/icons/outlook.png'}
                  alt={provider === 'google' ? 'Gmail' : 'Outlook'}
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
                                ref={(el) => {
                                  if (el) eventRefs.current.set(event.id, el);
                                  else eventRefs.current.delete(event.id);
                                }}
                                data-event
                                className="absolute left-1 right-1 bg-orange-100 dark:bg-orange-900 border-l-2 border-orange-300 dark:border-orange-700 rounded px-1.5 py-0.5 cursor-pointer z-10"
                                style={style}
                                title={event.summary}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const windowHeight = window.innerHeight;
                                  const spaceBelow = windowHeight - rect.bottom;
                                  const spaceAbove = rect.top;
                                  // If there's less than 350px below (approximate popover height) and more space above, prefer top
                                  const shouldShowAbove = spaceBelow < 350 && spaceAbove > spaceBelow;
                                  setPreferredSide(shouldShowAbove ? 'top' : 'bottom');
                                  setPopoverAnchor(e.currentTarget);
                                  setSelectedEvent(event);
                                  setDropdownOpen(true);
                                }}
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
                          <span className="text-[10px] uppercase pb-0 text-muted-foreground">
                            {dayNames[dayIndex]}
                          </span>
                        )}
                        {isCurrentDay ? (
                          <span className="text-xs text-center pt-0.5 pb-1 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-medium">
                          {date.getDate()}
                        </span>
                        ) : (
                          <span className="text-xs text-center pt-0.5 pb-1">
                            {date.getDate()}
                          </span>
                        )}
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
                              ref={(el) => {
                                if (el) eventRefs.current.set(event.id, el);
                                else eventRefs.current.delete(event.id);
                              }}
                              className="text-[10px] bg-orange-100 dark:bg-orange-900 border-l-2 border-orange-300 dark:border-orange-700 rounded px-1.5 py-0.5 truncate cursor-pointer"
                              title={event.summary}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const windowHeight = window.innerHeight;
                                const spaceBelow = windowHeight - rect.bottom;
                                const spaceAbove = rect.top;
                                // If there's less than 350px below (approximate popover height) and more space above, prefer top
                                const shouldShowAbove = spaceBelow < 350 && spaceAbove > spaceBelow;
                                setPreferredSide(shouldShowAbove ? 'top' : 'bottom');
                                setPopoverAnchor(e.currentTarget);
                                setSelectedEvent(event);
                                setDropdownOpen(true);
                              }}
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
                console.log('Add meeting:', { ...meetingForm, invitedAthletes: selectedAthleteEmails });
                setIsBookMeetingOpen(false);
                setMeetingForm({
                  title: '',
                  date: '',
                  startTime: '',
                  endTime: '',
                  description: '',
                  location: '',
                });
                setSelectedAthleteEmails([clientEmail]);
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
                    endTime: '',
                    description: '',
                    location: '',
                  });
                  setSelectedAthleteEmails([clientEmail]);
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
            <MultiAsyncSelect
              options={athleteOptions}
              value={selectedAthleteEmails}
              onValueChange={(values) => {
                // Always ensure client email is included
                if (!values.includes(clientEmail)) {
                  setSelectedAthleteEmails([clientEmail]);
                } else {
                  setSelectedAthleteEmails(values);
                }
              }}
              placeholder="Client"
              searchPlaceholder="Client"
              hideSelectAll
            />
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 w-[50%]">
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
            <div className="flex flex-col gap-2 w-[50%]">
              <Label htmlFor="location">
                Location <span className="text-destructive">*</span>
              </Label>
              <Select
                value={meetingForm.location || 'In person (Gym)'}
                onValueChange={(value) => setMeetingForm({ ...meetingForm, location: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="In person (Gym)">In person (Gym)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-2 w-[50%]">
              <Label htmlFor="startTime">
                Start time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                value={meetingForm.startTime}
                onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2 w-[50%]">
              <Label htmlFor="endTime">
                End time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="endTime"
                type="time"
                value={meetingForm.endTime}
                onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                className="w-full"
              />
            </div>
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
      {/* Event Card Popover */}
      {selectedEvent && dropdownOpen && popoverAnchor && (
        <Popover 
          open={dropdownOpen} 
          onOpenChange={(open) => {
            if (!open) {
              setDropdownOpen(false);
              setSelectedEvent(null);
              setPopoverAnchor(null);
            }
          }}
        >
          <PopoverAnchor asChild>
            <div
              ref={(el) => {
                if (el && popoverAnchor) {
                  // Position anchor at the clicked element's location
                  const rect = popoverAnchor.getBoundingClientRect();
                  el.style.position = 'fixed';
                  el.style.top = `${rect.top}px`;
                  el.style.left = `${rect.left}px`;
                  el.style.width = `${rect.width}px`;
                  el.style.height = `${rect.height}px`;
                  el.style.pointerEvents = 'none';
                  el.style.opacity = '0';
                }
              }}
              aria-hidden="true"
            />
          </PopoverAnchor>
          <PopoverContent 
            className="w-80 p-0 focus:outline-none" 
            align="start" 
            side={preferredSide}
            sideOffset={4}
            collisionPadding={16}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              // Prevent the click from triggering handlers on underlying elements
              // The global handler will close the popover, so we just prevent propagation here
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="relative">
              {/* Action buttons in top right corner */}
              <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleEditMeeting}
                  aria-label="Edit meeting"
                  tabIndex={-1}
                  onFocus={(e) => e.target.blur()}
                >
                  <Pen className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleEmailMeeting}
                  aria-label="Email meeting"
                  tabIndex={-1}
                  onFocus={(e) => e.target.blur()}
                >
                  <Mail className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={handleDeleteMeeting}
                  aria-label="Delete meeting"
                  tabIndex={-1}
                  onFocus={(e) => e.target.blur()}
                >
                  <Trash2 className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setDropdownOpen(false);
                    setSelectedEvent(null);
                  }}
                  aria-label="Close"
                  tabIndex={-1}
                  onFocus={(e) => e.target.blur()}
                >
                  <X className="size-3.5" />
                </Button>
                            </div>

              {/* Card content */}
              <div className="p-4 pt-12">
                {/* Title */}
                <h3 className="text-base font-normal mb-3 pr-16">{selectedEvent.summary}</h3>

                {/* Date and Time */}
                <div className="mb-4 flex items-center gap-1.5">
                  <Clock className="size-3 text-muted-foreground flex-shrink-0" />
                  {selectedEvent.start.dateTime ? (
                    <div className="text-[0.65rem] font-normal">
                      {format(new Date(selectedEvent.start.dateTime), 'EEEE, MMMM d, yyyy')} ·{' '}
                      {format(new Date(selectedEvent.start.dateTime), 'h:mm a')} -{' '}
                      {selectedEvent.end.dateTime
                        ? format(new Date(selectedEvent.end.dateTime), 'h:mm a')
                        : ''}
                    </div>
                  ) : selectedEvent.start.date ? (
                    <div className="text-[0.65rem] font-normal">
                      {format(new Date(selectedEvent.start.date), 'EEEE, MMMM d, yyyy')}
                    </div>
                  ) : (
                    <div className="text-[0.65rem] font-normal text-muted-foreground">No date specified</div>
                  )}
                </div>

                {/* Clients (attendees emails) */}
                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (() => {
                  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || '';
                  const clientEmails = selectedEvent.attendees
                    .map((attendee) => attendee.email?.toLowerCase())
                    .filter((email): email is string => !!email && email !== userEmail);
                  
                  if (clientEmails.length === 0) return null;
                  
                  return (
                    <div className="flex items-center gap-1.5">
                      <Users className="size-3 text-muted-foreground flex-shrink-0" />
                      <div className="flex flex-wrap gap-2">
                        {clientEmails.map((email, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-[0.65rem] font-normal px-2 py-1"
                          >
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
              </PopoverContent>
            </Popover>
      )}

      {/* Edit Meeting Side Panel */}
      <SidePanel
        open={isEditMeetingOpen}
        onOpenChange={setIsEditMeetingOpen}
        title="Edit meeting"
        onOpenAutoFocus={(e) => e.preventDefault()}
        footer={
          <div className="flex items-center justify-start gap-2">
            <Button
              type="button"
              disabled={!isEditFormValid}
              onClick={() => {
                handleUpdateMeeting(meetingForm);
              }}
            >
              Save
            </Button>
            <Button
                        type="button"
              variant="outline"
                        onClick={() => {
                setIsEditMeetingOpen(false);
                        }}
                      >
              Cancel
            </Button>
                    </div>
        }
      >
        {selectedEvent && (
          <div className="flex flex-col gap-4">
            {/* Preview Card */}
            <Card className="border">
              <CardContent className="p-4">
                {/* Title */}
                <h3 className="text-base font-normal mb-3">
                  {meetingForm.title || selectedEvent.summary || 'Untitled Meeting'}
                </h3>

                {/* Date and Time */}
                {meetingForm.date && meetingForm.startTime && meetingForm.endTime && (
                  <div className="mb-4 flex items-center gap-1.5">
                    <Clock className="size-3 text-muted-foreground flex-shrink-0" />
                    <div className="text-[0.65rem] font-normal">
                      {(() => {
                        try {
                          const startDate = new Date(`${meetingForm.date}T${meetingForm.startTime}`);
                          const endDate = new Date(`${meetingForm.date}T${meetingForm.endTime}`);
                          return `${format(startDate, 'EEEE, MMMM d, yyyy')} · ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
                        } catch {
                          return 'Invalid date/time';
                        }
                      })()}
                    </div>
              </div>
            )}

                {/* Clients (attendees emails) */}
                {editClients.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-wrap gap-2">
                      {editClients.map((email, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-[0.65rem] font-normal px-2 py-1"
                        >
                          {email}
                        </Badge>
                      ))}
          </div>
                  </div>
                )}
              </CardContent>
            </Card>

          <div className="flex flex-col gap-2">
              <Label htmlFor="edit-title">
                Title <span className="text-destructive">*</span>
            </Label>
            <Input
                id="edit-title"
                placeholder="Meeting title"
                value={meetingForm.title || selectedEvent.summary}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-[50%]">
                <Label htmlFor="edit-date">
                  Date <span className="text-destructive">*</span>
              </Label>
              <Input
                  id="edit-date"
                  type="date"
                  value={
                    meetingForm.date ||
                    (selectedEvent.start.dateTime
                      ? format(new Date(selectedEvent.start.dateTime), 'yyyy-MM-dd')
                      : selectedEvent.start.date || '')
                  }
                  onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
              />
            </div>
              <div className="flex flex-col gap-2 w-[50%]">
                <Label htmlFor="edit-location">
                  Location <span className="text-destructive">*</span>
              </Label>
                <Select
                  value={meetingForm.location || selectedEvent.location || 'In person (Gym)'}
                  onValueChange={(value) => setMeetingForm({ ...meetingForm, location: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="In person (Gym)">In person (Gym)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-[50%]">
                <Label htmlFor="edit-startTime">
                  Start time <span className="text-destructive">*</span>
                </Label>
                  <Input
                  id="edit-startTime"
                  type="time"
                  value={
                    meetingForm.startTime ||
                    (selectedEvent.start.dateTime
                      ? format(new Date(selectedEvent.start.dateTime), 'HH:mm')
                      : '')
                  }
                  onChange={(e) => setMeetingForm({ ...meetingForm, startTime: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="flex flex-col gap-2 w-[50%]">
                <Label htmlFor="edit-endTime">
                  End time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={
                    meetingForm.endTime ||
                    (selectedEvent.end.dateTime
                      ? format(new Date(selectedEvent.end.dateTime), 'HH:mm')
                      : '')
                  }
                  onChange={(e) => setMeetingForm({ ...meetingForm, endTime: e.target.value })}
                  className="w-full"
                />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-clients">Clients</Label>
            <MultiAsyncSelect
              options={editClientOptionsWithSearch}
              value={editClients}
              onValueChange={(values) => {
                // Always ensure client email is included
                if (!values.includes(clientEmail)) {
                  setEditClients([clientEmail]);
                } else {
                  setEditClients(values);
                }
              }}
              placeholder="Client"
              searchPlaceholder="Client"
              hideSelectAll
            />
          </div>
          <div className="flex flex-col gap-2">
              <Label htmlFor="edit-description">Description</Label>
            <Textarea
                id="edit-description"
              placeholder="Meeting description"
                value={meetingForm.description || selectedEvent.description || ''}
              onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
              rows={4}
            />
          </div>
        </div>
        )}
      </SidePanel>

      {/* Email Modal */}
      <Dialog
        open={isEmailModalOpen}
        onOpenChange={(open) => {
          setIsEmailModalOpen(open);
          if (!open) {
            // Keep dropdown open when email modal closes
            // User can still interact with dropdown
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email client</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email-emails">
                Clients <span className="text-destructive">*</span>
              </Label>
              <MultiAsyncSelect
                options={emailOptionsWithSearch}
                value={emailForm.emails}
                onValueChange={(values) => {
                  setEmailForm({ ...emailForm, emails: values });
                }}
                placeholder="Client"
                searchPlaceholder="Client"
                hideSelectAll
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email-subject">
                Subject <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email-subject"
                placeholder="Subject.."
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                placeholder="Message..."
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                rows={6}
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4">
            <span className="text-xs text-muted-foreground">
              Appointment details will be included in the email.
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setEmailForm({
                    emails: [],
                    subject: '',
                    message: '',
                  });
                  setEmailOptions([]);
                  setEmailSearchQuery('');
                  // Keep dropdown open
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSendEmail}
                disabled={!emailForm.subject.trim() || emailForm.emails.length === 0}
              >
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

