// Generate weeks starting from Monday to Sunday
// Returns an array of weeks, where each week is an array of 7 Date objects (Monday to Sunday)

// Generate 20 years worth of weeks (10 years back, 10 years forward)
// This ensures users can select any date within a reasonable range
const YEARS_BACK = 10;
const YEARS_FORWARD = 10;
const WEEKS_TO_GENERATE = (YEARS_BACK + YEARS_FORWARD) * 52; // ~20 years worth of weeks

// Normalize date to start of day
const normalizeDateForWeek = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  normalized.setMinutes(0, 0, 0);
  normalized.setSeconds(0, 0);
  normalized.setMilliseconds(0);
  return normalized;
};

export const generateWeeks = (): Date[][] => {
  const weeks: Date[][] = [];
  const today = normalizeDateForWeek(new Date());
  
  // Get the Monday of the current week
  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const monday = new Date(d.setDate(diff));
    return normalizeDateForWeek(monday);
  };

  // Start from YEARS_BACK years ago
  const startMonday = getMonday(today);
  startMonday.setDate(startMonday.getDate() - (YEARS_BACK * 52 * 7));

  for (let weekIndex = 0; weekIndex < WEEKS_TO_GENERATE; weekIndex++) {
    const weekStart = new Date(startMonday);
    weekStart.setDate(startMonday.getDate() + weekIndex * 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const week: Date[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + dayIndex);
      week.push(normalizeDateForWeek(date));
    }
    weeks.push(week);
  }

  return weeks;
};

// Normalize date to start of day for comparison
const normalizeDate = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  normalized.setMinutes(0, 0, 0);
  normalized.setSeconds(0, 0);
  normalized.setMilliseconds(0);
  return normalized;
};

// Find the week index that contains a given date
export const getWeekIndexForDate = (date: Date, weeks: Date[][]): number => {
  const normalizedDate = normalizeDate(date);
  const dateTime = normalizedDate.getTime();
  
  // First, try to find exact match
  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    if (week.some((d) => {
      const normalizedWeekDate = normalizeDate(d);
      return normalizedWeekDate.getTime() === dateTime;
    })) {
      return i;
    }
  }
  
  // If not found, find the closest week (the week that contains dates closest to the target date)
  let closestIndex = Math.floor(weeks.length / 2);
  let minDistance = Infinity;
  
  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    if (week.length === 0) continue;
    
    // Calculate distance from target date to the middle of the week (Thursday)
    const weekMiddle = week[3] || week[0];
    const weekMiddleTime = normalizeDate(weekMiddle).getTime();
    const distance = Math.abs(dateTime - weekMiddleTime);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  return closestIndex;
};

// Get the month and year for a week (returns the month/year of the middle of the week)
export const getWeekMonthYear = (week: Date[]): { month: number; year: number } => {
  // Use Thursday (index 3) as the middle of the week for month determination
  const middleDate = week[3] || week[0];
  return {
    month: middleDate.getMonth(),
    year: middleDate.getFullYear(),
  };
};
