const WEEKS_BACK = 3;

// Build weeks ONCE (dates only) — stable data for the Carousel
export function buildBaseWeeks(): Date[][] {
  const today = new Date();
  const startOfCurrentWeek = new Date(today);
  const dayOfWeek = today.getDay(); // Sunday-start
  startOfCurrentWeek.setDate(today.getDate() - dayOfWeek);

  const weeks: Date[][] = [];
  for (let w = -WEEKS_BACK; w <= 0; w++) {
    const startOfTargetWeek = new Date(startOfCurrentWeek);
    startOfTargetWeek.setDate(startOfCurrentWeek.getDate() + w * 7);
    const weekDates: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfTargetWeek);
      d.setDate(startOfTargetWeek.getDate() + i);
      return d;
    });
    weeks.push(weekDates);
  }
  return weeks;
}

// Build the weeks once and export them
export const BASE_WEEKS = buildBaseWeeks();

// Keep default index stable so the carousel doesn't reset on re-renders
export const INITIAL_INDEX = BASE_WEEKS.length - 1;
