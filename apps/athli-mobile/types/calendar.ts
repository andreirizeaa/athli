/**
 * Calendar and scheduling types
 * Centralized from services/calendar-service.ts
 */

// Frontend-friendly interface (keeps existing structure)
export interface RepeatData {
  type: 'weekly' | 'monthly';
  every?: number;
  for?: number | 'ever';
  weekdays?: string[];
  monthDays?: number[];
}

export interface ScheduleSessionData {
  clientId: string;
  type: string;
  date: Date;
  fromTime: Date;
  toTime: Date;
  meetingInfo?: string;
  repeat?: RepeatData | null;
}

// Canonical backend format
export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export type CanonicalRepeatData =
  | {
      type: 'weekly';
      intervalWeeks: 1 | 2 | 3 | 4;
      weekdays: Weekday[];
      end: { mode: 'afterWeeks'; weeks: number } | { mode: 'never' };
    }
  | {
      type: 'monthly';
      intervalMonths: number; // 1..12
      monthDays: number[]; // 1..31
      end: { mode: 'afterMonths'; months: number } | { mode: 'never' };
    };

export type ScheduleSessionRequest = {
  clientId: string;
  sessionType: string;
  title?: string;
  description?: string;
  timeZone: string; // IANA timezone, e.g. "Europe/London"
  startLocal: string; // "YYYY-MM-DDTHH:mm:ss"
  endLocal: string; // "YYYY-MM-DDTHH:mm:ss"
  repeat?: CanonicalRepeatData | null;
};

// Google Calendar payload shape (minimal)
export type GoogleEventInsert = {
  summary?: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string }>;
  recurrence?: string[]; // ["RRULE:..."]
};

// Outlook / Microsoft Graph payload shape (minimal)
type GraphDateTimeTimeZone = { dateTime: string; timeZone: string };

export type GraphEventCreate = {
  subject: string;
  body?: { contentType: 'HTML' | 'text'; content: string };
  start: GraphDateTimeTimeZone;
  end: GraphDateTimeTimeZone;
  attendees: Array<{ type: 'required'; emailAddress: { address: string; name?: string } }>;
  recurrence?: {
    pattern:
      | { type: 'weekly'; interval: number; daysOfWeek: string[]; firstDayOfWeek?: string }
      | { type: 'absoluteMonthly'; interval: number; dayOfMonth: number };
    range:
      | { type: 'noEnd'; startDate: string; recurrenceTimeZone?: string }
      | { type: 'endDate'; startDate: string; endDate: string; recurrenceTimeZone?: string };
  };
};

export type CalendarProvider = 'google' | 'outlook';
