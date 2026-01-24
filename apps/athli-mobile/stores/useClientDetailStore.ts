import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import {
  getClientDetails,
  getAthleteBio,
  getAthleteGoals,
  getAthleteInjuries,
  getTrainingCalendarRange,
  type AthleteDetails,
  type AthleteGoal,
  type AthleteInjury,
  type TrainingCalendarSchema,
} from '@/services/client/client-service';
import { getClients } from '@/services/coach/coach-client-service';
import {
  getClientMetrics,
  type ClientMetric,
} from '@/services/client/client-metric-service';
import {
  getClientHabits,
  type ClientHabit,
} from '@/services/client/client-habit-service';
import {
  getClientPhotos,
  type ClientPhoto,
} from '@/services/client/client-photo-service';
import {
  getClientFiles,
  type ClientFile,
} from '@/services/client/client-file-service';
import {
  getClientCheckIns,
  getClientQuestionnaires,
  type ClientCheckIn,
  type ClientQuestionnaire,
} from '@/services/client/client-form-service';
import {
  getClientUpdates,
  type ClientUpdate,
} from '@/services/client/client-updates-service';
import {
  getClientNotes,
  type ClientNote,
} from '@/services/client/client-notes-service';
import { formatDateDDMMYYYY } from '@/lib/utils/date-formatters';

interface ClientDetailStore {
  // IDs
  clientId: string | null;
  coachId: string | null;

  // Client data
  client: AthleteDetails | null;
  bio: string;
  goals: AthleteGoal[];
  injuries: AthleteInjury[];
  metrics: ClientMetric[];
  habits: ClientHabit[];
  photos: ClientPhoto[];
  files: ClientFile[];
  checkIns: ClientCheckIn[];
  questionnaires: ClientQuestionnaire[];
  updates: ClientUpdate[];
  notes: ClientNote[];
  trainingCalendar: TrainingCalendarSchema;

  // Track loaded date range for training calendar
  loadedTrainingRange: { startDate: string; endDate: string } | null;

  // Loading states
  isLoading: boolean;
  isLoadingClient: boolean;
  isLoadingMetrics: boolean;
  isLoadingHabits: boolean;
  isLoadingPhotos: boolean;
  isLoadingFiles: boolean;
  isLoadingForms: boolean;
  isLoadingUpdates: boolean;
  isLoadingNotes: boolean;
  isLoadingTraining: boolean;

  // Error
  error: string | null;

  // Actions
  loadClientData: (clientId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshSection: (
    section:
      | 'client'
      | 'bio'
      | 'goals'
      | 'injuries'
      | 'metrics'
      | 'habits'
      | 'photos'
      | 'files'
      | 'check-ins'
      | 'questionnaires'
      | 'updates'
      | 'notes'
      | 'training'
  ) => Promise<void>;
  fetchTrainingDataForDate: (targetDate: Date) => Promise<void>;
  extendTrainingRange: (targetDate: Date, forceFetch?: boolean) => Promise<void>;
  isDateInLoadedRange: (date: Date) => boolean;
  clearClientData: () => void;

  // Direct setters for athlete self-access
  setMetrics: (metrics: ClientMetric[]) => void;
  setHabits: (habits: ClientHabit[]) => void;
  setClientId: (clientId: string) => void;
}

// Helper to format date as YYYY-MM-DD
const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to get initial date range for training calendar (30 days back, 30 days forward)
// Using a smaller window for faster initial load - range can be extended as user navigates
const getDateRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 30);
  
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 30);

  return {
    startDate: formatDateForApi(startDate),
    endDate: formatDateForApi(endDate),
  };
};

// Helper to extend date range to include a target date
const getExtendedDateRange = (
  currentRange: { startDate: string; endDate: string } | null,
  targetDate: Date
) => {
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  // If no current range, return a 6-month range centered around target
  if (!currentRange) {
    const start = new Date(target);
    start.setMonth(start.getMonth() - 3);
    const end = new Date(target);
    end.setMonth(end.getMonth() + 3);
    return {
      startDate: formatDateForApi(start),
      endDate: formatDateForApi(end),
      needsFetch: true,
    };
  }

  const currentStart = new Date(currentRange.startDate);
  const currentEnd = new Date(currentRange.endDate);

  // Add 3-month buffer on each side when extending
  const bufferMonths = 3;

  if (target < currentStart) {
    // Need to extend backward - fetch from 3 months before target to current start
    const newStart = new Date(target);
    newStart.setMonth(newStart.getMonth() - bufferMonths);
    return {
      startDate: formatDateForApi(newStart),
      endDate: currentRange.startDate, // Fetch up to current start
      newRangeStart: formatDateForApi(newStart),
      newRangeEnd: currentRange.endDate,
      needsFetch: true,
    };
  }

  if (target > currentEnd) {
    // Need to extend forward - fetch from current end to 3 months after target
    const newEnd = new Date(target);
    newEnd.setMonth(newEnd.getMonth() + bufferMonths);
    return {
      startDate: currentRange.endDate, // Fetch from current end
      endDate: formatDateForApi(newEnd),
      newRangeStart: currentRange.startDate,
      newRangeEnd: formatDateForApi(newEnd),
      needsFetch: true,
    };
  }

  // Target is within range, no fetch needed
  return {
    startDate: currentRange.startDate,
    endDate: currentRange.endDate,
    needsFetch: false,
  };
};

export const useClientDetailStore = create<ClientDetailStore>((set, get) => ({
  // Initial state
  clientId: null,
  coachId: null,
  client: null,
  bio: '',
  goals: [],
  injuries: [],
  metrics: [],
  habits: [],
  photos: [],
  files: [],
  checkIns: [],
  questionnaires: [],
  updates: [],
  notes: [],
  trainingCalendar: {},
  loadedTrainingRange: null,
  isLoading: false,
  isLoadingClient: false,
  isLoadingMetrics: false,
  isLoadingHabits: false,
  isLoadingPhotos: false,
  isLoadingFiles: false,
  isLoadingForms: false,
  isLoadingUpdates: false,
  isLoadingNotes: false,
  isLoadingTraining: false,
  error: null,

  // Load all client data
  loadClientData: async (clientId: string) => {
    const currentClientId = get().clientId;

    // If already loaded this client, skip
    if (currentClientId === clientId && get().client) {
      console.log('[ClientDetailStore] Client already loaded:', clientId);
      return;
    }

    console.log('[ClientDetailStore] Loading data for client:', clientId);

    // Get coach ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const coachId = user?.id;

    if (!coachId) {
      set({ error: 'Not authenticated', isLoading: false });
      return;
    }

    // Reset state for new client
    set({
      clientId,
      coachId,
      client: null,
      bio: '',
      goals: [],
      injuries: [],
      metrics: [],
      habits: [],
      photos: [],
      files: [],
      checkIns: [],
      questionnaires: [],
      updates: [],
      notes: [],
      trainingCalendar: {},
      loadedTrainingRange: null,
      isLoading: true,
      isLoadingClient: true,
      isLoadingMetrics: true,
      isLoadingHabits: true,
      isLoadingPhotos: true,
      isLoadingFiles: true,
      isLoadingForms: true,
      isLoadingUpdates: true,
      isLoadingNotes: true,
      isLoadingTraining: true,
      error: null,
    });

    try {
      // 1. First fetch client info (required)
      // Also fetch from clients list to get the avatar URL (which is more reliable)
      const [clientData, clientsList] = await Promise.all([
        getClientDetails(clientId),
        getClients().catch(() => []),
      ]);

      // Find the client in the list to get the avatar URL
      const clientFromList = clientsList.find(c => c.id === clientId);
      const avatarUrl = clientFromList?.avatarUrl || clientData.avatarUrl;

      set({
        client: { ...clientData, avatarUrl },
        isLoadingClient: false
      });

      // 2. Fetch all other data in parallel
      const { startDate, endDate } = getDateRange();

      const [
        bioData,
        goalsData,
        injuriesData,
        metricsData,
        habitsData,
        photosData,
        filesData,
        checkInsData,
        questionnairesData,
        updatesData,
        notesData,
        trainingData,
      ] = await Promise.all([
        getAthleteBio(clientId, coachId).catch(() => ''),
        getAthleteGoals(clientId, coachId).catch(() => []),
        getAthleteInjuries(clientId, coachId).catch(() => []),
        getClientMetrics(clientId, coachId).catch(() => []),
        getClientHabits(clientId, coachId).catch(() => []),
        getClientPhotos(clientId, coachId).catch(() => []),
        getClientFiles(clientId, coachId).catch(() => []),
        getClientCheckIns(clientId, coachId).catch(() => []),
        getClientQuestionnaires(clientId, coachId).catch(() => []),
        getClientUpdates(clientId, coachId).catch(() => []),
        getClientNotes(clientId, coachId).catch(() => []),
        getTrainingCalendarRange(clientId, coachId, startDate, endDate).catch(() => ({})),
      ]);

      set({
        bio: bioData,
        goals: goalsData,
        injuries: injuriesData,
        metrics: metricsData,
        habits: habitsData,
        photos: photosData,
        files: filesData,
        checkIns: checkInsData,
        questionnaires: questionnairesData,
        updates: updatesData,
        notes: notesData,
        trainingCalendar: trainingData,
        loadedTrainingRange: { startDate, endDate },
        isLoading: false,
        isLoadingMetrics: false,
        isLoadingHabits: false,
        isLoadingPhotos: false,
        isLoadingFiles: false,
        isLoadingForms: false,
        isLoadingUpdates: false,
        isLoadingNotes: false,
        isLoadingTraining: false,
      });

      console.log('[ClientDetailStore] All data loaded for client:', clientId);
    } catch (err) {
      console.error('[ClientDetailStore] Error loading client:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to load client',
        isLoading: false,
        isLoadingClient: false,
        isLoadingMetrics: false,
        isLoadingHabits: false,
        isLoadingPhotos: false,
        isLoadingFiles: false,
        isLoadingForms: false,
        isLoadingUpdates: false,
        isLoadingNotes: false,
        isLoadingTraining: false,
      });
    }
  },

  // Refresh all data
  refreshAll: async () => {
    const { clientId } = get();
    if (!clientId) return;

    // Clear and reload
    set({ clientId: null });
    await get().loadClientData(clientId);
  },

  // Refresh specific section
  refreshSection: async (section) => {
    const { clientId, coachId } = get();
    console.log('[refreshSection]', section, { clientId, coachId });
    if (!clientId || !coachId) {
      console.warn('[refreshSection] Missing IDs, skipping');
      return;
    }

    const { startDate, endDate } = getDateRange();

    try {
      switch (section) {
        case 'client':
          set({ isLoadingClient: true });
          const clientData = await getClientDetails(clientId);
          set({ client: clientData, isLoadingClient: false });
          break;

        case 'bio':
          const bioData = await getAthleteBio(clientId, coachId);
          set({ bio: bioData });
          break;

        case 'goals':
          const goalsData = await getAthleteGoals(clientId, coachId);
          set({ goals: goalsData });
          break;

        case 'injuries':
          const injuriesData = await getAthleteInjuries(clientId, coachId);
          set({ injuries: injuriesData });
          break;

        case 'metrics':
          set({ isLoadingMetrics: true });
          const metricsData = await getClientMetrics(clientId, coachId);
          set({ metrics: metricsData, isLoadingMetrics: false });
          break;

        case 'habits':
          set({ isLoadingHabits: true });
          const habitsData = await getClientHabits(clientId, coachId);
          set({ habits: habitsData, isLoadingHabits: false });
          break;

        case 'photos':
          set({ isLoadingPhotos: true });
          const photosData = await getClientPhotos(clientId, coachId);
          set({ photos: photosData, isLoadingPhotos: false });
          break;

        case 'files':
          set({ isLoadingFiles: true });
          const filesData = await getClientFiles(clientId, coachId);
          console.log('[refreshSection] files result:', filesData.length, filesData);
          set({ files: filesData, isLoadingFiles: false });
          break;

        case 'check-ins':
          set({ isLoadingForms: true });
          const checkInsData = await getClientCheckIns(clientId, coachId);
          set({ checkIns: checkInsData, isLoadingForms: false });
          break;

        case 'questionnaires':
          set({ isLoadingForms: true });
          const questionnairesData = await getClientQuestionnaires(clientId, coachId);
          set({ questionnaires: questionnairesData, isLoadingForms: false });
          break;

        case 'updates':
          set({ isLoadingUpdates: true });
          const updatesData = await getClientUpdates(clientId, coachId);
          set({ updates: updatesData, isLoadingUpdates: false });
          break;

        case 'notes':
          set({ isLoadingNotes: true });
          const notesData = await getClientNotes(clientId, coachId);
          set({ notes: notesData, isLoadingNotes: false });
          break;

        case 'training':
          set({ isLoadingTraining: true });
          const trainingData = await getTrainingCalendarRange(clientId, coachId, startDate, endDate);
          set({ 
            trainingCalendar: trainingData, 
            loadedTrainingRange: { startDate, endDate },
            isLoadingTraining: false 
          });
          break;
      }
    } catch (err) {
      console.error(`[ClientDetailStore] Error refreshing ${section}:`, err);
    }
  },

  // Fetch training data for a single date - always fetches regardless of loaded range
  fetchTrainingDataForDate: async (targetDate: Date) => {
    const { clientId, coachId, trainingCalendar } = get();
    
    if (!clientId || !coachId) {
      console.warn('[fetchTrainingDataForDate] Missing IDs, skipping');
      return;
    }

    const dateKey = formatDateDDMMYYYY(targetDate);
    
    // Check if we already have data for this specific date
    if (trainingCalendar[dateKey]) {
      // Already have data, no need to fetch
      return;
    }

    // Fetch data for just this one date (start and end are the same date)
    const dateStr = formatDateForApi(targetDate);

    console.log('[ClientDetailStore] Fetching training data for single date:', dateStr);

    set({ isLoadingTraining: true });

    try {
      const newTrainingData = await getTrainingCalendarRange(
        clientId, 
        coachId, 
        dateStr, 
        dateStr
      );

      // Merge new data with existing data
      const mergedCalendar = { ...trainingCalendar, ...newTrainingData };
      
      // Update the loaded range to include this date if needed
      const currentRange = get().loadedTrainingRange;
      let newRange = currentRange;
      
      if (!currentRange) {
        // No range exists, create one around this date
        const start = new Date(targetDate);
        start.setMonth(start.getMonth() - 3);
        const end = new Date(targetDate);
        end.setMonth(end.getMonth() + 3);
        newRange = {
          startDate: formatDateForApi(start),
          endDate: formatDateForApi(end),
        };
      } else {
        // Extend range if needed
        const rangeStart = new Date(currentRange.startDate);
        const rangeEnd = new Date(currentRange.endDate);
        const target = new Date(targetDate);
        
        if (target < rangeStart) {
          newRange = {
            startDate: formatDateForApi(target),
            endDate: currentRange.endDate,
          };
        } else if (target > rangeEnd) {
          newRange = {
            startDate: currentRange.startDate,
            endDate: formatDateForApi(target),
          };
        }
      }

      set({ 
        trainingCalendar: mergedCalendar,
        loadedTrainingRange: newRange,
        isLoadingTraining: false,
      });

      console.log('[ClientDetailStore] Fetched training data for date:', dateStr);
    } catch (err) {
      console.error('[ClientDetailStore] Error fetching training data for date:', err);
      set({ isLoadingTraining: false });
    }
  },

  // Extend training range when user navigates to dates outside current range
  // If forceFetch is true, will fetch data even if date is in range (useful for refreshing)
  extendTrainingRange: async (targetDate: Date, forceFetch: boolean = false) => {
    const { clientId, coachId, loadedTrainingRange, trainingCalendar } = get();
    
    if (!clientId || !coachId) {
      console.warn('[extendTrainingRange] Missing IDs, skipping');
      return;
    }

    const extendResult = getExtendedDateRange(loadedTrainingRange, targetDate);
    
    // Check if we already have data for this specific date
    const dateKey = formatDateDDMMYYYY(targetDate);
    const hasDataForDate = !!trainingCalendar[dateKey];
    
    // If date is in range and we have data, and not forcing fetch, skip
    if (!extendResult.needsFetch && hasDataForDate && !forceFetch) {
      return;
    }

    // If date is in range but we don't have data, or forceFetch is true, fetch a small range around the date
    let fetchStartDate: string;
    let fetchEndDate: string;
    let newRangeStart: string;
    let newRangeEnd: string;

    if (!extendResult.needsFetch && (!hasDataForDate || forceFetch)) {
      // Date is in range but missing data, fetch a 1-month range around it
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0);
      const start = new Date(target);
      start.setMonth(start.getMonth() - 1);
      start.setDate(1); // First day of month
      const end = new Date(target);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // Last day of month
      
      fetchStartDate = formatDateForApi(start);
      fetchEndDate = formatDateForApi(end);
      newRangeStart = loadedTrainingRange!.startDate;
      newRangeEnd = loadedTrainingRange!.endDate;
    } else {
      // Date is outside range, use extendResult
      fetchStartDate = extendResult.startDate;
      fetchEndDate = extendResult.endDate;
      newRangeStart = extendResult.newRangeStart || extendResult.startDate;
      newRangeEnd = extendResult.newRangeEnd || extendResult.endDate;
    }

    console.log('[ClientDetailStore] Fetching training data:', {
      currentRange: loadedTrainingRange,
      targetDate: formatDateForApi(targetDate),
      hasDataForDate,
      forceFetch,
      fetchRange: { start: fetchStartDate, end: fetchEndDate },
    });

    set({ isLoadingTraining: true });

    try {
      const newTrainingData = await getTrainingCalendarRange(
        clientId, 
        coachId, 
        fetchStartDate, 
        fetchEndDate
      );

      // Merge new data with existing data
      const mergedCalendar = { ...trainingCalendar, ...newTrainingData };
      
      // Update the loaded range
      const newRange = {
        startDate: newRangeStart,
        endDate: newRangeEnd,
      };

      set({ 
        trainingCalendar: mergedCalendar,
        loadedTrainingRange: newRange,
        isLoadingTraining: false,
      });

      console.log('[ClientDetailStore] Updated training range to:', newRange);
    } catch (err) {
      console.error('[ClientDetailStore] Error extending training range:', err);
      set({ isLoadingTraining: false });
    }
  },

  // Check if a date is within the loaded training range
  isDateInLoadedRange: (date: Date) => {
    const { loadedTrainingRange } = get();
    
    if (!loadedTrainingRange) {
      return false;
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const rangeStart = new Date(loadedTrainingRange.startDate);
    const rangeEnd = new Date(loadedTrainingRange.endDate);
    
    return targetDate >= rangeStart && targetDate <= rangeEnd;
  },

  // Clear client data (when navigating away)
  clearClientData: () => {
    set({
      clientId: null,
      coachId: null,
      client: null,
      bio: '',
      goals: [],
      injuries: [],
      metrics: [],
      habits: [],
      photos: [],
      files: [],
      checkIns: [],
      questionnaires: [],
      updates: [],
      notes: [],
      trainingCalendar: {},
      loadedTrainingRange: null,
      isLoading: false,
      isLoadingClient: false,
      isLoadingMetrics: false,
      isLoadingHabits: false,
      isLoadingPhotos: false,
      isLoadingFiles: false,
      isLoadingForms: false,
      isLoadingUpdates: false,
      isLoadingNotes: false,
      isLoadingTraining: false,
      error: null,
    });
  },

  // Direct setters for athlete self-access
  setMetrics: (metrics: ClientMetric[]) => {
    set({ metrics, isLoadingMetrics: false });
  },

  setHabits: (habits: ClientHabit[]) => {
    set({ habits, isLoadingHabits: false });
  },

  setClientId: (clientId: string) => {
    set({ clientId });
  },
}));
