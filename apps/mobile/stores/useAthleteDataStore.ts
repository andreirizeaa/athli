import { create } from 'zustand';
import { getMyMetrics, type ClientMetric } from '@/services/client/client-metric-service';
import { getMyHabits, type ClientHabit } from '@/services/client/client-habit-service';
import { getTrainingCalendarRange, type TrainingCalendarSchema } from '@/services/client/client-service';
import { formatDateYYYYMMDD } from '@/lib/utils/date-formatters';

type AthleteDataStore = {
  // Loading state
  isLoading: boolean;
  isInitialLoadComplete: boolean;
  error: string | null;

  // Data
  metrics: ClientMetric[];
  habits: ClientHabit[];
  trainingCalendar: TrainingCalendarSchema;
  loadedTrainingRange: { startDate: string; endDate: string } | null;

  // Actions
  loadAthleteData: (clientId: string, coachId: string) => Promise<void>;
  loadTrainingCalendar: (clientId: string, coachId: string, startDate: string, endDate: string) => Promise<void>;
  setMetrics: (metrics: ClientMetric[]) => void;
  setHabits: (habits: ClientHabit[]) => void;
  reset: () => void;
};

const getDateRange = () => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1);
  startDate.setDate(1);

  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 2);
  endDate.setDate(0);

  return {
    startDate: formatDateYYYYMMDD(startDate),
    endDate: formatDateYYYYMMDD(endDate),
  };
};

export const useAthleteDataStore = create<AthleteDataStore>((set, get) => ({
  // Initial state
  isLoading: false,
  isInitialLoadComplete: false,
  error: null,
  metrics: [],
  habits: [],
  trainingCalendar: {},
  loadedTrainingRange: null,

  // Load all essential athlete data
  loadAthleteData: async (clientId: string, coachId: string) => {
    const { isInitialLoadComplete } = get();

    // Skip if already loaded
    if (isInitialLoadComplete) {
      console.log('[AthleteDataStore] Initial load already complete, skipping');
      return;
    }

    set({ isLoading: true, error: null });
    console.log('[AthleteDataStore] Loading athlete data...');

    try {
      const { startDate, endDate } = getDateRange();

      // Fetch all data in parallel
      const [metricsData, habitsData, trainingData] = await Promise.all([
        getMyMetrics(clientId, coachId).catch((err) => {
          console.warn('[AthleteDataStore] Failed to load metrics:', err);
          return [];
        }),
        getMyHabits(clientId, coachId).catch((err) => {
          console.warn('[AthleteDataStore] Failed to load habits:', err);
          return [];
        }),
        getTrainingCalendarRange(clientId, coachId, startDate, endDate).catch((err) => {
          console.warn('[AthleteDataStore] Failed to load training:', err);
          return {};
        }),
      ]);

      set({
        metrics: metricsData,
        habits: habitsData,
        trainingCalendar: trainingData,
        loadedTrainingRange: { startDate, endDate },
        isLoading: false,
        isInitialLoadComplete: true,
        error: null,
      });

      console.log('[AthleteDataStore] Athlete data loaded successfully');
    } catch (error: any) {
      console.error('[AthleteDataStore] Error loading athlete data:', error);
      set({
        isLoading: false,
        isInitialLoadComplete: true, // Mark as complete even on error to prevent infinite loading
        error: error.message || 'Failed to load athlete data',
      });
    }
  },

  // Load or extend training calendar range
  loadTrainingCalendar: async (clientId: string, coachId: string, startDate: string, endDate: string) => {
    try {
      const trainingData = await getTrainingCalendarRange(clientId, coachId, startDate, endDate);
      const currentCalendar = get().trainingCalendar;

      set({
        trainingCalendar: { ...currentCalendar, ...trainingData },
        loadedTrainingRange: { startDate, endDate },
      });
    } catch (error) {
      console.error('[AthleteDataStore] Error loading training calendar:', error);
    }
  },

  // Manual setters for when data is loaded elsewhere
  setMetrics: (metrics) => set({ metrics }),
  setHabits: (habits) => set({ habits }),

  // Reset store (on logout)
  reset: () =>
    set({
      isLoading: false,
      isInitialLoadComplete: false,
      error: null,
      metrics: [],
      habits: [],
      trainingCalendar: {},
      loadedTrainingRange: null,
    }),
}));
