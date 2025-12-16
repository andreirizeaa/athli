// =========================
// Types (your existing + canonical)
// =========================

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
type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

type CanonicalRepeatData =
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

// =========================
// Helpers (normalize / date utils)
// =========================

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalDateTimeString(date: Date): string {
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:00`
  );
}

function combineDateAndTime(day: Date, time: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0
  );
}

function normalizeWeekdays(input?: string[]): Weekday[] {
  const map: Record<string, Weekday> = {
    mon: 'MO',
    monday: 'MO',
    mo: 'MO',
    tue: 'TU',
    tues: 'TU',
    tuesday: 'TU',
    tu: 'TU',
    wed: 'WE',
    wednesday: 'WE',
    we: 'WE',
    thu: 'TH',
    thur: 'TH',
    thurs: 'TH',
    thursday: 'TH',
    th: 'TH',
    fri: 'FR',
    friday: 'FR',
    fr: 'FR',
    sat: 'SA',
    saturday: 'SA',
    sa: 'SA',
    sun: 'SU',
    sunday: 'SU',
    su: 'SU',
  };

  const out = (input ?? [])
    .map((s) => map[String(s).trim().toLowerCase()])
    .filter(Boolean) as Weekday[];

  return Array.from(new Set(out));
}

function normalizeRepeatData(repeat: RepeatData): CanonicalRepeatData | null {
  if (repeat.type === 'weekly') {
    const weekdays = normalizeWeekdays(repeat.weekdays);
    if (!weekdays.length) return null;

    const intervalWeeks = Math.max(1, Math.min(4, repeat.every ?? 1)) as 1 | 2 | 3 | 4;
    const end =
      repeat.for === 'ever' || !repeat.for
        ? { mode: 'never' as const }
        : { mode: 'afterWeeks' as const, weeks: repeat.for };

    return { type: 'weekly', intervalWeeks, weekdays, end };
  }

  if (repeat.type === 'monthly') {
    const monthDays = (repeat.monthDays ?? []).filter((d) => d >= 1 && d <= 31);
    if (!monthDays.length) return null;

    const intervalMonths = Math.max(1, Math.min(12, repeat.every ?? 1));
    const end =
      repeat.for === 'ever' || !repeat.for
        ? { mode: 'never' as const }
        : { mode: 'afterMonths' as const, months: repeat.for };

    return {
      type: 'monthly',
      intervalMonths,
      monthDays: Array.from(new Set(monthDays)).sort((a, b) => a - b),
      end,
    };
  }

  return null;
}

export function toScheduleSessionRequest(
  data: ScheduleSessionData,
  timeZone: string
): ScheduleSessionRequest {
  const start = combineDateAndTime(data.date, data.fromTime);
  const end = combineDateAndTime(data.date, data.toTime);

  const normalizedRepeat = data.repeat ? normalizeRepeatData(data.repeat) : null;

  return {
    clientId: data.clientId,
    sessionType: data.type,
    title: data.type,
    description: data.meetingInfo ?? '',
    timeZone,
    startLocal: toLocalDateTimeString(start),
    endLocal: toLocalDateTimeString(end),
    repeat: normalizedRepeat ?? null,
  };
}

function ymdFromLocalDateTime(local: string): string {
  // "YYYY-MM-DDTHH:mm:ss" -> "YYYY-MM-DD"
  return local.split('T')[0];
}

function utcUntilFromLocalStartPlusWeeks(startLocal: string, weeks: number): string {
  // Simple approximation: treat startLocal as Date() (environment timezone), add weeks, then UTC UNTIL
  const start = new Date(startLocal);
  start.setDate(start.getDate() + weeks * 7);
  return start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function utcUntilFromLocalStartPlusMonths(startLocal: string, months: number): string {
  const start = new Date(startLocal);
  start.setMonth(start.getMonth() + months);
  return start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// =========================
// Provider payload builders
// =========================

// ---- Google Calendar payload shape (minimal)
export type GoogleEventInsert = {
  summary?: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string }>;
  recurrence?: string[]; // ["RRULE:..."]
};

function buildGoogleRecurrenceLines(payload: ScheduleSessionRequest): string[] | undefined {
  const r = payload.repeat;
  if (!r) return undefined;

  if (r.type === 'weekly') {
    let rule = `RRULE:FREQ=WEEKLY;INTERVAL=${r.intervalWeeks};BYDAY=${r.weekdays.join(',')}`;
    if (r.end.mode === 'afterWeeks') {
      rule += `;UNTIL=${utcUntilFromLocalStartPlusWeeks(payload.startLocal, r.end.weeks)}`;
    }
    return [rule];
  }

  if (r.type === 'monthly') {
    // Google supports BYMONTHDAY with a list in a single RRULE
    let rule = `RRULE:FREQ=MONTHLY;INTERVAL=${r.intervalMonths};BYMONTHDAY=${r.monthDays.join(',')}`;
    if (r.end.mode === 'afterMonths') {
      rule += `;UNTIL=${utcUntilFromLocalStartPlusMonths(payload.startLocal, r.end.months)}`;
    }
    return [rule];
  }

  return undefined;
}

export function buildGoogleEventPayload(args: {
  payload: ScheduleSessionRequest;
  clientEmail: string;
}): GoogleEventInsert {
  const { payload, clientEmail } = args;

  return {
    summary: payload.title ?? payload.sessionType,
    description: payload.description ?? '',
    start: { dateTime: payload.startLocal, timeZone: payload.timeZone },
    end: { dateTime: payload.endLocal, timeZone: payload.timeZone },
    attendees: [{ email: clientEmail }],
    recurrence: buildGoogleRecurrenceLines(payload),
  };
}

// ---- Outlook / Microsoft Graph payload shape (minimal)
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

function weekdayToGraphDay(w: Weekday): string {
  switch (w) {
    case 'MO':
      return 'monday';
    case 'TU':
      return 'tuesday';
    case 'WE':
      return 'wednesday';
    case 'TH':
      return 'thursday';
    case 'FR':
      return 'friday';
    case 'SA':
      return 'saturday';
    case 'SU':
      return 'sunday';
  }
}

function addMonthsDateString(startYmd: string, months: number): string {
  const [y, m, d] = startYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function firstOccurrenceOnOrAfter(baseYmd: string, dayOfMonth: number): string {
  const [yy, mm, dd] = baseYmd.split('-').map(Number);
  let y = yy;
  let m = mm - 1; // 0-based

  const base = new Date(yy, mm - 1, dd);

  while (true) {
    const candidate = new Date(y, m, dayOfMonth);
    const sameMonth = candidate.getMonth() === m; // day exists in month
    if (sameMonth && candidate >= base) {
      const outY = candidate.getFullYear();
      const outM = String(candidate.getMonth() + 1).padStart(2, '0');
      const outD = String(candidate.getDate()).padStart(2, '0');
      return `${outY}-${outM}-${outD}`;
    }
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
}

function replaceDatePart(localDateTime: string, newYmd: string): string {
  const timePart = localDateTime.split('T')[1];
  return `${newYmd}T${timePart}`;
}

function durationMsFromLocal(payload: ScheduleSessionRequest): number {
  // best-effort duration; you can also compute duration from your original Date objects before stringify
  const s = new Date(payload.startLocal);
  const e = new Date(payload.endLocal);
  return e.getTime() - s.getTime();
}

export function buildOutlookPayloads(args: {
  payload: ScheduleSessionRequest;
  clientEmail: string;
  clientName?: string;

  // IMPORTANT: Graph often prefers Windows time zone IDs.
  // For now we keep it mocked as whatever you pass; later you can map IANA -> Windows.
  graphTimeZone: string;
}): GraphEventCreate[] {
  const { payload, clientEmail, clientName, graphTimeZone } = args;
  const baseStartYmd = ymdFromLocalDateTime(payload.startLocal);
  const durMs = durationMsFromLocal(payload);

  // non-recurring (one event)
  if (!payload.repeat) {
    return [
      {
        subject: payload.title ?? payload.sessionType,
        body: payload.description ? { contentType: 'HTML', content: payload.description } : undefined,
        start: { dateTime: payload.startLocal, timeZone: graphTimeZone },
        end: { dateTime: payload.endLocal, timeZone: graphTimeZone },
        attendees: [{ type: 'required', emailAddress: { address: clientEmail, name: clientName } }],
      },
    ];
  }

  // weekly (one recurring series)
  if (payload.repeat.type === 'weekly') {
    const weeklyRepeat = payload.repeat;
    const startDate = baseStartYmd;

    const range =
      weeklyRepeat.end.mode === 'never'
        ? { type: 'noEnd' as const, startDate, recurrenceTimeZone: graphTimeZone }
        : {
            type: 'endDate' as const,
            startDate,
            endDate: addMonthsDateString(startDate, Math.ceil(weeklyRepeat.end.mode === 'afterWeeks' ? weeklyRepeat.end.weeks / 4 : 0)), // mocked-ish; ok for now
            recurrenceTimeZone: graphTimeZone,
          };

    return [
      {
        subject: payload.title ?? payload.sessionType,
        body: payload.description ? { contentType: 'HTML', content: payload.description } : undefined,
        start: { dateTime: payload.startLocal, timeZone: graphTimeZone },
        end: { dateTime: payload.endLocal, timeZone: graphTimeZone },
        attendees: [{ type: 'required', emailAddress: { address: clientEmail, name: clientName } }],
        recurrence: {
          pattern: {
            type: 'weekly',
            interval: weeklyRepeat.intervalWeeks,
            daysOfWeek: weeklyRepeat.weekdays.map(weekdayToGraphDay),
            firstDayOfWeek: 'monday',
          },
          range,
        },
      },
    ];
  }

  // monthly (ONE SERIES PER monthDay)
  if (payload.repeat.type === 'monthly') {
    const monthlyRepeat = payload.repeat;
    const monthDays = monthlyRepeat.monthDays;

    return monthDays.map((dayOfMonth) => {
      // anchor each series to the first date on/after the base date that has that day-of-month
      const seriesStartYmd = firstOccurrenceOnOrAfter(baseStartYmd, dayOfMonth);

      const startDateTime = replaceDatePart(payload.startLocal, seriesStartYmd);

      // compute end datetime by duration, keeping local-ish formatting
      const startDt = new Date(startDateTime);
      const endDt = new Date(startDt.getTime() + durMs);
      const endYmd = `${endDt.getFullYear()}-${String(endDt.getMonth() + 1).padStart(2, '0')}-${String(endDt.getDate()).padStart(2, '0')}`;
      const endDateTime = replaceDatePart(payload.endLocal, endYmd);

      const range =
        monthlyRepeat.end.mode === 'never'
          ? { type: 'noEnd' as const, startDate: seriesStartYmd, recurrenceTimeZone: graphTimeZone }
          : {
              type: 'endDate' as const,
              startDate: seriesStartYmd,
              endDate: addMonthsDateString(seriesStartYmd, monthlyRepeat.end.mode === 'afterMonths' ? monthlyRepeat.end.months : 0),
              recurrenceTimeZone: graphTimeZone,
            };

      return {
        subject: payload.title ?? payload.sessionType,
        body: payload.description ? { contentType: 'HTML', content: payload.description } : undefined,
        start: { dateTime: startDateTime, timeZone: graphTimeZone },
        end: { dateTime: endDateTime, timeZone: graphTimeZone },
        attendees: [{ type: 'required', emailAddress: { address: clientEmail, name: clientName } }],
        recurrence: {
          pattern: {
            type: 'absoluteMonthly',
            interval: monthlyRepeat.intervalMonths,
            dayOfMonth,
          },
          range,
        },
      };
    });
  }

  return [];
}

// =========================
// Mocked "one method does everything"
// =========================

type Provider = 'google' | 'outlook';

type MockResult = {
  normalized: ScheduleSessionRequest;
  google?: {
    wouldSendToEndpoint: string;
    payload: GoogleEventInsert;
    mockEventId: string;
  };
  outlook?: {
    wouldSendToEndpoint: string;
    payloads: GraphEventCreate[];
    mockEventIds: string[];
  };
};

async function mockResolveClientEmail(clientId: string): Promise<{ email: string; name?: string }> {
  // TODO: replace with your real API call
  return { email: `${clientId}@example.com`, name: 'Client Name' };
}

async function mockLoadProviderToken(_provider: Provider): Promise<string> {
  // TODO: replace with Supabase token lookup
  return 'mock_access_token';
}

function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

/**
 * scheduleSessionMocked:
 * - normalizes frontend data
 * - builds Google payload (single)
 * - builds Outlook payloads (monthly => one series per monthDay)
 * - logs "ready to send" payloads
 */
export async function scheduleSessionMocked(
  data: ScheduleSessionData,
  opts: { sendTo: Provider[] } = { sendTo: ['google', 'outlook'] }
): Promise<MockResult> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const normalized = toScheduleSessionRequest(data, timeZone);

  // resolve client
  const client = await mockResolveClientEmail(normalized.clientId);

  const result: MockResult = { normalized };

  // ---- GOOGLE
  if (opts.sendTo.includes('google')) {
    const googleToken = await mockLoadProviderToken('google'); // unused in mock

    const googlePayload = buildGoogleEventPayload({
      payload: normalized,
      clientEmail: client.email,
    });

    // would POST to:
    const endpoint = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    console.log('--- GOOGLE READY PAYLOAD ---');
    console.log('token:', googleToken);
    console.log('endpoint:', endpoint);
    console.log(JSON.stringify(googlePayload, null, 2));

    result.google = {
      wouldSendToEndpoint: endpoint,
      payload: googlePayload,
      mockEventId: randomId('gcal'),
    };
  }

  // ---- OUTLOOK (MICROSOFT GRAPH)
  if (opts.sendTo.includes('outlook')) {
    const outlookToken = await mockLoadProviderToken('outlook'); // unused in mock

    // For now: mocked timezone usage.
    // Later: map IANA (Europe/London) -> Windows ("GMT Standard Time") for Graph.
    const graphTimeZone = 'GMT Standard Time';

    const outlookPayloads = buildOutlookPayloads({
      payload: normalized,
      clientEmail: client.email,
      clientName: client.name,
      graphTimeZone,
    });

    // would POST to:
    const endpoint = 'https://graph.microsoft.com/v1.0/me/events';

    console.log('--- OUTLOOK READY PAYLOAD(S) ---');
    console.log('token:', outlookToken);
    console.log('endpoint:', endpoint);
    console.log(JSON.stringify(outlookPayloads, null, 2));

    result.outlook = {
      wouldSendToEndpoint: endpoint,
      payloads: outlookPayloads,
      mockEventIds: outlookPayloads.map(() => randomId('m365')),
    };
  }

  return result;
}

/**
 * Main scheduleSession function - uses the mocked implementation
 * This will be connected to the backend in the future
 */
export const scheduleSession = async (data: ScheduleSessionData): Promise<void> => {
  // Use the mocked implementation that builds all payloads
  const result = await scheduleSessionMocked(data, { sendTo: ['google', 'outlook'] });

  // In a real implementation, you would:
  // 1. Resolve clientId -> clientEmail from your database
  // 2. Load provider tokens from Supabase
  // 3. Make actual fetch() calls to Google/Outlook APIs
  // 4. Store the created event IDs in your database

  console.log('Session scheduling result:', {
    normalized: result.normalized,
    googleEventId: result.google?.mockEventId,
    outlookEventIds: result.outlook?.mockEventIds,
  });
};
