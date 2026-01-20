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
  clearClientData: () => void;
}

// Helper to get date range for training calendar
const getDateRange = () => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
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
      const clientData = await getClientDetails(clientId);
      set({ client: clientData, isLoadingClient: false });

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
    if (!clientId || !coachId) return;

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
          set({ trainingCalendar: trainingData, isLoadingTraining: false });
          break;
      }
    } catch (err) {
      console.error(`[ClientDetailStore] Error refreshing ${section}:`, err);
    }
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
}));
